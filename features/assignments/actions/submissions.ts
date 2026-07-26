'use server'
// Student submission (file upload only) and teacher grading (numeric
// score only) for assignments. Same MIME/size validation approach as
// materials.ts — see AUTH_NOTES.md for why we re-check role/ownership
// here even though RLS also enforces it.
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

// Submits (or resubmits) a file for an assignment. If a submission
// already exists, this replaces the file and resets status to
// 'submitted' (or 'resubmitted' if it had already been graded).
export async function submitAssignment(assignmentId: string, formData: FormData): Promise<SubmitAssignmentResult> {
    const user = await requireRole(['student'])
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
        return { ok: false, error: 'Please choose a file to submit.' }
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return {
            ok: false,
            error: 'That file type is not allowed. Allowed: PDF, DOC/DOCX, JPEG/PNG, MP3, MP4.',
        }
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { ok: false, error: 'File is too large. Max size is 40 MB.' }
    }

    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, course_id, due_at, is_published')
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
    const isLate = assignment.due_at ? now > new Date(assignment.due_at) : false
    // Matches Google Classroom's behavior: a late submission is never
    // blocked outright, just flagged "late" (is_late below) for the
    // teacher to see and decide how to handle. allow_late is no longer
    // used as a hard gate here.
    const { data: existing } = await supabase
        .from('assignment_submissions')
        .select('id, status')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle()

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${assignmentId}/${user.id}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        return { ok: false, error: 'Upload failed. Please try again.' }
    }

    const newStatus = existing?.status === 'graded' ? 'resubmitted' : 'submitted'

    if (existing) {
        const { error } = await supabase
            .from('assignment_submissions')
            .update({
                file_path: storagePath,
                file_name: file.name,
                submitted_at: now.toISOString(),
                is_late: isLate,
                status: newStatus,
                // Clear any prior grade on resubmission — it needs
                // re-grading against the new file.
                score: null,
                feedback: null,
                graded_by: null,
                graded_at: null,
            })
            .eq('id', existing.id)

        if (error) {
            await supabase.storage.from('submissions').remove([storagePath])
            return { ok: false, error: 'Could not save submission. Please try again.' }
        }
    } else {
        const { error } = await supabase.from('assignment_submissions').insert({
            assignment_id: assignmentId,
            student_id: user.id,
            file_path: storagePath,
            file_name: file.name,
            is_late: isLate,
            status: 'submitted',
        })

        if (error) {
            await supabase.storage.from('submissions').remove([storagePath])
            return { ok: false, error: 'Could not save submission. Please try again.' }
        }
    }

    return { ok: true }
}

// Student's own submission for an assignment, if any.
export async function getMySubmission(assignmentId: string) {
    const user = await requireRole(['student'])
    const supabase = await createClient()
    const { data } = await supabase
        .from('assignment_submissions')
        .select('id, file_name, submitted_at, is_late, status, score, feedback')
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
        .select('id, student_id, file_name, submitted_at, is_late, status, score, feedback')
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
