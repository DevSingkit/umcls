'use server'
// Gets every course a student is actively enrolled in. Used by the
// student dashboard and course list. Excludes archived courses
// (migration 059) via an inner-join filter on the embedded courses
// resource — !inner is required here, not just .is(), because a plain
// left-embed filter only affects which rows of the embedded resource
// come back, not whether the parent enrollment row itself is included;
// !inner makes it actually restrict the top-level result the way
// getMyCourses' plain .is('archived_at', null) does directly.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

type EnrolledCourse = {
    id: string
    title: string
    description: string | null
    subject: string | null
}

export async function getMyEnrolledCourses(): Promise<EnrolledCourse[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('enrollments')
        .select('course:courses!inner(id, title, description, subject)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .is('course.archived_at', null)

    if (!data) {
        return []
    }

    // Supabase's generated types infer a !inner-embedded to-one
    // relation as an array (it can't see the FK cardinality from here),
    // but at runtime it's always a single object for a many-to-one
    // embed like this — hence the cast rather than a real array type.
    return (data as unknown as { course: EnrolledCourse }[])
        .map((row) => row.course)
        .filter(Boolean)
}

// This student's enrolled courses that an admin has archived. Same
// shape as getMyArchivedCourses on the teacher side — still fully
// readable, just moved off the main list/dashboard.
export async function getMyArchivedEnrolledCourses(): Promise<EnrolledCourse[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('enrollments')
        .select('course:courses!inner(id, title, description, subject)')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .not('course.archived_at', 'is', null)

    if (!data) {
        return []
    }

    return (data as unknown as { course: EnrolledCourse }[])
        .map((row) => row.course)
        .filter(Boolean)
}
