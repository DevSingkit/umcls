'use server'
// Student submission (file and/or text note) and teacher grading
// (numeric score only) for assignments. Same MIME/size validation
// approach as materials.ts — see AUTH_NOTES.md for why we re-check
// role/ownership here even though RLS also enforces it.
import { requireRole, requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024 // 40 MB

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4',
])

export type SubmitAssignmentResult = { ok: true } | { ok: false; error: string }

// Submits (or resubmits) an assignment. A file and a text note are both
// optional and independent — a student can submit just a note, just a
// file, both, or (if they confirm through the client-side warning in
// SubmissionUploadForm) neither. The server doesn't hard-block an empty
// submission; that's a deliberate "warn, don't block" choice, not an
// oversight — see CHANGELOG.md 2026-08-01.
//
// If a submission already exists, this updates it in place and resets
// status to 'submitted' (or 'resubmitted' if it had already been
// graded, which also clears the prior grade). A text-only resubmission
// does NOT clear a previously attached file — only a newly uploaded
// file replaces the old one.
export async function submitAssignment(assignmentId: string, formData: FormData): Promise<SubmitAssignmentResult> {
    const user = await requireRole(['student'])

    const fileEntry = formData.get('file')
    const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null
    const noteRaw = formData.get('note')
    const note = typeof noteRaw === 'string' ? noteRaw.trim() : ''

    if (file) {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return {
                ok: false,
                error: 'That file type is not allowed. Allowed: PDF, DOC/DOCX, JPEG/PNG, MP3, MP4.',
            }
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return { ok: false, error: 'File is too large. Max size is 40 MB.' }
        }
    }

    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, course_id, due_at, is_published, allow_late')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single()

    if (!assignment || !assignment.is_published) {
        return { ok: false, error: 'Assignment not found.' }
    }

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', assignment.course_id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) {
        return { ok: false, error: 'You are not enrolled in this course.' }
    }

    const now = new Date()
    const isPastDue = assignment.due_at ? now > new Date(assignment.due_at) : false

    // Teacher-controlled hard gate. `allow_late` already existed on the
    // schema but was explicitly NOT enforced here before — see the
    // removed comment that used to say "allow_late is no longer used as
    // a hard gate here." This is the fix: once the due date has passed,
    // a teacher who left allow_late = false blocks submission entirely,
    // not just flags it late.
    if (isPastDue && !assignment.allow_late) {
        return {
            ok: false,
            error: 'The due date has passed and late submissions are not allowed for this assignment.',
        }
    }
    const isLate = isPastDue

    const { data: existing } = await supabase
        .from('assignment_submissions')
        .select('id, status')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle()

    let storagePath: string | null = null
    if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        storagePath = `${assignmentId}/${user.id}/${crypto.randomUUID()}-${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(storagePath, file, { contentType: file.type, upsert: false })

        if (uploadError) {
            return { ok: false, error: 'Upload failed. Please try again.' }
        }
    }

    const newStatus = existing?.status === 'graded' ? 'resubmitted' : 'submitted'

    if (existing) {
        const updatePayload: Record<string, unknown> = {
            submitted_at: now.toISOString(),
            is_late: isLate,
            status: newStatus,
            response_text: note || null,
            // Clear any prior grade on resubmission — it needs
            // re-grading against the new content.
            score: null,
            feedback: null,
            graded_by: null,
            graded_at: null,
        }
        // Only overwrite the file fields if a new file was actually
        // uploaded this time — a text-only resubmission shouldn't wipe
        // out a file attached in an earlier submission.
        if (file) {
            updatePayload.file_path = storagePath
            updatePayload.file_name = file.name
        }

        const { error } = await supabase
            .from('assignment_submissions')
            .update(updatePayload)
            .eq('id', existing.id)

        if (error) {
            if (storagePath) await supabase.storage.from('submissions').remove([storagePath])
            return { ok: false, error: 'Could not save submission. Please try again.' }
        }
    } else {
        const { error } = await supabase.from('assignment_submissions').insert({
            assignment_id: assignmentId,
            student_id: user.id,
            file_path: storagePath,
            file_name: file?.name ?? null,
            response_text: note || null,
            is_late: isLate,
            status: 'submitted',
        })

        if (error) {
            if (storagePath) await supabase.storage.from('submissions').remove([storagePath])
            return { ok: false, error: 'Could not save submission. Please try again.' }
        }
    }

    return { ok: true }
}

export type UnsubmitAssignmentResult = { ok: true } | { ok: false; error: string }

// Lets a student retract their own submission so they can edit and
// resubmit from scratch. Two independent checks:
//   1. The same due-date/allow_late gate as submitAssignment — if
//      submission is currently blocked, unsubmit is blocked too (no
//      point letting someone unsubmit into a state they then can't
//      resubmit from).
//   2. Uses the unsubmit_assignment() RPC (migration 052) instead of a
//      direct DELETE, since there's no student DELETE policy on this
//      table — the RPC itself independently refuses to delete a
//      graded/returned submission, so a grade already given can never
//      be silently erased this way even if this check below were ever
//      bypassed.
export async function unsubmitAssignment(assignmentId: string): Promise<UnsubmitAssignmentResult> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, due_at, allow_late')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single()

    if (!assignment) {
        return { ok: false, error: 'Assignment not found.' }
    }

    const now = new Date()
    const isPastDue = assignment.due_at ? now > new Date(assignment.due_at) : false
    if (isPastDue && !assignment.allow_late) {
        return { ok: false, error: 'The due date has passed and this assignment can no longer be edited.' }
    }

    const { data: existing } = await supabase
        .from('assignment_submissions')
        .select('id, status, file_path')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle()

    if (!existing) {
        return { ok: false, error: 'You have not submitted this assignment yet.' }
    }

    if (existing.status === 'graded' || existing.status === 'returned') {
        return { ok: false, error: 'This submission has already been graded and can no longer be unsubmitted.' }
    }

    const { data: deleted, error } = await supabase.rpc('unsubmit_assignment', {
        p_submission_id: existing.id,
    })

    if (error) {
        return { ok: false, error: `Could not unsubmit: ${error.message}` }
    }
    if (!deleted) {
        return { ok: false, error: 'This submission can no longer be unsubmitted.' }
    }

    // Best-effort: remove the file from storage too. Nothing to remove
    // for a text-only submission.
    if (existing.file_path) {
        await supabase.storage.from('submissions').remove([existing.file_path])
    }

    return { ok: true }
}

// Student's own submission for an assignment, if any.
export async function getMySubmission(assignmentId: string) {
    const user = await requireRole(['student'])
    const supabase = await createClient()
    const { data } = await supabase
        .from('assignment_submissions')
        .select('id, file_name, response_text, submitted_at, is_late, status, score, feedback')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle()
    return data
}

// Signed URL for downloading a submission file. Works for the owning
// student or the owning teacher (RLS on the bucket enforces this).
export async function getSubmissionDownloadUrl(submissionId: string) {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: submission } = await supabase
        .from('assignment_submissions')
        .select('file_path, student_id, assignments!inner(courses!inner(teacher_id))')
        .eq('id', submissionId)
        .single()

    if (!submission?.file_path) {
        return null
    }

    const isOwner = submission.student_id === user.id
    const isTeacher = (submission as any).assignments.courses.teacher_id === user.id
    if (!isOwner && !isTeacher) {
        return null
    }

    const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(submission.file_path, 60 * 5)

    if (error) {
        return null
    }
    return data.signedUrl
}

// Teacher's view: every submission for one assignment, one row per
// enrolled student (including students who haven't submitted yet).
export async function listSubmissionsForAssignment(assignmentId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', assignmentId)
        .single()

    if (!assignment || (assignment as any).courses.teacher_id !== user.id) {
        return []
    }

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', assignment.course_id)
        .eq('status', 'active')

    const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('id, student_id, file_name, response_text, submitted_at, is_late, status, score, feedback')
        .eq('assignment_id', assignmentId)

    const submissionByStudent = new Map((submissions ?? []).map((s) => [s.student_id, s]))

    return (enrollments ?? []).map((e) => ({
        studentId: e.student_id,
        studentName: (e as any).users?.full_name ?? 'Unknown',
        submission: submissionByStudent.get(e.student_id) ?? null,
    }))
}

export type GradeSubmissionResult = { ok: true } | { ok: false; error: string }

// Grades a submission with a numeric score only.
export async function gradeSubmission(submissionId: string, formData: FormData): Promise<GradeSubmissionResult> {
    const user = await requireRole(['teacher'])
    const scoreRaw = formData.get('score')
    const score = Number(scoreRaw)

    if (scoreRaw === null || scoreRaw === '' || Number.isNaN(score) || score < 0) {
        return { ok: false, error: 'Please enter a valid score.' }
    }

    const supabase = await createClient()

    const { data: submission } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, assignments!inner(max_score, courses!inner(teacher_id))')
        .eq('id', submissionId)
        .single()

    if (!submission || (submission as any).assignments.courses.teacher_id !== user.id) {
        return { ok: false, error: 'Submission not found.' }
    }

    const maxScore = (submission as any).assignments.max_score
    if (score > maxScore) {
        return { ok: false, error: `Score cannot exceed the max score of ${maxScore}.` }
    }

    const { error } = await supabase
        .from('assignment_submissions')
        .update({
            score,
            status: 'graded',
            graded_by: user.id,
            graded_at: new Date().toISOString(),
        })
        .eq('id', submissionId)

    if (error) {
        return { ok: false, error: 'Could not save grade. Please try again.' }
    }

    return { ok: true }
}

export type ReturnSubmissionResult = { ok: true } | { ok: false; error: string }

// Separate from gradeSubmission on purpose — grading and returning are
// two distinct steps per tasks.md PH4-003/PH5-001 ("submitted → graded
// → returned"). Only flipping to 'returned' fires notify_on_grade_return
// (database.md §7.5), so a teacher can enter a score and still hold off
// notifying the student (e.g. grade a whole batch, then return them together).
export async function returnSubmission(submissionId: string): Promise<ReturnSubmissionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: submission } = await supabase
        .from('assignment_submissions')
        .select('id, status, assignments!inner(courses!inner(teacher_id))')
        .eq('id', submissionId)
        .single()

    if (!submission || (submission as any).assignments.courses.teacher_id !== user.id) {
        return { ok: false, error: 'Submission not found.' }
    }

    if (submission.status !== 'graded') {
        return { ok: false, error: 'Only a graded submission can be returned to the student.' }
    }

    const { error } = await supabase
        .from('assignment_submissions')
        .update({ status: 'returned' })
        .eq('id', submissionId)

    if (error) {
        return { ok: false, error: 'Could not return the grade. Please try again.' }
    }

    return { ok: true }
}
