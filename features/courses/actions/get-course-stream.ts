'use server'
// Builds the unified, Classroom-style "stream" for a course: lessons,
// quizzes, and assignments merged into one list, newest-created first
// — matching how Google Classroom's stream actually orders posts
// (not grouped by type, not due-date order). Each item carries just
// enough shared shape for CourseStream.tsx to render a generic card,
// plus a `kind`-specific status so the card can show the right badge.
//
// This intentionally duplicates some of what the old three-section
// student course page queried directly (lessons, quizzes,
// lesson_completions) — the difference is everything comes back
// pre-merged and pre-sorted, so the page component stays a thin
// renderer instead of doing this assembly itself.
//
// PHASE 3.8 ADDITION (2026-08-28): announcements merged in as a fourth
// kind, via listAnnouncementsForCourse (shared with
// get-teacher-course-stream.ts, so the two queries can't independently
// re-derive this and disagree). Unlike the other three kinds,
// 'announcement' carries no `title` — the body text itself IS the
// content, matching how Classroom shows announcement posts inline
// rather than as a link to something else. CourseStream.tsx special-
// cases this kind with a genuinely different card shape for that
// reason (confirmed with user before building, not assumed).

import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { listAnnouncementsForCourse, type Announcement } from '@/features/courses/actions/announcements'
import { getMissionsForStudent } from '@/features/missions/actions/get-mission-for-student'
import { listLessonCommentsForLessons, type LessonComment } from '@/features/lessons/actions/lesson-comments'

// Shape MaterialList.tsx already expects — reused as-is so the stream
// card can pass materials straight into that component with no
// reshaping.
export type LessonMaterial = {
    id: string
    file_name: string
    file_type: string
    file_size_bytes: number | null
    external_url?: string | null
    created_at: string
}

// Summarized from getMissionsForStudent's full per-mission list — the
// stream card only needs counts plus where "Practice" should send the
// student, not the full mission-by-mission breakdown MissionPath.tsx
// renders on the dedicated lesson page.
export type LessonMissionsSummary = {
    total: number
    masteredCount: number
    // The first 'unlocked' mission's id, i.e. exactly the node
    // MissionPath.tsx treats as "Start here" — continuing an
    // in-progress mission counts as this same node, since a mission
    // only becomes 'mastered' once its threshold is met. null when
    // there's nothing left to unlock (every mission mastered, or the
    // lesson has zero published missions).
    practiceMissionId: string | null
}

export type StreamItem =
    | {
        kind: 'lesson'
        id: string
        title: string
        createdAt: string
        completed: boolean
        authorName: string
        authorAvatarUrl: string | null
        description: string | null
        materials: LessonMaterial[]
        missions: LessonMissionsSummary
        comments: LessonComment[]
    }
    | {
        kind: 'quiz'
        id: string
        title: string
        createdAt: string
        // null: student hasn't started it yet. Otherwise the latest
        // attempt's status, so the card can say "In progress",
        // "Submitted", or "Graded".
        attemptStatus: 'in_progress' | 'submitted' | 'graded' | null
        authorName: string
        authorAvatarUrl: string | null
    }
    | {
        kind: 'assignment'
        id: string
        title: string
        createdAt: string
        dueAt: string | null
        // null: student hasn't submitted yet. Otherwise the submission's
        // own status column (assignment_submissions.status) — same
        // states used everywhere else in the assignment flow.
        submissionStatus: 'submitted' | 'graded' | 'returned' | 'resubmitted' | null
        authorName: string
        authorAvatarUrl: string | null
    }
    | ({
        kind: 'announcement'
    } & Announcement)

export async function getCourseStream(courseId: string): Promise<StreamItem[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    // Confirm active enrollment first — same check the old page did
    // inline; centralizing it here since this is now the single entry
    // point the course page calls.
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) {
        return []
    }

    const [{ data: lessons }, { data: quizzes }, { data: assignments }, announcements] = await Promise.all([
        supabase
            .from('lessons')
            .select('id, title, content, created_at, created_by, users!lessons_created_by_fkey(full_name, avatar_url)')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .is('deleted_at', null),
        supabase
            .from('quizzes')
            .select('id, title, created_at, created_by, users!quizzes_created_by_fkey(full_name, avatar_url)')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .is('deleted_at', null),
        supabase
            .from('assignments')
            .select('id, title, due_at, created_at, created_by, users!assignments_created_by_fkey(full_name, avatar_url)')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .is('deleted_at', null),
        listAnnouncementsForCourse(courseId),
    ])

    const assignmentIds = (assignments ?? []).map((a) => a.id)

    const { data: submissions } = assignmentIds.length > 0
        ? await supabase
            .from('assignment_submissions')
            .select('assignment_id, status')
            .eq('student_id', user.id)
            .in('assignment_id', assignmentIds)
        : { data: [] as { assignment_id: string; status: string }[] }

    const submissionStatusByAssignment = new Map(
        (submissions ?? []).map((s) => [s.assignment_id, s.status])
    )

    const lessonIds = (lessons ?? []).map((l) => l.id)
    const quizIds = (quizzes ?? []).map((q) => q.id)

    const [{ data: completions }, { data: attempts }, { data: lessonMaterials }, commentsByLessonId] = await Promise.all([
        lessonIds.length > 0
            ? supabase
                .from('lesson_completions')
                .select('lesson_id')
                .eq('student_id', user.id)
                .in('lesson_id', lessonIds)
            : Promise.resolve({ data: [] as { lesson_id: string }[] }),
        quizIds.length > 0
            ? supabase
                .from('quiz_attempts')
                .select('quiz_id, status, submitted_at')
                .eq('student_id', user.id)
                .in('quiz_id', quizIds)
                .order('submitted_at', { ascending: false, nullsFirst: false })
            : Promise.resolve({ data: [] as { quiz_id: string; status: string; submitted_at: string | null }[] }),
        // All lesson-attached materials in one query — a per-card fetch
        // would mean one round trip per lesson card instead of one for
        // the whole stream.
        lessonIds.length > 0
            ? supabase
                .from('materials')
                .select('id, lesson_id, file_name, file_type, file_size_bytes, external_url, created_at')
                .in('lesson_id', lessonIds)
                .is('deleted_at', null)
            : Promise.resolve({ data: [] as (LessonMaterial & { lesson_id: string })[] }),
        listLessonCommentsForLessons(lessonIds),
    ])

    const materialsByLessonId = new Map<string, LessonMaterial[]>()
    for (const m of lessonMaterials ?? []) {
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

    // One getMissionsForStudent call per lesson — reuses the exact same
    // bootstrapping/unlock logic MissionPath.tsx's page already relies
    // on, rather than re-deriving mission status here and risking the
    // two disagreeing. Run in parallel since each is independent.
    const missionsSummaryByLessonId = new Map<string, LessonMissionsSummary>()
    if (lessonIds.length > 0) {
        const missionsPerLesson = await Promise.all(
            lessonIds.map(async (lessonId) => {
                const missions = await getMissionsForStudent(lessonId)
                return [lessonId, missions] as const
            })
        )
        for (const [lessonId, missions] of missionsPerLesson) {
            missionsSummaryByLessonId.set(lessonId, {
                total: missions.length,
                masteredCount: missions.filter((m) => m.status === 'mastered').length,
                practiceMissionId: missions.find((m) => m.status === 'unlocked')?.id ?? null,
            })
        }
    }

    const completedLessonIds = new Set((completions ?? []).map((c) => c.lesson_id))

    // Latest attempt per quiz — attempts came back newest-submitted
    // first, so the first match per quiz_id is the one we want.
    const latestAttemptByQuiz = new Map<string, string>()
    for (const a of attempts ?? []) {
        if (!latestAttemptByQuiz.has(a.quiz_id)) {
            latestAttemptByQuiz.set(a.quiz_id, a.status)
        }
    }

    const items: StreamItem[] = [
        ...(lessons ?? []).map((l: any): StreamItem => ({
            kind: 'lesson',
            id: l.id,
            title: l.title,
            createdAt: l.created_at,
            completed: completedLessonIds.has(l.id),
            authorName: l.users?.full_name ?? 'Teacher',
            authorAvatarUrl: l.users?.avatar_url ?? null,
            description: l.content?.type === 'text' ? (l.content.body ?? null) : null,
            materials: materialsByLessonId.get(l.id) ?? [],
            missions: missionsSummaryByLessonId.get(l.id) ?? {
                total: 0,
                masteredCount: 0,
                practiceMissionId: null,
            },
            comments: commentsByLessonId.get(l.id) ?? [],
        })),
        ...(quizzes ?? []).map((q: any): StreamItem => ({
            kind: 'quiz',
            id: q.id,
            title: q.title,
            createdAt: q.created_at,
            attemptStatus: (latestAttemptByQuiz.get(q.id) as 'in_progress' | 'submitted' | 'graded' | undefined) ?? null,
            authorName: q.users?.full_name ?? 'Teacher',
            authorAvatarUrl: q.users?.avatar_url ?? null,
        })),
        ...(assignments ?? []).map((a: any): StreamItem => ({
            kind: 'assignment',
            id: a.id,
            title: a.title,
            createdAt: a.created_at,
            dueAt: a.due_at,
            submissionStatus:
                (submissionStatusByAssignment.get(a.id) as
                    | 'submitted'
                    | 'graded'
                    | 'returned'
                    | 'resubmitted'
                    | undefined) ?? null,
            authorName: a.users?.full_name ?? 'Teacher',
            authorAvatarUrl: a.users?.avatar_url ?? null,
        })),
        ...announcements.map((a): StreamItem => ({ kind: 'announcement', ...a })),
    ]

    // Newest first — matches Classroom's actual stream ordering (post
    // creation time), not due date and not grouped by type.
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return items
}
