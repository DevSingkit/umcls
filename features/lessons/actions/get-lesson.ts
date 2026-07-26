'use server'
// Fetches one lesson. Teachers can only view lessons in their own
// courses. Students can only view published lessons, in published
// courses, that they are enrolled in. Same double check pattern as
// AUTH_NOTES.md.

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

        // Also require the parent course itself to be published — a
        // lesson can be individually published while its course is
        // still a draft (e.g. teacher publishing lessons ahead of the
        // course launch), and a student can be enrolled before launch
        // too (admin enrollment has no publish-state check). Without
        // this, a student could view lesson content for a course that
        // wouldn't otherwise show up anywhere in their UI at all.
        // completions.ts already enforces this same pairing
        // (lesson.is_published && courses.is_published) — this brings
        // the read path in line with the write path instead of relying
        // on RLS alone to close the gap silently.
        const { data: course } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', lesson.course_id)
            .eq('is_published', true)
            .single()

        if (!course) {
            return null
        }

        return { lesson, course }
    }

    return null
}

