'use server'
// Admin, read-only view across every teacher's courses and grades. No
// mutation of any kind lives in this file, on purpose — the client
// asked specifically for admin to see everything but edit nothing.
// Reuses computeDepEdGradesForCourse from gradebook.ts (the same
// DepEd Matatag weighted computation the teacher gradebook and student
// grades page already use) rather than a second copy of that logic —
// see that function's own comment for why it's factored out
// role-agnostic in the first place.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { computeDepEdGradesForCourse, type DepEdGradeRow } from '@/features/grades/queries/gradebook'

export type AdminCourseRow = {
    id: string
    title: string
    subject: string | null
    teacherName: string
    studentCount: number
}

// Every course across every teacher, for the admin course picker. No
// teacher_id filter — this is the one legitimate place in the codebase
// where "every course, regardless of owner" is the correct query, since
// every other course listing (getMyCourses, getMyEnrolledCourses) is
// deliberately scoped to one teacher or one student.
export async function getAllCoursesForAdmin(): Promise<AdminCourseRow[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data: courses } = await supabase
        .from('courses')
        .select('id, title, subject, users!courses_teacher_id_fkey(full_name)')
        .is('deleted_at', null)
        .order('title', { ascending: true })

    const courseIds = (courses ?? []).map((c) => c.id)

    const { data: enrollments } = courseIds.length
        ? await supabase
              .from('enrollments')
              .select('course_id')
              .in('course_id', courseIds)
              .eq('status', 'active')
        : { data: [] as { course_id: string }[] }

    const studentCountByCourseId = new Map<string, number>()
    for (const e of enrollments ?? []) {
        studentCountByCourseId.set(e.course_id, (studentCountByCourseId.get(e.course_id) ?? 0) + 1)
    }

    return (courses ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        subject: c.subject,
        teacherName: c.users?.full_name ?? 'Unknown',
        studentCount: studentCountByCourseId.get(c.id) ?? 0,
    }))
}

// DepEd grade breakdown for one course, any teacher's — admin can view
// any course's grades, not just their own (there's no "their own" for
// an admin). Returns null only if the course itself doesn't exist;
// unlike the teacher-scoped getDepEdGradesForCourse, there's no
// ownership check to fail here, since admin has no ownership
// restriction on this data by design.
export async function getDepEdGradesForCourseAsAdmin(courseId: string): Promise<{
    courseTitle: string
    teacherName: string
    rows: DepEdGradeRow[]
} | null> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, subject, users!courses_teacher_id_fkey(full_name)')
        .eq('id', courseId)
        .is('deleted_at', null)
        .single()

    if (!course) return null

    const rows = await computeDepEdGradesForCourse(courseId, (course as any).subject)

    return {
        courseTitle: course.title,
        teacherName: (course as any).users?.full_name ?? 'Unknown',
        rows,
    }
}
