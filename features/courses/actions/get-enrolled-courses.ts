'use server'
// Gets every course a student is actively enrolled in. Used by the
// student dashboard and course list.

import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export async function getMyEnrolledCourses() {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('enrollments')
        .select('course:courses(id, title, description, subject)')
        .eq('student_id', user.id)
        .eq('status', 'active')

    if (!data) {
        return []
    }

    return data.map((row) => row.course).filter(Boolean)
}