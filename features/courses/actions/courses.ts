'use server'
// These are the actions for course creation and listing (PH3-001).
// A teacher can only see and edit their own courses. RLS on the
// database also enforces this, but we still check the role here too,
// same reasoning as AUTH_NOTES.md.
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
const createCourseSchema = z.object({
    title: z.string().min(2, 'Title is too short'),
    description: z.string().optional(),
    subject: z.string().optional(),
})
export type CreateCourseResult =
    | { ok: true }
    | { ok: false; error: string }
// Creates a new course owned by the logged in teacher.
export async function createCourse(formData: FormData): Promise<CreateCourseResult> {
    const user = await requireRole(['teacher'])
    const parsed = createCourseSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        subject: formData.get('subject'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }
    const { title, description, subject } = parsed.data
    const supabase = await createClient()
    const { error } = await supabase.from('courses').insert({
        teacher_id: user.id,
        title,
        description: description || null,
        subject: subject || null,
    })
    if (error) {
        return { ok: false, error: 'Could not create the course. Please try again.' }
    }
    redirect('/teacher/courses')
}

// Lets a teacher edit their own course's title/description/subject.
// Same ownership check as toggleCoursePublish — see AUTH_NOTES.md.
export async function updateCourse(courseId: string, formData: FormData): Promise<CreateCourseResult> {
    const user = await requireRole(['teacher'])

    const parsed = createCourseSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        subject: formData.get('subject'),
    })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }
    const { title, description, subject } = parsed.data
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

    const { error } = await supabase
        .from('courses')
        .update({ title, description: description || null, subject: subject || null })
        .eq('id', courseId)

    if (error) {
        return { ok: false, error: 'Could not save changes. Please try again.' }
    }

    redirect(`/teacher/courses/${courseId}`)
}

// Fetches a single course for the edit form, scoped to the owning
// teacher only.
export async function getCourseForEdit(courseId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()
    const { data } = await supabase
        .from('courses')
        .select('id, title, description, subject, show_classmates')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .single()
    return data
}

// Lets a teacher publish or unpublish their own course. Same shape as
// toggleQuizPublish / toggleLessonPublish — see AUTH_NOTES.md for why
// we re-check ownership here even though RLS also enforces it.
export async function toggleCoursePublish(courseId: string, publish: boolean) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false as const }
    }

    const { error } = await supabase.from('courses').update({ is_published: publish }).eq('id', courseId)

    if (error) {
        return { ok: false as const }
    }

    return { ok: true as const }
}

// --- People tab additions ---

// Teacher's full roster for one of their own courses. No RLS change
// needed here — teachers can already see enrolled students' names via
// is_course_teacher() (same pattern as listSubmissionsForAssignment).
export async function getCourseRoster(courseId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) return null

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, enrolled_at, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: true })

    return (enrollments ?? []).map((e: any) => ({
        studentId: e.student_id as string,
        studentName: (e.users?.full_name as string) ?? 'Unknown',
        enrolledAt: e.enrolled_at as string,
    }))
}

// Student's classmates for a course they're enrolled in. Name only,
// via the get_classmates() DB function (migration 030) rather than
// querying users/enrollments directly — see DATABASE.md's added note
// for why this stays a scoped function instead of a loosened RLS
// policy. Returns an empty array (not an error) if the student isn't
// actually enrolled, or if the teacher has turned classmates off for
// this course — same defensive shape as the function itself.
export async function getClassmates(courseId: string) {
    await requireRole(['student'])
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_classmates', { p_course_id: courseId })

    if (error) return []
    return (data ?? []) as { id: string; full_name: string }[]
}

// Lets a teacher turn the classmates list on/off for one of their own
// courses. Same ownership-check shape as toggleCoursePublish.
export async function toggleShowClassmates(courseId: string, show: boolean) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false as const }
    }

    const { error } = await supabase.from('courses').update({ show_classmates: show }).eq('id', courseId)

    if (error) {
        return { ok: false as const }
    }

    return { ok: true as const }
}

// Returns only the courses belonging to the logged in teacher.
export async function getMyCourses() {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, subject, is_published, created_at')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
    if (error) {
        return []
    }
    return data
}