'use server'
// Fetches one lesson. Teachers can only view lessons in their own
// courses. Students can only view published lessons in courses they
// are enrolled in. Same double check pattern as AUTH_NOTES.md.

import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export async function getLesson(lessonId: string) {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, title, content, is_published, youtube_url')
        .eq('id', lessonId)
        .is('deleted_at', null)
        .single()

    if (!lesson) {
        return null
    }

    if (user.role === 'teacher') {
        const { data: course } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', lesson.course_id)
            .eq('teacher_id', user.id)
            .single()

        if (!course) {
            return null
        }

        return { lesson, course }
    }

    if (user.role === 'student') {
        if (!lesson.is_published) {
            return null
        }

        const { data: enrollment } = await supabase
            .from('enrollments')
            .select('id')
            .eq('course_id', lesson.course_id)
            .eq('student_id', user.id)
            .eq('status', 'active')
            .single()

        if (!enrollment) {
            return null
        }

        const { data: course } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', lesson.course_id)
            .single()

        return { lesson, course }
    }

    return null
}

// Lets a teacher publish or unpublish their own lesson.
export async function toggleLessonPublish(lessonId: string, courseId: string, publish: boolean) {
    const { requireRole } = await import('@/lib/auth/get-current-user')
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

    await supabase.from('lessons').update({ is_published: publish }).eq('id', lessonId)

    return { ok: true as const }
}