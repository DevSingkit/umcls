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
        .select('id, title, subject')
        .is('deleted_at', null)
        .order('title')

    return data ?? []
}

export type StudentEnrollment = {
    enrollmentId: string
    courseId: string
    title: string
    subject: string | null
}

// Gets a single student's active enrollments, for the "view info /
// unenroll" panel on the admin user list. Course title + subject only
// — this is a lightweight lookup for an admin action, not the course
// detail view.
export async function getStudentEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data } = await supabase
        .from('enrollments')
        .select('id, course_id, status, courses(title, subject, deleted_at)')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false })

    return (data ?? [])
        .filter((e: any) => e.courses && e.courses.deleted_at === null)
        .map((e: any) => ({
            enrollmentId: e.id as string,
            courseId: e.course_id as string,
            title: e.courses.title as string,
            subject: (e.courses.subject as string | null) ?? null,
        }))
}

export type UnenrollResult = { ok: true } | { ok: false; error: string }

// Unenrolls a student from a course. Marks the enrollment 'dropped'
// (dropped_at set) rather than deleting the row — same soft-removal
// reasoning as everything else in this codebase, and it matches the
// status/dropped_at columns the enrollments table already has for
// exactly this.
export async function unenrollStudent(enrollmentId: string): Promise<UnenrollResult> {
    await requireRole(['admin'])
    const supabase = await createClient()

    const { data: updated, error } = await supabase
        .from('enrollments')
        .update({ status: 'dropped', dropped_at: new Date().toISOString() })
        .eq('id', enrollmentId)
        .eq('status', 'active')
        .select('id')

    if (error) {
        return { ok: false, error: 'Could not unenroll the student. Please try again.' }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'This enrollment was not found or is already dropped.' }
    }

    return { ok: true }
}