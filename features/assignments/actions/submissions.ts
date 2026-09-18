'use server'
// Student submission (multiple files and/or a text note) and teacher
// grading (numeric score only) for assignments.
//
// SCHEMA CHANGE (this pass): submissions now support multiple files
// per submission via the new submission_files table (migration 085),
// replacing assignment_submissions.file_path/file_name (still present
// on the table, deprecated, no longer written to by this file).
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

// Submits (or resubmits) an assignment. Files and a text note are both
// optional and independent. Multiple files are read from formData via
// getAll('files') — SubmissionUploadForm sends every newly-selected
// file under that repeated field name. Each successfully uploaded file
// becomes its own row in submission_files; existing files from a prior
// submission are left untouched by this call (removing one is a
// separate action — removeSubmissionFile below — since Classroom lets
// a student remove an individual attached file independently of
// resubmitting).
export async function submitAssignment(assignmentId: string, formData: FormData): Promise<SubmitAssignmentResult> {
    const user = await requireRole(['student'])

    const fileEntries = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
    const noteRaw = formData.get('note')
    const note = typeof noteRaw === 'string' ? noteRaw.trim() : ''

    for (const file of fileEntries) {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return {
                ok: false,
                error: `"${file.name}" isn't an allowed file type. Allowed: PDF, DOC/DOCX, JPEG/PNG, MP3, MP4.`,
            }
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return { ok: false, error: `"${file.name}" is too large. Max size is 40 MB per file.` }
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

    const newStatus = existing?.status === 'graded' ? 'resubmitted' : 'submitted'

    let submissionId: string
    if (existing) {
        submissionId = existing.id
        const { error } = await supabase
            .from('assignment_submissions')
            .update({
                submitted_at: now.toISOString(),
                is_late: isLate,
                status: newStatus,
                response_text: note || null,
                score: null,
                feedback: null,
                graded_by: null,
                graded_at: null,
            })
            .eq('id', existing.id)

        if (error) {
            return { ok: false, error: 'Could not save submission. Please try again.' }
        }
    } else {
        const { data: inserted, error } = await supabase
            .from('assignment_submissions')
            .insert({
                assignment_id: assignmentId,
                student_id: user.id,
                response_text: note || null,
                is_late: isLate,
                status: 'submitted',
            })
            .select('id')
            .single()

        if (error || !inserted) {
            return { ok: false, error: 'Could not save submission. Please try again.' }
        }
        submissionId = inserted.id
    }

    // Upload and attach each new file. Best-effort per file — if one
    // fails partway through, previously attached files (this call and
    // earlier ones) are left in place rather than rolled back; the
    // student sees the error and can retry just the failed file.
    const uploadedPaths: string[] = []
    for (const file of fileEntries) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${assignmentId}/${user.id}/${crypto.randomUUID()}-${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(storagePath, file, { contentType: file.type, upsert: false })

        if (uploadError) {
            for (const p of uploadedPaths) await supabase.storage.from('submissions').remove([p])
            return { ok: false, error: `Upload failed for "${file.name}". Please try again.` }
        }
        uploadedPaths.push(storagePath)

        const { error: insertError } = await supabase.from('submission_files').insert({
            submission_id: submissionId,
            file_path: storagePath,
            file_name: file.name,
        })

        if (insertError) {
            await supabase.storage.from('submissions').remove([storagePath])
            return { ok: false, error: `Could not attach "${file.name}". Please try again.` }
        }
    }

    return { ok: true }
}

export type RemoveSubmissionFileResult = { ok: true } | { ok: false; error: string }

// Removes a single attached file from an existing submission —
// independent of resubmitting, matching real Classroom's "remove one
// attachment" behavior. Refuses on a graded/returned submission, same
// protection unsubmitAssignment already gives the submission as a
// whole — an individual file shouldn't be removable after grading
// either, for the same reason.
export async function removeSubmissionFile(fileId: string): Promise<RemoveSubmissionFileResult> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: file } = await supabase
        .from('submission_files')
        .select('id, file_path, submission_id, assignment_submissions!inner(student_id, status)')
        .eq('id', fileId)
        .single()

    const submission = (file as any)?.assignment_submissions
    if (!file || submission?.student_id !== user.id) {
        return { ok: false, error: 'File not found.' }
    }

    if (submission.status === 'graded' || submission.status === 'returned') {
        return { ok: false, error: 'This submission has already been graded and can no longer be edited.' }
    }

    const { error } = await supabase.from('submission_files').delete().eq('id', fileId)
    if (error) {
        return { ok: false, error: 'Could not remove that file. Please try again.' }
    }

    await supabase.storage.from('submissions').remove([file.file_path])

    return { ok: true }
}

export type UnsubmitAssignmentResult = { ok: true } | { ok: false; error: string }

// Lets a student retract their own submission so they can edit and
// resubmit from scratch. Removes every attached file (submission_files
// rows cascade-delete via the FK, migration 085) along with the
// submission row itself.
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
        .select('id, status')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle()

    if (!existing) {
        return { ok: false, error: 'You have not submitted this assignment yet.' }
    }

    if (existing.status === 'graded' || existing.status === 'returned') {
        return { ok: false, error: 'This submission has already been graded and can no longer be unsubmitted.' }
    }

    const { data: files } = await supabase
        .from('submission_files')
        .select('file_path')
        .eq('submission_id', existing.id)

    const { data: deleted, error } = await supabase.rpc('unsubmit_assignment', {
        p_submission_id: existing.id,
    })

    if (error) {
        return { ok: false, error: `Could not unsubmit: ${error.message}` }
    }
    if (!deleted) {
        return { ok: false, error: 'This submission can no longer be unsubmitted.' }
    }

    // Best-effort: remove every attached file from storage too. The
    // submission_files rows themselves are already gone via the FK's
    // ON DELETE CASCADE once unsubmit_assignment deletes the parent row.
    if (files && files.length > 0) {
        await supabase.storage.from('submissions').remove(files.map((f) => f.file_path))
    }

    return { ok: true }
}

// Student's own submission for an assignment, if any — now includes
// every attached file, not just one.
export async function getMySubmission(assignmentId: string) {
    const user = await requireRole(['student'])
    const supabase = await createClient()
    const { data } = await supabase
        .from('assignment_submissions')
        .select('id, response_text, submitted_at, is_late, status, score, feedback, submission_files(id, file_name, uploaded_at)')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle()

    if (!data) return null
    const { submission_files, ...rest } = data as any
    return { ...rest, files: (submission_files ?? []) as { id: string; file_name: string; uploaded_at: string }[] }
}

// Signed URL for downloading one specific submission file. Works for
// the owning student or the owning teacher (RLS on submission_files
// and the storage bucket both enforce this).
export async function getSubmissionFileDownloadUrl(fileId: string) {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: file } = await supabase
        .from('submission_files')
        .select('file_path, assignment_submissions!inner(student_id, assignments!inner(courses!inner(teacher_id)))')
        .eq('id', fileId)
        .single()

    if (!file) return null

    const submission = (file as any).assignment_submissions
    const isOwner = submission.student_id === user.id
    const isTeacher = submission.assignments.courses.teacher_id === user.id
    if (!isOwner && !isTeacher) {
        return null
    }

    const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(file.file_path, 60 * 5)

    if (error) return null
    return data.signedUrl
}

// Teacher's view: every submission for one assignment, one row per
// enrolled student (including students who haven't submitted yet).
// Now includes each submission's full file list.
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
        .select('id, student_id, response_text, submitted_at, is_late, status, score, feedback, submission_files(id, file_name)')
        .eq('assignment_id', assignmentId)

    const submissionByStudent = new Map(
        (submissions ?? []).map((s: any) => [
            s.student_id,
            { ...s, files: s.submission_files ?? [] },
        ])
    )

    return (enrollments ?? []).map((e) => ({
        studentId: e.student_id,
        studentName: (e as any).users?.full_name ?? 'Unknown',
        submission: submissionByStudent.get(e.student_id) ?? null,
    }))
}

export type GradeSubmissionResult = { ok: true } | { ok: false; error: string }

export async function gradeSubmission(submissionId: string, formData: FormData): Promise<GradeSubmissionResult> {
    const user = await requireRole(['teacher', 'admin'])
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

    const isOwningTeacher = (submission as any)?.assignments?.courses?.teacher_id === user.id
    if (!submission || (!isOwningTeacher && user.role !== 'admin')) {
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
