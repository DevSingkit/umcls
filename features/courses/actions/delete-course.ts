'use server'
// Soft-deletes a course. Kept as its own file rather than added to
// courses.ts, since courses.ts's current contents weren't in hand when
// this was written — avoids guessing at or clobbering existing code
// there. Feel free to move this into courses.ts later if you'd rather
// keep all course actions in one file.

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type DeleteCourseResult = { ok: true } | { ok: false; error: string }

export async function deleteCourse(courseId: string): Promise<DeleteCourseResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .single()

    if (!course) {
        return { ok: false, error: 'Course not found.' }
    }

    const { error } = await supabase
        .from('courses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', courseId)

    if (error) {
        return { ok: false, error: 'Could not delete the course. Please try again.' }
    }

    redirect('/teacher/courses')
}
