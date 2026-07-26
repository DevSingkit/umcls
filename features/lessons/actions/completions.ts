'use server'
// Marks a lesson as completed by the logged in student, once they've
// scrolled through enough of it (see LessonReader.tsx for the 90%
// threshold that triggers this). See AUTH_NOTES.md for why we check
// enrollment here even though RLS also enforces it on the insert.
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type MarkLessonCompleteResult =
    | { ok: true; alreadyCompleted: boolean }
    | { ok: false }

export async function markLessonComplete(lessonId: string): Promise<MarkLessonCompleteResult> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    // Confirm this is a real, published lesson in a published course
    // before doing anything else.
    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, is_published, courses!inner(is_published)')
        .eq('id', lessonId)
        .single()

    if (!lesson || !lesson.is_published || !(lesson as any).courses.is_published) {
        return { ok: false }
    }

    // Confirm the student is actively enrolled in that course.
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', lesson.course_id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) {
        return { ok: false }
    }

    // Real upsert now that lesson_completions has a unique constraint on
    // (lesson_id, student_id) — see migration 034. ignoreDuplicates
    // means a second completion attempt is a no-op at the DB level
    // instead of racing a separate check-then-insert. This also means
    // we can no longer tell from the write alone whether this was a
    // fresh completion or a repeat, so we check first (cheap, single
    // indexed lookup) purely to report alreadyCompleted accurately to
    // the caller — not for correctness of the write itself.
    const { data: existing } = await supabase
        .from('lesson_completions')
        .select('id')
        .eq('lesson_id', lessonId)
        .eq('student_id', user.id)
        .maybeSingle()

    const { error } = await supabase
        .from('lesson_completions')
        .upsert(
            { lesson_id: lessonId, student_id: user.id },
            { onConflict: 'lesson_id,student_id', ignoreDuplicates: true }
        )

    if (error) {
        return { ok: false }
    }

    // The student course page (progress bar, per-lesson "Completed"
    // tag) is a server component and was likely already rendered/
    // cached before this write happened. Without this, the write
    // succeeds but the page keeps showing stale data until some
    // unrelated navigation happens to force a refetch.
    revalidatePath(`/student/courses/${lesson.course_id}`)

    return { ok: true, alreadyCompleted: !!existing }
}
