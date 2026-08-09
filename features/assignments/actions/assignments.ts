'use server'
// Assignments: file-upload homework, distinct from quizzes. Teacher
// creates/edits/publishes; see submissions.ts for the student
// submit + teacher grade flow.
import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { uploadMaterial, addMaterialLink } from '@/features/materials/actions/materials'

const assignmentSchema = z.object({
    title: z.string().min(2, 'Title is too short'),
    instructions: z.string().optional(),
    dueAt: z.string().optional(), // datetime-local string, may be empty
    maxScore: z.coerce.number().min(1, 'Max score must be at least 1'),
})

export type AssignmentActionResult =
    | { ok: true; assignmentId: string }
    | { ok: false; error: string }

export async function createAssignment(courseId: string, formData: FormData): Promise<AssignmentActionResult> {
    const user = await requireRole(['teacher'])

    const parsed = assignmentSchema.safeParse({
        title: formData.get('title'),
        instructions: formData.get('instructions'),
        dueAt: formData.get('dueAt'),
        maxScore: formData.get('maxScore'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { title, instructions, dueAt, maxScore } = parsed.data

    // Checkbox fields only appear in FormData when checked, so a missing
    // entry means "off" — no zod coercion needed, same handling as the
    // equivalent field in updateAssignment below.
    const allowLate = formData.get('allowLate') === 'on'

    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'Course not found.' }
    }

    const { data, error } = await supabase
        .from('assignments')
        .insert({
            course_id: courseId,
            created_by: user.id,
            title,
            instructions: instructions ? { type: 'text', body: instructions } : null,
            due_at: dueAt || null,
            max_score: maxScore,
            allow_late: allowLate,
            // Explicitly false (not omitted). This USED to rely on the
            // schema default to create a draft row, with a comment here
            // saying so — but migration 054 changed that same default
            // to `true`, which silently broke this: the insert started
            // creating an already-published row, making the
            // toggle_assignment_publish call below a true -> true no-op
            // instead of a real false -> true transition. Since
            // notify_on_assignment_published() only fires on that exact
            // transition, assignments were still ending up published
            // (so they looked fine everywhere else — course stream,
            // to-do list) but silently generated zero notifications.
            // Found 2026-08-01 when a teacher's newly-created
            // assignments weren't triggering a student notification.
            // Setting this explicitly here means the two-step
            // insert-then-publish pattern no longer depends on knowing
            // what the current schema default happens to be.
            is_published: false,
        })
        .select('id')
        .single()

    if (error || !data) {
        return { ok: false, error: 'Could not create the assignment. Please try again.' }
    }

    const assignmentId = data.id

    // Publishes immediately via the same RPC the Post button uses
    // (toggle_assignment_publish, migration 053) — not a raw UPDATE.
    // A raw UPDATE here would carry the exact silent-failure risk just
    // fixed for toggleAssignmentPublish: if RLS's WITH CHECK rejects it,
    // Postgres/PostgREST returns success with zero rows changed and no
    // error, and the assignment would stay a draft with nobody the
    // wiser. Going through the RPC also means this is a real UPDATE
    // (insert -> separate update) starting from a guaranteed `false`,
    // which is required for notify_on_assignment_published() to fire at
    // all — it's an AFTER UPDATE trigger, never fires on INSERT, and
    // only fires on an actual false -> true change, not true -> true.
    const { data: published, error: publishError } = await supabase.rpc('toggle_assignment_publish', {
        p_assignment_id: assignmentId,
        p_publish: true,
    })

    if (publishError || !published) {
        // The assignment row exists but may have stayed a draft. Not
        // ideal, but better than losing the assignment entirely —
        // surfaced in logs so it's traceable, and the teacher still has
        // a manual fallback: PostAssignmentButton on the edit page.
        console.error(
            `createAssignment: assignment ${assignmentId} created but failed to auto-publish:`,
            publishError
        )
    }

    const target = { type: 'assignment' as const, assignmentId }

    // Attach any uploaded files. Each file needs its own FormData since
    // uploadMaterial expects a single 'file' entry, not a multi-file list.
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
    for (const file of files) {
        const singleFileForm = new FormData()
        singleFileForm.set('file', file)
        const result = await uploadMaterial(courseId, target, singleFileForm)
        if (!result.ok) {
            // Assignment itself was created successfully — don't fail the
            // whole action over one attachment. Log so it's not silently lost.
            console.error(`createAssignment: failed to attach file "${file.name}":`, result.error)
        }
    }

    // Attach any link rows (paired by index, same convention as the
    // dynamic "+ Add another link" rows used in lesson creation).
    const linkUrls = formData.getAll('linkUrl').map((v) => String(v))
    const linkLabels = formData.getAll('linkLabel').map((v) => String(v))
    for (let i = 0; i < linkUrls.length; i++) {
    const url = linkUrls[i]?.trim()
    if (!url) continue
    const linkForm = new FormData()
    linkForm.set('url', url)
    const label = linkLabels[i]
    if (label) linkForm.set('label', label)
    const result = await addMaterialLink(courseId, target, linkForm)
    if (!result.ok) {
        console.error(`createAssignment: failed to attach link "${url}":`, result.error)
    }
}

    return { ok: true, assignmentId }
}

// Fetches one assignment for editing — teacher-owned only.
export async function getAssignmentForEdit(assignmentId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, course_id, title, instructions, due_at, max_score, allow_late, is_published')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single()

    if (!assignment) {
        return null
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', assignment.course_id)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return null
    }

    return assignment
}

const updateAssignmentSchema = z.object({
    assignmentId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
    instructions: z.string().optional(),
    dueAt: z.string().optional(),
    maxScore: z.coerce.number().min(1, 'Max score must be at least 1'),
})

export type UpdateAssignmentResult = { ok: true } | { ok: false; error: string }

export async function updateAssignment(formData: FormData): Promise<UpdateAssignmentResult> {
    const user = await requireRole(['teacher'])

    const parsed = updateAssignmentSchema.safeParse({
        assignmentId: formData.get('assignmentId'),
        title: formData.get('title'),
        instructions: formData.get('instructions'),
        dueAt: formData.get('dueAt'),
        maxScore: formData.get('maxScore'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { assignmentId, title, instructions, dueAt, maxScore } = parsed.data

    // Same "missing checkbox field means off" handling as createAssignment.
    const allowLate = formData.get('allowLate') === 'on'

    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, course_id')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single()

    if (!assignment) {
        return { ok: false, error: 'Assignment not found.' }
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', assignment.course_id)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this assignment.' }
    }

    const { error } = await supabase
        .from('assignments')
        .update({
            title,
            instructions: instructions ? { type: 'text', body: instructions } : null,
            due_at: dueAt || null,
            max_score: maxScore,
            allow_late: allowLate,
        })
        .eq('id', assignmentId)

    if (error) {
        return { ok: false, error: `Could not save changes: ${error.message}` }
    }

    return { ok: true }
}

export type ToggleAssignmentPublishResult = { ok: true } | { ok: false; error: string }

// Uses the toggle_assignment_publish() RPC (migration 053) instead of a
// direct client-side UPDATE. The direct UPDATE this used to do could
// silently "succeed" with zero rows actually changed if RLS's WITH
// CHECK rejected it — no error, no exception, just a no-op response —
// which is exactly the bug that made the Post button show "Posted"
// while the assignment stayed unpublished underneath. Same root cause
// and same fix shape as deleteMaterial's rewrite in materials.ts.
export async function toggleAssignmentPublish(
    assignmentId: string,
    publish: boolean
): Promise<ToggleAssignmentPublishResult> {
    await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: updated, error } = await supabase.rpc('toggle_assignment_publish', {
        p_assignment_id: assignmentId,
        p_publish: publish,
    })

    if (error) {
        return { ok: false, error: `Could not update this assignment: ${error.message}` }
    }

    if (!updated) {
        return { ok: false, error: 'Assignment not found, or you do not have permission to change it.' }
    }

    return { ok: true }
}

// Teacher's view: all assignments (draft + published) for a course.
export async function listAssignmentsForTeacher(courseId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return []
    }

    const { data, error } = await supabase
        .from('assignments')
        .select('id, title, due_at, max_score, allow_late, is_published, created_at')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        return []
    }
    return data
}

// Student's view: published assignments only, for an enrolled course.
export async function listAssignmentsForStudent(courseId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('assignments')
        .select('id, title, due_at, max_score, allow_late, created_at')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('due_at', { ascending: true, nullsFirst: false })

    if (error) {
        return []
    }
    return data
}

// Fetches one assignment for detail/submit/grade pages. Caller (page)
// is responsible for role-appropriate access — RLS still backs this up.
export async function getAssignment(assignmentId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('assignments')
        .select('id, course_id, title, instructions, due_at, max_score, allow_late, is_published')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single()

    if (error) {
        return null
    }
    return data
}
