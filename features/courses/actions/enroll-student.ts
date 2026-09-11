'use server'
// Lets a teacher enroll a student into one of THEIR OWN courses.
// Distinct from features/admin/actions/enroll-student.ts, which is
// admin-only and can enroll into any course. This one is scoped to
// courses the logged-in teacher owns — enforced both here (app-side)
// and at the RLS layer via enrollments_insert_teacher, which checks
// is_course_teacher(course_id) — see migration
// 081_enrollments_insert_teacher.sql.

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const enrollSchema = z.object({
    studentId: z.string().uuid(),
    courseId: z.string().uuid(),
})

export type EnrollResult =
    | { ok: true }
    | { ok: false; error: string }

// Enrolls a student into a course owned by the logged-in teacher.
// Re-checks ownership app-side before inserting (same reasoning as
// updateCourse / toggleCoursePublish in courses.ts) even though RLS
// also enforces it — belt and suspenders per AUTH_NOTES.md.
export async function enrollStudentIntoOwnCourse(formData: FormData): Promise<EnrollResult> {
    const teacher = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = enrollSchema.safeParse({
        studentId: formData.get('studentId'),
        courseId: formData.get('courseId'),
    })

    if (!parsed.success) {
        return { ok: false, error: 'Please choose a student.' }
    }

    const { studentId, courseId } = parsed.data

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', teacher.id)
        .is('deleted_at', null)
        .single()

    if (!course) {
        return { ok: false, error: 'Course not found.' }
    }

    const { error } = await supabase.from('enrollments').insert({
        student_id: studentId,
        course_id: courseId,
        enrolled_by: teacher.id,
        status: 'active',
    })

    if (error) {
        if (error.code === '23505') {
            return { ok: false, error: 'This student is already enrolled in this course.' }
        }
        return { ok: false, error: 'Could not enroll the student. Please try again.' }
    }

    return { ok: true }
}

// Active students not already (actively) enrolled in this course, for
// the enroll dropdown. Scoped to the teacher's own course the same
// way getCourseRoster is. A student who was previously dropped from
// this course is treated as enrollable again, matching how
// unenrollStudent soft-removes (status: 'dropped') rather than
// deleting — re-enrolling should just insert a fresh active row.
export async function getEnrollableStudents(courseId: string) {
    const teacher = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', teacher.id)
        .is('deleted_at', null)
        .single()

    if (!course) return []

    const [{ data: students }, { data: activeEnrollments }] = await Promise.all([
        supabase
            .from('users')
            .select('id, full_name, email')
            .eq('role', 'student')
            .eq('is_active', true)
            .order('full_name'),
        supabase
            .from('enrollments')
            .select('student_id')
            .eq('course_id', courseId)
            .eq('status', 'active'),
    ])

    const enrolledIds = new Set((activeEnrollments ?? []).map((e) => e.student_id as string))
    return (students ?? []).filter((s) => !enrolledIds.has(s.id))
}
