'use server'
// Lets an admin enroll a student into a course. Required for V1 per
// VERSION_ROADMAP.md, since a student cannot see any course otherwise.

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

export async function enrollStudent(formData: FormData): Promise<EnrollResult> {
    const admin = await requireRole(['admin'])
    const supabase = await createClient()

    const parsed = enrollSchema.safeParse({
        studentId: formData.get('studentId'),
        courseId: formData.get('courseId'),
    })

    if (!parsed.success) {
        return { ok: false, error: 'Please choose a student and a course.' }
    }

    const { studentId, courseId } = parsed.data

    const { error } = await supabase.from('enrollments').insert({
        student_id: studentId,
        course_id: courseId,
        enrolled_by: admin.id,
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

// Gets every active student, for the dropdown.
export async function getStudents() {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'student')
        .eq('is_active', true)
        .order('full_name')

    return data ?? []
}

// Gets every course, for the dropdown.
export async function getAllCourses() {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('courses')
        .select('id, title')
        .is('deleted_at', null)
        .order('title')

    return data ?? []
}