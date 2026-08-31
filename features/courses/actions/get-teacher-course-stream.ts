'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { listAnnouncementsForCourse, type Announcement } from '@/features/courses/actions/announcements'

// UNCHANGED — delete-stream-item.ts's RPC_BY_TYPE/PARAM_BY_TYPE
// records are keyed exactly by this type, for the 3 types that go
// through the generic delete_lesson/delete_quiz/delete_assignment RPC
// dispatcher. Announcements delete through a completely different
// mechanism (deleteAnnouncement, a plain soft-delete, no RPC needed —
// see migration 088's header note), so 'announcement' deliberately
// does NOT get added here — widening this would force
// RPC_BY_TYPE/PARAM_BY_TYPE to need a 4th key that doesn't fit that
// pattern at all.
export type TeacherStreamItemType = 'lesson' | 'quiz' | 'assignment'

export interface TeacherStreamContentItem {
    type: TeacherStreamItemType
    id: string
    title: string
    isPublished: boolean
    createdAt: string
    dueAt?: string | null // assignments only
    ungradedCount?: number // assignments and quizzes now — count of students still needing grading.
}

// PHASE 3.8 ADDITION: announcements merged into the same stream,
// discriminated by `type` — but with a genuinely different shape
// (Announcement's body/comments, no title/isPublished/dueAt, since
// none of those concepts apply to a post). TeacherCourseStream.tsx
// special-cases this variant with its own card, same as
// CourseStream.tsx does on the student side.
export type TeacherStreamItem = TeacherStreamContentItem | ({ type: 'announcement' } & Announcement)

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

    const [lessonsRes, quizzesRes, assignmentsRes, announcements] = await Promise.all([
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
        listAnnouncementsForCourse(courseId),
    ])

    if (lessonsRes.error || quizzesRes.error || assignmentsRes.error) {
        return { error: 'Failed to load course content.' }
    }

    const assignmentIds = (assignmentsRes.data ?? []).map((a) => a.id)
    const quizIds = (quizzesRes.data ?? []).map((q) => q.id)

    // Ungraded submission counts per assignment, scoped to this course's
    // own assignment ids — same query shape as teacher-dashboard.ts's
    // cross-course version, just filtered down to one course.
    const submissionsRes =
        assignmentIds.length === 0
            ? { data: [] as { assignment_id: string }[], error: null }
            : await supabase
                  .from('assignment_submissions')
                  .select('assignment_id')
                  .in('assignment_id', assignmentIds)
                  .in('status', ['submitted', 'resubmitted'])

    // Ungraded quiz attempts per quiz — now wired up (was previously
    // not, per this file's own earlier comment). status = 'submitted'
    // means "not yet graded": compute_quiz_score() (migration 016/017)
    // auto-flips a fully auto-gradable attempt straight to 'graded' on
    // submit, so an attempt staying at 'submitted' means it has at
    // least one short_answer response still waiting on a teacher —
    // same real-world meaning as teacher-dashboard.ts's stricter
    // per-response check, just counted at the attempt level instead of
    // the response level, since that's simpler and matches in practice.
    const quizAttemptsRes =
        quizIds.length === 0
            ? { data: [] as { quiz_id: string }[], error: null }
            : await supabase
                  .from('quiz_attempts')
                  .select('quiz_id')
                  .in('quiz_id', quizIds)
                  .eq('status', 'submitted')

    // Same silent-swallow gap as teacher-dashboard.ts — logging the
    // real error instead of letting it look identical to "zero
    // ungraded" via the ?? [] fallback below.
    if (submissionsRes.error) {
        console.error('getTeacherCourseStream submissionsRes error:', submissionsRes.error.message, submissionsRes.error.code, submissionsRes.error.details)
    }
    if (quizAttemptsRes.error) {
        console.error('getTeacherCourseStream quizAttemptsRes error:', quizAttemptsRes.error.message, quizAttemptsRes.error.code, quizAttemptsRes.error.details)
    }

    const ungradedByAssignment = new Map<string, number>()
    for (const s of submissionsRes.data ?? []) {
        ungradedByAssignment.set(s.assignment_id, (ungradedByAssignment.get(s.assignment_id) ?? 0) + 1)
    }

    const ungradedByQuiz = new Map<string, number>()
    for (const a of quizAttemptsRes.data ?? []) {
        ungradedByQuiz.set(a.quiz_id, (ungradedByQuiz.get(a.quiz_id) ?? 0) + 1)
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
            ungradedCount: ungradedByQuiz.get(q.id) ?? 0,
        })),
        ...(assignmentsRes.data ?? []).map((a: { id: string; title: string; is_published: boolean; due_at: string | null; created_at: string }) => ({
            id: a.id,
            type: 'assignment' as const,
            title: a.title,
            isPublished: a.is_published,
            createdAt: a.created_at,
            dueAt: a.due_at,
            ungradedCount: ungradedByAssignment.get(a.id) ?? 0,
        })),
        ...announcements.map((a): TeacherStreamItem => ({ type: 'announcement', ...a })),
    ]

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { items }
}