'use server'
// Admin, read-only view of every lesson, quiz, and assignment across
// every teacher's courses, grouped by course. No mutation of any kind
// lives in this file, on purpose — same reasoning as admin-grades.ts:
// the client asked for admin to see everything, edit nothing.
//
// Grouped by course (course card → expand → activities), not a flat
// feed — matches the People page's course-card pattern the admin is
// already used to, rather than a third, different list shape.
//
// Item `type` union and field names deliberately match
// TeacherCourseStream.tsx's TYPE_ICON/TYPE_ICON_BG mapping
// (DESIGN-LMS.md §8.7a) exactly — 'lesson' | 'quiz' | 'assignment',
// isPublished, dueAt — so the admin page can reuse that same icon
// mapping instead of a third re-derived one.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type AdminActivityItem = {
    type: 'lesson' | 'quiz' | 'assignment'
    id: string
    title: string
    isPublished: boolean
    dueAt: string | null
    createdAt: string
    updatedAt: string
}

export type AdminCourseActivityGroup = {
    courseId: string
    courseTitle: string
    teacherName: string
    items: AdminActivityItem[]
}

// Every lesson/quiz/assignment across every course, regardless of
// owner — same "no teacher_id filter" reasoning as
// getAllCoursesForAdmin in admin-grades.ts. Soft-deleted rows excluded
// (deleted_at is null), matching how every other list in the app
// already treats deleted_at. Courses with zero activity still appear,
// with an empty items array — an admin should be able to see a course
// has nothing in it yet, not have it silently disappear.
export async function getCourseActivityForAdmin(): Promise<AdminCourseActivityGroup[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)
        .order('title', { ascending: true })

    const [{ data: lessons }, { data: quizzes }, { data: assignments }] = await Promise.all([
        supabase
            .from('lessons')
            .select('id, title, is_published, created_at, updated_at, course_id')
            .is('deleted_at', null),
        supabase
            .from('quizzes')
            .select('id, title, is_published, created_at, updated_at, course_id')
            .is('deleted_at', null),
        supabase
            .from('assignments')
            .select('id, title, is_published, due_at, created_at, updated_at, course_id')
            .is('deleted_at', null),
    ])

    const itemsByCourseId = new Map<string, AdminActivityItem[]>()

    const push = (courseId: string, item: AdminActivityItem) => {
        const existing = itemsByCourseId.get(courseId) ?? []
        existing.push(item)
        itemsByCourseId.set(courseId, existing)
    }

    for (const l of lessons ?? []) {
        push(l.course_id, {
            type: 'lesson',
            id: l.id,
            title: l.title,
            isPublished: l.is_published,
            dueAt: null,
            createdAt: l.created_at,
            updatedAt: l.updated_at,
        })
    }
    for (const q of quizzes ?? []) {
        push(q.course_id, {
            type: 'quiz',
            id: q.id,
            title: q.title,
            isPublished: q.is_published,
            dueAt: null,
            createdAt: q.created_at,
            updatedAt: q.updated_at,
        })
    }
    for (const a of assignments ?? []) {
        push(a.course_id, {
            type: 'assignment',
            id: a.id,
            title: a.title,
            isPublished: a.is_published,
            dueAt: a.due_at,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
        })
    }

    return (courses ?? []).map((c: any): AdminCourseActivityGroup => {
        const items = (itemsByCourseId.get(c.id) ?? []).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        return {
            courseId: c.id,
            courseTitle: c.title,
            teacherName: c.users?.full_name ?? 'Unknown',
            items,
        }
    })
}
