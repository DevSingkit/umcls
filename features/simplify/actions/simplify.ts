'use server'
// Simplify-lesson actions. A student can open this anytime, not gated
// by quiz failure (unlike the removed reteach feature). Teacher
// generates via Gemini, reviews/edits, then publishes; student reads
// the published version only. RLS in 045_lesson_simplifications.sql
// enforces who can read/write, but we re-check role/ownership here too
// per AUTH_NOTES.md — same pattern as materials.ts/lesson-comments.ts.
import { requireRole, requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { generateSimplifiedLesson, AiGenerationError } from '@/lib/ai/provider'
import { aiRateLimit } from '@/lib/security/rate-limit'

export type SimplifyActionResult = { ok: true } | { ok: false; error: string }

// Generates a simplified version of a lesson via Gemini and writes it
// as an unpublished draft. Teacher must own the lesson's course.
// Overwrites any existing draft for this lesson (one row per lesson,
// see the unique constraint on lesson_id).
export async function generateSimplifiedLessonForTeacher(lessonId: string): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, content, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .is('deleted_at', null)
        .single()

    if (lessonError || !lesson || (lesson as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'Lesson not found.' }
    }

    const { success: withinLimit } = await aiRateLimit.limit(user.id)
    if (!withinLimit) {
        return { ok: false, error: 'AI generation limit reached. Please try again later.' }
    }

    const lessonContent = (lesson.content as { body?: string } | null)?.body ?? ''
    if (!lessonContent.trim()) {
        return { ok: false, error: 'This lesson has no content to simplify yet.' }
    }

    let result
    try {
        result = await generateSimplifiedLesson({
            lessonTitle: lesson.title,
            lessonContent,
        })
    } catch (err) {
        await supabase.from('ai_generation_logs').insert({
            requested_by: user.id,
            lesson_id: lessonId,
            provider: 'gemini',
            generation_mode: 'simplify',
            status: 'error',
            error_message: err instanceof AiGenerationError ? err.message : 'Unknown error',
        })
        return { ok: false, error: 'Could not generate a simplified lesson. Please try again.' }
    }

    await supabase.from('ai_generation_logs').insert({
        requested_by: user.id,
        lesson_id: lessonId,
        model: result.model,
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        provider: 'gemini',
        generation_mode: 'simplify',
        status: 'success',
    })

    const { error: upsertError } = await supabase
        .from('lesson_simplifications')
        .upsert(
            {
                lesson_id: lessonId,
                content: result.output.content,
                is_published: false,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'lesson_id' }
        )

    if (upsertError) {
        return { ok: false, error: 'Generated content could not be saved. Please try again.' }
    }

    return { ok: true }
}

// Teacher edits the draft/published content directly (manual touch-up
// after generation, or a fully hand-written simplification).
export async function editSimplifiedLesson(lessonId: string, content: string): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])

    if (content.trim().length === 0) {
        return { ok: false, error: 'Content cannot be empty.' }
    }
    if (content.length > 4000) {
        return { ok: false, error: 'Content is too long (max 4000 characters).' }
    }

    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'Lesson not found.' }
    }

    const { error } = await supabase
        .from('lesson_simplifications')
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)

    if (error) {
        return { ok: false, error: 'Could not save changes. Please try again.' }
    }

    return { ok: true }
}

export async function publishSimplifiedLesson(lessonId: string): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'Lesson not found.' }
    }

    const { error } = await supabase
        .from('lesson_simplifications')
        .update({ is_published: true, updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)

    if (error) {
        return { ok: false, error: 'Could not publish. Please try again.' }
    }

    return { ok: true }
}

export async function unpublishSimplifiedLesson(lessonId: string): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'Lesson not found.' }
    }

    const { error } = await supabase
        .from('lesson_simplifications')
        .update({ is_published: false, updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)

    if (error) {
        return { ok: false, error: 'Could not unpublish. Please try again.' }
    }

    return { ok: true }
}

// Teacher view: sees the draft/published content regardless of
// publish state, so they can review before publishing.
export async function getSimplifiedLessonForTeacher(lessonId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return null
    }

    const { data, error } = await supabase
        .from('lesson_simplifications')
        .select('id, content, is_published, created_at, updated_at')
        .eq('lesson_id', lessonId)
        .is('deleted_at', null)
        .maybeSingle()

    if (error) {
        return null
    }
    return data
}

// Student view: published content only, checked server-side too (not
// just relying on RLS), same as get-reteach-lesson-for-student.ts used
// to do. Returns null if not published, not found, or student isn't
// enrolled/active.
export async function getSimplifiedLessonForStudent(lessonId: string) {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id')
        .eq('id', lessonId)
        .is('deleted_at', null)
        .single()

    if (!lesson) {
        return null
    }

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', lesson.course_id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

    if (!enrollment) {
        return null
    }

    const { data, error } = await supabase
        .from('lesson_simplifications')
        .select('id, content, updated_at')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .maybeSingle()

    if (error) {
        return null
    }
    return data
}
