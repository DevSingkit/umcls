'use server'
// These are the actions for course creation and listing (PH3-001).
// A teacher can only see and edit their own courses. RLS on the
// database also enforces this, but we still check the role here too,
// same reasoning as AUTH_NOTES.md.

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const createCourseSchema = z.object({
    title: z.string().min(2, 'Title is too short'),
    description: z.string().optional(),
    subject: z.string().optional(),
})

export type CreateCourseResult =
    | { ok: true }
    | { ok: false; error: string }

// Creates a new course owned by the logged in teacher.
export async function createCourse(formData: FormData): Promise<CreateCourseResult> {
    const user = await requireRole(['teacher'])

    const parsed = createCourseSchema.safeParse({
        title: formData.get('title'),
        description: formData.get('description'),
        subject: formData.get('subject'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { title, description, subject } = parsed.data
    const supabase = await createClient()

    const { error } = await supabase.from('courses').insert({
        teacher_id: user.id,
        title,
        description: description || null,
        subject: subject || null,
    })

    if (error) {
        return { ok: false, error: 'Could not create the course. Please try again.' }
    }

    redirect('/teacher/courses')
}

// Returns only the courses belonging to the logged in teacher.
export async function getMyCourses() {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, subject, is_published, created_at')
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        return []
    }

    return data
}