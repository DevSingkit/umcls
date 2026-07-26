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

import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type StreamItem =
    | {
        kind: 'lesson'
        id: string
        title: string
        createdAt: string
        completed: boolean
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
    }

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

    const [{ data: lessons }, { data: quizzes }, { data: assignments }] = await Promise.all([
        supabase
            .from('lessons')
            .select('id, title, created_at')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .is('deleted_at', null),
        supabase
            .from('quizzes')
            .select('id, title, created_at')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .is('deleted_at', null),
        supabase
            .from('assignments')
            .select('id, title, due_at, created_at')
            .eq('course_id', courseId)
            .eq('is_published', true)
            .is('deleted_at', null),
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

    const [{ data: completions }, { data: attempts }] = await Promise.all([
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
    ])

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
        ...(lessons ?? []).map((l): StreamItem => ({
            kind: 'lesson',
            id: l.id,
            title: l.title,
            createdAt: l.created_at,
            completed: completedLessonIds.has(l.id),
        })),
        ...(quizzes ?? []).map((q): StreamItem => ({
            kind: 'quiz',
            id: q.id,
            title: q.title,
            createdAt: q.created_at,
            attemptStatus: (latestAttemptByQuiz.get(q.id) as 'in_progress' | 'submitted' | 'graded' | undefined) ?? null,
        })),
        ...(assignments ?? []).map((a): StreamItem => ({
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
        })),
    ]

    // Newest first — matches Classroom's actual stream ordering (post
    // creation time), not due date and not grouped by type.
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return items
}
