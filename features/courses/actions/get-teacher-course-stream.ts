'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type TeacherStreamItemType = 'lesson' | 'quiz' | 'assignment'

export interface TeacherStreamItem {
    id: string
    type: TeacherStreamItemType
    title: string
    isPublished: boolean
    createdAt: string
    dueAt?: string | null // assignments only
}

/**
 * Fetches all lessons, quizzes, and assignments for a course the calling
 * teacher owns — both draft and published, unlike get-course-stream.ts
 * (student-facing, published-only, enrollment-scoped).
 * Merged and sorted newest-created-first.
 */
export async function getTeacherCourseStream(
    courseId: string
): Promise<{ items: TeacherStreamItem[] } | { error: string }> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    // Ownership check — mirrors the pattern in materials.ts / courses.ts.
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, teacher_id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .single()

    if (courseError || !course) {
        return { error: 'Course not found or you do not have access to it.' }
    }

    const [lessonsRes, quizzesRes, assignmentsRes] = await Promise.all([
        supabase
            .from('lessons')
            .select('id, title, is_published, created_at')
            .eq('course_id', courseId)
            .is('deleted_at', null),
        supabase
            .from('quizzes')
            .select('id, title, is_published, created_at')
            .eq('course_id', courseId)
            .is('deleted_at', null),
        supabase
            .from('assignments')
            .select('id, title, is_published, due_at, created_at')
            .eq('course_id', courseId)
            .is('deleted_at', null),
    ])

    if (lessonsRes.error || quizzesRes.error || assignmentsRes.error) {
        return { error: 'Failed to load course content.' }
    }

    const items: TeacherStreamItem[] = [
        ...(lessonsRes.data ?? []).map((l: { id: string; title: string; is_published: boolean; created_at: string }) => ({
            id: l.id,
            type: 'lesson' as const,
            title: l.title,
            isPublished: l.is_published,
            createdAt: l.created_at,
        })),
        ...(quizzesRes.data ?? []).map((q: { id: string; title: string; is_published: boolean; created_at: string }) => ({
            id: q.id,
            type: 'quiz' as const,
            title: q.title,
            isPublished: q.is_published,
            createdAt: q.created_at,
        })),
        ...(assignmentsRes.data ?? []).map((a: { id: string; title: string; is_published: boolean; due_at: string | null; created_at: string }) => ({
            id: a.id,
            type: 'assignment' as const,
            title: a.title,
            isPublished: a.is_published,
            createdAt: a.created_at,
            dueAt: a.due_at,
        })),
    ]

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { items }
}