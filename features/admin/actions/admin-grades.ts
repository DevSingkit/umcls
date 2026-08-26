'use server'
// Admin course listing for the grades section. Actual grade viewing
// now goes through gradebook.ts's getGradebookForCourseGrid, which
// already accepts admin the same as the owning teacher. That grid is
// read-only (see gradebook.ts's header comment) — admin views scores
// the same way a teacher does, editing happens through each
// submission's own grading flow, not here. This file only supplies
// the course picker list.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

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
