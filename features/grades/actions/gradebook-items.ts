'use server'
// Manual gradebook actions. See migration 072 for the schema and the
// reasoning behind gradebook_items/gradebook_scores being separate
// from assignments/quizzes — this is a teacher-built sheet, not an
// automatic mirror of every assignment and quiz in the course.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { resolveWeightProfileKey } from '@/features/grades/queries/gradebook'

type ComponentType = 'written_work' | 'performance_task' | 'quarterly_assessment'

async function assertCourseAccess(courseId: string, userId: string, role: string) {
    if (role === 'admin') return true
    const supabase = await createClient()
    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', userId)
        .single()
    return !!course
}

export type CreateGradebookItemResult = { ok: true; id: string } | { ok: false; error: string }

// Creates a new gradebook column. label is free text on purpose — "A1",
// "Q1", "R" for recitation, whatever the teacher wants to call it, no
// fixed vocabulary. linkedAssignmentId/linkedQuizId are optional; at
// most one may be set (enforced by the DB check constraint too).
export async function createGradebookItem(
    courseId: string,
    component: ComponentType,
    label: string,
    maxScore: number,
    linkedAssignmentId?: string | null,
    linkedQuizId?: string | null
): Promise<CreateGradebookItemResult> {
    const user = await requireRole(['teacher', 'admin'])
    const trimmedLabel = label.trim()

    if (!trimmedLabel) return { ok: false, error: 'Enter a label for this column.' }
    if (!Number.isFinite(maxScore) || maxScore <= 0) return { ok: false, error: 'Max score must be greater than 0.' }
    if (linkedAssignmentId && linkedQuizId) {
        return { ok: false, error: 'A column can link to an assignment or a quiz, not both.' }
    }

    const hasAccess = await assertCourseAccess(courseId, user.id, user.role)
    if (!hasAccess) return { ok: false, error: 'You do not have access to this course.' }

    const supabase = await createClient()

    const { count } = await supabase
        .from('gradebook_items')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const { data, error } = await supabase
        .from('gradebook_items')
        .insert({
            course_id: courseId,
            component,
            label: trimmedLabel,
            max_score: maxScore,
            linked_assignment_id: linkedAssignmentId ?? null,
            linked_quiz_id: linkedQuizId ?? null,
            order_index: count ?? 0,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (error || !data) {
        return { ok: false, error: 'Could not create the column. Please try again.' }
    }

    return { ok: true, id: data.id }
}

export type SetGradebookScoreResult = { ok: true } | { ok: false; error: string }

// Sets (or overwrites) one student's score on one gradebook column.
// This is the single write path for every cell in the grid, whether
// the value came from manual typing or from pullLinkedScores below —
// both just call this per student.
export async function setGradebookScore(
    gradebookItemId: string,
    studentId: string,
    score: number
): Promise<SetGradebookScoreResult> {
    const user = await requireRole(['teacher', 'admin'])
    const supabase = await createClient()

    const { data: item } = await supabase
        .from('gradebook_items')
        .select('id, max_score, course_id, courses!inner(teacher_id)')
        .eq('id', gradebookItemId)
        .single()

    const isOwningTeacher = (item as any)?.courses?.teacher_id === user.id
    if (!item || (!isOwningTeacher && user.role !== 'admin')) {
        return { ok: false, error: 'You do not have access to this column.' }
    }

    if (!Number.isFinite(score) || score < 0 || score > (item as any).max_score) {
        return { ok: false, error: `Score must be between 0 and ${(item as any).max_score}.` }
    }

    const { error } = await supabase
        .from('gradebook_scores')
        .upsert(
            {
                gradebook_item_id: gradebookItemId,
                student_id: studentId,
                score,
                graded_by: user.id,
                graded_at: new Date().toISOString(),
            },
            { onConflict: 'gradebook_item_id,student_id' }
        )

    if (error) {
        return { ok: false, error: 'Could not save the score. Please try again.' }
    }

    return { ok: true }
}

export type PullLinkedScoresResult = { ok: true; pulledCount: number } | { ok: false; error: string }

// One-time pull: copies every enrolled student's current score from the
// linked assignment or quiz into gradebook_scores. After this runs, the
// gradebook cell is just a normal editable value — it does NOT stay in
// sync afterward, per the "auto-fill once, then teacher can overwrite"
// decision. Calling this again re-pulls and overwrites whatever's in
// the gradebook right now with the current real score, so it's also
// how a teacher would deliberately refresh a stale pull.
export async function pullLinkedScores(gradebookItemId: string): Promise<PullLinkedScoresResult> {
    const user = await requireRole(['teacher', 'admin'])
    const supabase = await createClient()

    const { data: item } = await supabase
        .from('gradebook_items')
        .select('id, course_id, linked_assignment_id, linked_quiz_id, courses!inner(teacher_id)')
        .eq('id', gradebookItemId)
        .single()

    const isOwningTeacher = (item as any)?.courses?.teacher_id === user.id
    if (!item || (!isOwningTeacher && user.role !== 'admin')) {
        return { ok: false, error: 'You do not have access to this column.' }
    }
    if (!item.linked_assignment_id && !item.linked_quiz_id) {
        return { ok: false, error: 'This column is not linked to an assignment or quiz.' }
    }

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', item.course_id)
        .eq('status', 'active')

    const studentIds = (enrollments ?? []).map((e) => e.student_id)
    if (studentIds.length === 0) return { ok: true, pulledCount: 0 }

    let scoresByStudent = new Map<string, number>()

    if (item.linked_assignment_id) {
        const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('student_id, score')
            .eq('assignment_id', item.linked_assignment_id)
            .in('student_id', studentIds)
            .in('status', ['graded', 'returned'])
        scoresByStudent = new Map(
            (submissions ?? []).filter((s) => s.score !== null).map((s) => [s.student_id, s.score as number])
        )
    } else if (item.linked_quiz_id) {
        const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('student_id, score')
            .eq('quiz_id', item.linked_quiz_id)
            .in('student_id', studentIds)
            .eq('status', 'graded')
        scoresByStudent = new Map(
            (attempts ?? []).filter((a) => a.score !== null).map((a) => [a.student_id, a.score as number])
        )
    }

    if (scoresByStudent.size === 0) return { ok: true, pulledCount: 0 }

    const rows = Array.from(scoresByStudent.entries()).map(([studentId, score]) => ({
        gradebook_item_id: gradebookItemId,
        student_id: studentId,
        score,
        graded_by: user.id,
        graded_at: new Date().toISOString(),
    }))

    const { error } = await supabase
        .from('gradebook_scores')
        .upsert(rows, { onConflict: 'gradebook_item_id,student_id' })

    if (error) {
        return { ok: false, error: 'Could not pull scores. Please try again.' }
    }

    return { ok: true, pulledCount: rows.length }
}

export type GradebookColumnData = {
    id: string
    component: ComponentType
    label: string
    maxScore: number
    linkedAssignmentId: string | null
    linkedQuizId: string | null
}

export type GradebookData = {
    students: { studentId: string; studentName: string }[]
    items: GradebookColumnData[]
    scores: { itemId: string; studentId: string; score: number }[]
    weights: { written_work_pct: number; performance_task_pct: number; quarterly_assessment_pct: number }
    gradesVisible: boolean
}

// Full gradebook for a course: every enrolled student (alphabetical, by
// full_name), every teacher-created column, and every score entered so
// far. Students with no score for a column simply have no row in
// `scores` for that pair — the grid renders that as blank, not zero.
export async function getGradebookForCourseGrid(courseId: string): Promise<GradebookData | null> {
    const user = await requireRole(['teacher', 'admin'])
    const hasAccess = await assertCourseAccess(courseId, user.id, user.role)
    if (!hasAccess) return null

    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('subject, grades_visible_to_students')
        .eq('id', courseId)
        .single()

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? [])
        .map((e: any) => ({ studentId: e.student_id as string, studentName: (e.users?.full_name as string) ?? 'Unknown' }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName))

    const { data: items } = await supabase
        .from('gradebook_items')
        .select('id, component, label, max_score, linked_assignment_id, linked_quiz_id')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    const itemIds = (items ?? []).map((i) => i.id)

    const { data: scores } = itemIds.length
        ? await supabase.from('gradebook_scores').select('gradebook_item_id, student_id, score').in('gradebook_item_id', itemIds)
        : { data: [] as { gradebook_item_id: string; student_id: string; score: number }[] }

    const weightProfileKey = resolveWeightProfileKey(course?.subject ?? null)
    const { data: weightRow } = await supabase
        .from('subject_weight_profiles')
        .select('written_work_pct, performance_task_pct, quarterly_assessment_pct')
        .eq('profile_key', weightProfileKey)
        .single()

    const weights = weightRow ?? { written_work_pct: 20, performance_task_pct: 50, quarterly_assessment_pct: 30 }

    return {
        students,
        items: (items ?? []).map((i) => ({
            id: i.id,
            component: i.component as ComponentType,
            label: i.label,
            maxScore: i.max_score,
            linkedAssignmentId: i.linked_assignment_id,
            linkedQuizId: i.linked_quiz_id,
        })),
        scores: (scores ?? []).map((s) => ({ itemId: s.gradebook_item_id, studentId: s.student_id, score: s.score })),
        weights,
        gradesVisible: course?.grades_visible_to_students ?? false,
    }
}

export type LinkableOptions = {
    assignments: { id: string; title: string; maxScore: number }[]
    quizzes: { id: string; title: string; maxScore: number }[]
}

// Every assignment and quiz in a course, for the "Add column" form's
// link dropdown. Deliberately not filtered by is_published/deleted_at
// beyond the basics — a teacher may want to link a column to a draft
// item they're about to post.
//
// Includes each item's real max score (assignments.max_score directly;
// a quiz's max score is the sum of its questions' points, same as
// everywhere else in this system, e.g. GradebookGrid's item computation
// and get-my-final-grade.ts) — the form uses this to auto-fill and lock
// the gradebook column's max score once a link is picked, so a linked
// column's max score can never drift out of sync with the real item's
// max score. Only an unlinked, manually-scored column asks the teacher
// to type a max score by hand.
export async function getLinkableItemsForCourse(courseId: string): Promise<LinkableOptions | null> {
    const user = await requireRole(['teacher', 'admin'])
    const hasAccess = await assertCourseAccess(courseId, user.id, user.role)
    if (!hasAccess) return null

    const supabase = await createClient()

    const { data: assignments } = await supabase
        .from('assignments')
        .select('id, title, max_score')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, questions(points)')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    // Exclude anything already linked by an existing gradebook column —
    // one assignment or quiz can only ever back one column, otherwise
    // the same real score could get pulled into two different columns
    // and double-count toward the student's Final Grade.
    const { data: alreadyLinked } = await supabase
        .from('gradebook_items')
        .select('linked_assignment_id, linked_quiz_id')
        .eq('course_id', courseId)
        .is('deleted_at', null)

    const linkedAssignmentIds = new Set(
        (alreadyLinked ?? []).map((i) => i.linked_assignment_id).filter((id): id is string => id !== null)
    )
    const linkedQuizIds = new Set(
        (alreadyLinked ?? []).map((i) => i.linked_quiz_id).filter((id): id is string => id !== null)
    )

    return {
        assignments: (assignments ?? [])
            .filter((a) => !linkedAssignmentIds.has(a.id))
            .map((a) => ({ id: a.id, title: a.title, maxScore: a.max_score })),
        quizzes: (quizzes ?? [])
            .filter((q) => !linkedQuizIds.has(q.id))
            .map((q: any) => ({
                id: q.id,
                title: q.title,
                maxScore: (q.questions ?? []).reduce((sum: number, x: any) => sum + (x.points ?? 0), 0),
            })),
    }
}

export type SetGradesVisibilityResult = { ok: true } | { ok: false; error: string }

// Course-level toggle: whether a student can see their own Final Grade
// on the student grades page. Defaults to false (migration 074) —
// hidden until a teacher or admin turns it on. Applies to the whole
// course at once, not per gradebook item.
export async function setGradesVisibility(courseId: string, visible: boolean): Promise<SetGradesVisibilityResult> {
    const user = await requireRole(['teacher', 'admin'])
    const hasAccess = await assertCourseAccess(courseId, user.id, user.role)
    if (!hasAccess) return { ok: false, error: 'You do not have access to this course.' }

    const supabase = await createClient()

    const { data: updated, error } = await supabase
        .from('courses')
        .update({ grades_visible_to_students: visible })
        .eq('id', courseId)
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not update grade visibility. Please try again.' }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not update grade visibility — the update did not apply.' }
    }

    return { ok: true }
}
