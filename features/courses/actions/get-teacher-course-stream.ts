'use server'

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'
import { listAnnouncementsForCourse, type Announcement } from '@/features/courses/actions/announcements'
import type { LessonMaterial } from '@/features/courses/actions/get-course-stream'
import { listLessonCommentsForLessons, type LessonComment } from '@/features/lessons/actions/lesson-comments'

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
    authorName: string
    authorAvatarUrl: string | null
    // Lessons only — inline stream preview content. Left undefined for
    // quiz/assignment items rather than forced to null, so TypeScript
    // still flags any accidental read of these on a non-lesson item.
    description?: string | null
    materials?: LessonMaterial[]
    comments?: LessonComment[]
    // Lesson-only, teacher's own view of missions attached to this
    // lesson — a plain count, not the student mastery-progress shape
    // get-course-stream.ts's LessonMissionsSummary carries, since
    // "mastered" isn't a concept that applies to the teacher looking
    // at their own course.
    missionsCount?: number
    publishedMissionsCount?: number
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
            .select('id, title, content, is_published, created_at, created_by, users!lessons_created_by_fkey(full_name, avatar_url)')
            .eq('course_id', courseId)
            .is('deleted_at', null),
        supabase
            .from('quizzes')
            .select('id, title, is_published, created_at, created_by, users!quizzes_created_by_fkey(full_name, avatar_url)')
            .eq('course_id', courseId)
            .is('deleted_at', null),
        supabase
            .from('assignments')
            .select('id, title, is_published, due_at, created_at, created_by, users!assignments_created_by_fkey(full_name, avatar_url)')
            .eq('course_id', courseId)
            .is('deleted_at', null),
        listAnnouncementsForCourse(courseId),
    ])

    if (lessonsRes.error || quizzesRes.error || assignmentsRes.error) {
        return { error: 'Failed to load course content.' }
    }

    const assignmentIds = (assignmentsRes.data ?? []).map((a) => a.id)
    const quizIds = (quizzesRes.data ?? []).map((q) => q.id)
    const lessonIds = (lessonsRes.data ?? []).map((l) => l.id)

    // All lesson-attached materials in one query, same batching
    // reasoning as get-course-stream.ts's identical fetch.
    const materialsRes =
        lessonIds.length === 0
            ? { data: [] as (LessonMaterial & { lesson_id: string })[], error: null }
            : await supabase
                  .from('materials')
                  .select('id, lesson_id, file_name, file_type, file_size_bytes, external_url, created_at')
                  .in('lesson_id', lessonIds)
                  .is('deleted_at', null)

    const materialsByLessonId = new Map<string, LessonMaterial[]>()
    for (const m of materialsRes.data ?? []) {
        const list = materialsByLessonId.get(m.lesson_id) ?? []
        list.push({
            id: m.id,
            file_name: m.file_name,
            file_type: m.file_type,
            file_size_bytes: m.file_size_bytes,
            external_url: m.external_url,
            created_at: m.created_at,
        })
        materialsByLessonId.set(m.lesson_id, list)
    }

    const commentsByLessonId = await listLessonCommentsForLessons(lessonIds)

    // Missions attached to each lesson, teacher's own count — no
    // mastery/progress join here, that's a student-only concept
    // (get-course-stream.ts's LessonMissionsSummary). Includes drafts
    // (no is_published filter on the base fetch) so the teacher can
    // see "3 missions, 1 published" and know a draft needs publishing.
    const missionsRes =
        lessonIds.length === 0
            ? { data: [] as { lesson_id: string; is_published: boolean }[], error: null }
            : await supabase
                  .from('missions')
                  .select('lesson_id, is_published')
                  .in('lesson_id', lessonIds)
                  .is('deleted_at', null)

    const missionsCountByLessonId = new Map<string, number>()
    const publishedMissionsCountByLessonId = new Map<string, number>()
    for (const m of missionsRes.data ?? []) {
        missionsCountByLessonId.set(m.lesson_id, (missionsCountByLessonId.get(m.lesson_id) ?? 0) + 1)
        if (m.is_published) {
            publishedMissionsCountByLessonId.set(m.lesson_id, (publishedMissionsCountByLessonId.get(m.lesson_id) ?? 0) + 1)
        }
    }

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
        ...(lessonsRes.data ?? []).map((l: any) => ({
            id: l.id,
            type: 'lesson' as const,
            title: l.title,
            isPublished: l.is_published,
            createdAt: l.created_at,
            authorName: l.users?.full_name ?? 'Teacher',
            authorAvatarUrl: l.users?.avatar_url ?? null,
            description: l.content?.type === 'text' ? (l.content.body ?? null) : null,
            materials: materialsByLessonId.get(l.id) ?? [],
            comments: commentsByLessonId.get(l.id) ?? [],
            missionsCount: missionsCountByLessonId.get(l.id) ?? 0,
            publishedMissionsCount: publishedMissionsCountByLessonId.get(l.id) ?? 0,
        })),
        ...(quizzesRes.data ?? []).map((q: any) => ({
            id: q.id,
            type: 'quiz' as const,
            title: q.title,
            isPublished: q.is_published,
            createdAt: q.created_at,
            ungradedCount: ungradedByQuiz.get(q.id) ?? 0,
            authorName: q.users?.full_name ?? 'Teacher',
            authorAvatarUrl: q.users?.avatar_url ?? null,
        })),
        ...(assignmentsRes.data ?? []).map((a: any) => ({
            id: a.id,
            type: 'assignment' as const,
            title: a.title,
            isPublished: a.is_published,
            createdAt: a.created_at,
            dueAt: a.due_at,
            ungradedCount: ungradedByAssignment.get(a.id) ?? 0,
            authorName: a.users?.full_name ?? 'Teacher',
            authorAvatarUrl: a.users?.avatar_url ?? null,
        })),
        ...announcements.map((a): TeacherStreamItem => ({ type: 'announcement', ...a })),
    ]

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return { items }
}