'use server'
// Backing queries for the admin backup routes (app/api/admin/backup/
// users, .../grades). Kept separate from admin-grades.ts/users.ts
// because these are shaped for full-record export, not for rendering
// a UI.
//
// The old gradebook-scores/final-grade backup functions
// (getAllGradebookScoresForBackup, getAllFinalGradesForBackup) were
// removed, not rewritten, when gradebook_items/gradebook_scores/
// subject_weight_profiles were dropped (migration 083) along with the
// DepEd-weighted grading system. getAllCourseGradesForBackup below is
// the rebuild: sourced from assignment_submissions/quiz_attempts
// directly, same as gradebook.ts's live grid, no Final Grade column
// since nothing computes one anymore.
//
// Not a 'use server' Server Action in the strict form-action sense —
// called directly from Route Handlers. Marked 'use server' only
// because the file needs to run server-side; no requireRole call
// lives in these functions — the calling route is responsible for
// the admin check.

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

// Rebuilt grades backup. Sourced the same way gradebook.ts's
// getGradebookForCourseGrid reads a single course's grid — real
// assignment_submissions/quiz_attempts scores, no gradebook_items, no
// Final Grade — just run across every course instead of one. Kept
// self-contained here (rather than calling getGradebookForCourseGrid
// directly) since that function calls requireRole(['teacher','admin'])
// itself and is shaped for one course at a time; this needs every
// course in one pass for the calling route.
export type CourseGradesBackup = {
    teacherName: string
    courseTitle: string
    courseDescription: string | null
    columns: { id: string; kind: 'assignment' | 'quiz'; title: string; maxScore: number }[]
    students: { studentId: string; studentName: string }[]
    scores: { columnId: string; studentId: string; score: number | null }[]
}

export async function getAllCourseGradesForBackup(): Promise<CourseGradesBackup[]> {
    const supabase = await createClient()

    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, description, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)
        .order('title', { ascending: true })

    const results: CourseGradesBackup[] = []

    for (const course of (courses ?? []) as any[]) {
        const courseId = course.id as string

        const [{ data: enrollments }, { data: assignments }, { data: quizzes }] = await Promise.all([
            supabase
                .from('enrollments')
                .select('student_id, users!enrollments_student_id_fkey(full_name)')
                .eq('course_id', courseId)
                .eq('status', 'active'),
            supabase
                .from('assignments')
                .select('id, title, max_score')
                .eq('course_id', courseId)
                .is('deleted_at', null)
                .eq('is_published', true)
                .order('created_at', { ascending: true }),
            supabase
                .from('quizzes')
                .select('id, title, questions(points)')
                .eq('course_id', courseId)
                .is('deleted_at', null)
                .eq('is_published', true)
                .order('created_at', { ascending: true }),
        ])

        const students = (enrollments ?? [])
            .map((e: any) => ({
                studentId: e.student_id as string,
                studentName: (e.users?.full_name as string) ?? 'Unknown',
            }))
            .sort((a, b) => a.studentName.localeCompare(b.studentName))

        const columns: CourseGradesBackup['columns'] = [
            ...(assignments ?? []).map((a: any) => ({
                id: a.id as string,
                kind: 'assignment' as const,
                title: a.title as string,
                maxScore: a.max_score as number,
            })),
            ...(quizzes ?? []).map((q: any) => ({
                id: q.id as string,
                kind: 'quiz' as const,
                title: q.title as string,
                maxScore: (q.questions ?? []).reduce((sum: number, x: any) => sum + (x.points ?? 0), 0),
            })),
        ]

        const assignmentIds = (assignments ?? []).map((a: any) => a.id)
        const quizIds = (quizzes ?? []).map((q: any) => q.id)

        const [{ data: submissions }, { data: attempts }] = await Promise.all([
            assignmentIds.length
                ? supabase
                      .from('assignment_submissions')
                      .select('assignment_id, student_id, score')
                      .in('assignment_id', assignmentIds)
                : Promise.resolve({ data: [] as any[] }),
            quizIds.length
                ? supabase
                      .from('quiz_attempts')
                      .select('quiz_id, student_id, score')
                      .in('quiz_id', quizIds)
                      .eq('status', 'graded')
                : Promise.resolve({ data: [] as any[] }),
        ])

        const scores: CourseGradesBackup['scores'] = [
            ...(submissions ?? []).map((s: any) => ({
                columnId: s.assignment_id as string,
                studentId: s.student_id as string,
                score: s.score as number | null,
            })),
            ...(attempts ?? []).map((a: any) => ({
                columnId: a.quiz_id as string,
                studentId: a.student_id as string,
                score: a.score as number | null,
            })),
        ]

        results.push({
            teacherName: (course.users?.full_name as string) ?? 'Unknown',
            courseTitle: course.title as string,
            courseDescription: (course.description as string) ?? null,
            columns,
            students,
            scores,
        })
    }

    return results
}
