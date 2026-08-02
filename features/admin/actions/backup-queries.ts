'use server'
// Backing queries for the two admin backup CSV routes
// (app/api/admin/backup/users, .../grades). Kept separate from
// admin-grades.ts and users.ts because these are shaped specifically
// for a full-record export, not for rendering a UI — e.g. the grades
// backup returns one row per graded item (every assignment submission
// and quiz attempt), not the DepEd component-average summary
// admin-grades.ts already provides. This is a raw activity log, not a
// second copy of the DepEd computation.
//
// Not 'use server' Server Actions in the strict form-action sense —
// these are called directly from Route Handlers (see AUTH_NOTES.md/
// gradebook export route's own comment on why Route Handlers check
// auth directly instead of using requireRole). Marked 'use server'
// only because the file needs to run server-side; no requireRole call
// lives in these functions themselves — the calling route is
// responsible for the admin check, same separation of concerns as
// computeDepEdGradesForCourse in gradebook.ts.

import { createClient } from '@/lib/supabase/server'

export type UserBackupRow = {
    fullName: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
}

// Every user, any role, active or deactivated — a backup needs the
// full roster, not just the active subset the admin Users page
// filters to by default. Soft-deleted (deleted_at set) rows are
// excluded, same as every other list in the app.
export async function getAllUsersForBackup(): Promise<UserBackupRow[]> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('users')
        .select('full_name, email, role, is_active, created_at')
        .is('deleted_at', null)
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })

    return (data ?? []).map((u) => ({
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
    }))
}

export type GradeBackupRow = {
    studentName: string
    studentEmail: string
    courseTitle: string
    teacherName: string
    itemType: 'assignment' | 'quiz'
    itemTitle: string
    score: number | null
    maxScore: number | null
    percentage: number | null
    gradedAt: string | null
}

// One row per graded item (every graded/returned assignment submission,
// every graded quiz attempt), across every course — the actual
// activity-level record, not the DepEd averaged summary. "Graded" only
// (ungraded submissions have no score to report), matching
// computeDepEdGradesForCourse's own status filter for the same reason.
export async function getAllGradedItemsForBackup(): Promise<GradeBackupRow[]> {
    const supabase = await createClient()

    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)

    const courseMeta = new Map(
        (courses ?? []).map((c: any) => [
            c.id,
            { title: c.title as string, teacherName: (c.users?.full_name as string) ?? 'Unknown' },
        ])
    )
    const courseIds = (courses ?? []).map((c) => c.id)

    if (courseIds.length === 0) return []

    const [{ data: assignments }, { data: quizzes }] = await Promise.all([
        supabase
            .from('assignments')
            .select('id, title, max_score, course_id')
            .in('course_id', courseIds)
            .is('deleted_at', null),
        supabase
            .from('quizzes')
            .select('id, title, course_id')
            .in('course_id', courseIds)
            .is('deleted_at', null),
    ])

    const assignmentMeta = new Map(
        (assignments ?? []).map((a) => [a.id, { title: a.title, maxScore: a.max_score, courseId: a.course_id }])
    )
    const assignmentIds = (assignments ?? []).map((a) => a.id)

    const quizMeta = new Map((quizzes ?? []).map((q) => [q.id, { title: q.title, courseId: q.course_id }]))
    const quizIds = (quizzes ?? []).map((q) => q.id)

    const [{ data: submissions }, { data: attempts }] = await Promise.all([
        assignmentIds.length
            ? supabase
                  .from('assignment_submissions')
                  .select('assignment_id, score, graded_at, users!assignment_submissions_student_id_fkey(full_name, email)')
                  .in('assignment_id', assignmentIds)
                  .in('status', ['graded', 'returned'])
            : Promise.resolve({ data: [] as any[] }),
        quizIds.length
            ? supabase
                  .from('quiz_attempts')
                  .select('quiz_id, score, graded_at, users!quiz_attempts_student_id_fkey(full_name, email)')
                  .in('quiz_id', quizIds)
                  .eq('status', 'graded')
            : Promise.resolve({ data: [] as any[] }),
    ])

    const rows: GradeBackupRow[] = []

    for (const s of submissions ?? []) {
        const meta = assignmentMeta.get(s.assignment_id)
        if (!meta || s.score === null) continue
        const course = courseMeta.get(meta.courseId)
        rows.push({
            studentName: s.users?.full_name ?? 'Unknown',
            studentEmail: s.users?.email ?? '',
            courseTitle: course?.title ?? 'Unknown course',
            teacherName: course?.teacherName ?? 'Unknown',
            itemType: 'assignment',
            itemTitle: meta.title,
            score: s.score,
            maxScore: meta.maxScore,
            percentage: meta.maxScore > 0 ? Math.round((s.score / meta.maxScore) * 10000) / 100 : null,
            gradedAt: s.graded_at,
        })
    }

    for (const a of attempts ?? []) {
        const meta = quizMeta.get(a.quiz_id)
        if (!meta || a.score === null) continue
        const course = courseMeta.get(meta.courseId)
        rows.push({
            studentName: a.users?.full_name ?? 'Unknown',
            studentEmail: a.users?.email ?? '',
            courseTitle: course?.title ?? 'Unknown course',
            teacherName: course?.teacherName ?? 'Unknown',
            itemType: 'quiz',
            itemTitle: meta.title,
            // quiz_attempts.score is already a 0-100 percentage, same
            // as everywhere else in gradebook.ts — no separate max score.
            score: a.score,
            maxScore: null,
            percentage: a.score,
            gradedAt: a.graded_at,
        })
    }

    // Newest-graded first, so a backup opened casually shows recent
    // activity up top rather than whatever order the joins happened to
    // return.
    rows.sort((a, b) => new Date(b.gradedAt ?? 0).getTime() - new Date(a.gradedAt ?? 0).getTime())

    return rows
}
