'use server'
// Actions for lesson creation and listing (PH3-002, simplified for V1).
// A teacher can only add lessons to a course they own. We check that
// here in addition to RLS, same reasoning as AUTH_NOTES.md.

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const createLessonSchema = z.object({
    courseId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
    content: z.string().min(1, 'Lesson content cannot be empty'),
})

export type CreateLessonResult =
    | { ok: true }
    | { ok: false; error: string }

// Creates a new lesson inside a course the teacher owns.
export async function createLesson(formData: FormData): Promise<CreateLessonResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = createLessonSchema.safeParse({
        courseId: formData.get('courseId'),
        title: formData.get('title'),
        content: formData.get('content'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { courseId, title, content } = parsed.data

    // Confirm this teacher actually owns the course before adding a lesson to it.
    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this course.' }
    }

    // Plain text content wrapped in a simple shape for now. A richer
    // editor can replace this later without changing how it is stored.
    const { error } = await supabase.from('lessons').insert({
        course_id: courseId,
        title,
        content: { type: 'text', body: content },
    })

    if (error) {
        return { ok: false, error: 'Could not create the lesson. Please try again.' }
    }

    redirect(`/teacher/courses/${courseId}`)
}

// Returns the course details plus all its lessons, only if the logged
// in teacher owns that course.
export async function getCourseWithLessons(courseId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, description, subject, is_published')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return null
    }

    const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, is_published, order_index')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    return { course, lessons: lessons ?? [] }
}