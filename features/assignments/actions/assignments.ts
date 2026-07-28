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
    passingScore: z.coerce.number().min(0, 'Passing score cannot be negative'),
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
        passingScore: formData.get('passingScore'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { title, instructions, dueAt, maxScore, passingScore } = parsed.data

    if (passingScore > maxScore) {
        return { ok: false, error: 'Passing score cannot be greater than max score.' }
    }

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
            passing_score: passingScore,
            is_published: true,
        })
        .select('id')
        .single()

    if (error || !data) {
        return { ok: false, error: 'Could not create the assignment. Please try again.' }
    }

    const assignmentId = data.id
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
        .select('id, course_id, title, instructions, due_at, max_score, passing_score, is_published')
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
    passingScore: z.coerce.number().min(0, 'Passing score cannot be negative'),
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
        passingScore: formData.get('passingScore'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { assignmentId, title, instructions, dueAt, maxScore, passingScore } = parsed.data

    if (passingScore > maxScore) {
        return { ok: false, error: 'Passing score cannot be greater than max score.' }
    }

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
            passing_score: passingScore,
        })
        .eq('id', assignmentId)

    if (error) {
        return { ok: false, error: `Could not save changes: ${error.message}` }
    }

    return { ok: true }
}

export async function toggleAssignmentPublish(assignmentId: string, publish: boolean) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: assignment } = await supabase
        .from('assignments')
        .select('id, courses!inner(teacher_id)')
        .eq('id', assignmentId)
        .single()

    if (!assignment || (assignment as any).courses.teacher_id !== user.id) {
        return { ok: false as const }
    }

    const { error } = await supabase
        .from('assignments')
        .update({ is_published: publish })
        .eq('id', assignmentId)

    if (error) {
        return { ok: false as const }
    }

    return { ok: true as const }
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
        .select('id, title, due_at, max_score, passing_score, allow_late, is_published, created_at')
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
        .select('id, title, due_at, max_score, passing_score, allow_late, created_at')
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
        .select('id, course_id, title, instructions, due_at, max_score, passing_score, allow_late, is_published')
        .eq('id', assignmentId)
        .is('deleted_at', null)
        .single()

    if (error) {
        return null
    }
    return data
}
