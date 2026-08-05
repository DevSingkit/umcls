'use server'
// Simplify-lesson actions. A student can open this anytime, not gated
// by quiz failure (unlike the removed reteach feature). Teacher
// generates via Gemini in a chosen language, reviews/edits, then
// publishes; student reads the published version in their preferred
// language. RLS in 045_lesson_simplifications.sql enforces who can
// read/write, but we re-check role/ownership here too per
// AUTH_NOTES.md — same pattern as materials.ts/lesson-comments.ts.
//
// As of migration 067, a lesson can have up to two simplification
// rows: one English, one Tagalog (unique on lesson_id + language).
// Every read/write below is scoped by BOTH lesson_id and language —
// scoping by lesson_id alone would silently touch or return the wrong
// row now that two can exist for the same lesson.
import { requireRole, requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { generateSimplifiedLesson, AiGenerationError, type SimplifyLanguage } from '@/lib/ai/provider'
import { aiRateLimit } from '@/lib/security/rate-limit'

export type SimplifyActionResult = { ok: true } | { ok: false; error: string }

function isValidLanguage(language: string): language is SimplifyLanguage {
    return language === 'english' || language === 'tagalog'
}

// Generates a simplified version of a lesson via Gemini, in the given
// language, and writes it as an unpublished draft. Teacher must own
// the lesson's course. Overwrites any existing draft for this exact
// lesson + language pair — the other language's row (if any) is left
// untouched.
export async function generateSimplifiedLessonForTeacher(
    lessonId: string,
    language: SimplifyLanguage
): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])

    if (!isValidLanguage(language)) {
        return { ok: false, error: 'Invalid language.' }
    }

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
            language,
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
                language,
                content: result.output.content,
                is_published: false,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'lesson_id,language' }
        )

    if (upsertError) {
        return { ok: false, error: 'Generated content could not be saved. Please try again.' }
    }

    return { ok: true }
}

// Teacher edits the draft/published content directly (manual touch-up
// after generation, or a fully hand-written simplification), for one
// specific language version.
export async function editSimplifiedLesson(
    lessonId: string,
    language: SimplifyLanguage,
    content: string
): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])

    if (!isValidLanguage(language)) {
        return { ok: false, error: 'Invalid language.' }
    }
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

    const { data: updated, error } = await supabase
        .from('lesson_simplifications')
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)
        .eq('language', language)
        .select('id')

    if (error || !updated || updated.length === 0) {
        return { ok: false, error: 'Could not save changes. Please try again.' }
    }

    return { ok: true }
}

export async function publishSimplifiedLesson(
    lessonId: string,
    language: SimplifyLanguage
): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])

    if (!isValidLanguage(language)) {
        return { ok: false, error: 'Invalid language.' }
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

    const { data: updated, error } = await supabase
        .from('lesson_simplifications')
        .update({ is_published: true, updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)
        .eq('language', language)
        .select('id')

    if (error || !updated || updated.length === 0) {
        return { ok: false, error: 'Could not publish. Please try again.' }
    }

    return { ok: true }
}

export async function unpublishSimplifiedLesson(
    lessonId: string,
    language: SimplifyLanguage
): Promise<SimplifyActionResult> {
    const user = await requireRole(['teacher'])

    if (!isValidLanguage(language)) {
        return { ok: false, error: 'Invalid language.' }
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

    const { data: updated, error } = await supabase
        .from('lesson_simplifications')
        .update({ is_published: false, updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)
        .eq('language', language)
        .select('id')

    if (error || !updated || updated.length === 0) {
        return { ok: false, error: 'Could not unpublish. Please try again.' }
    }

    return { ok: true }
}

// Teacher view: sees BOTH language versions (if they exist) regardless
// of publish state, so they can review each before publishing. Returns
// an array instead of a single row now, keyed by language.
export async function getSimplifiedLessonsForTeacher(lessonId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return []
    }

    const { data, error } = await supabase
        .from('lesson_simplifications')
        .select('id, language, content, is_published, created_at, updated_at')
        .eq('lesson_id', lessonId)
        .is('deleted_at', null)
        .order('language', { ascending: true })

    if (error) {
        return []
    }
    return data
}

// Student view: published content only, in the requested language,
// checked server-side too (not just relying on RLS), same as
// get-reteach-lesson-for-student.ts used to do. Returns null if that
// language isn't published, not found, or the student isn't
// enrolled/active — the UI shows a plain "not available in this
// language yet" message rather than an error in that case.
export async function getSimplifiedLessonForStudent(lessonId: string, language: SimplifyLanguage) {
    const user = await requireUser()

    if (!isValidLanguage(language)) {
        return null
    }

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
        .select('id, language, content, updated_at')
        .eq('lesson_id', lessonId)
        .eq('language', language)
        .eq('is_published', true)
        .is('deleted_at', null)
        .maybeSingle()

    if (error) {
        return null
    }
    return data
}

// Lightweight check for which languages are actually published for a
// lesson, so the student-facing toggle can grey out / disable a
// language that has nothing to show yet, instead of the student
// picking it and hitting an empty state with no context.
export async function getAvailableSimplifyLanguages(lessonId: string): Promise<SimplifyLanguage[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('lesson_simplifications')
        .select('language')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .is('deleted_at', null)

    if (error || !data) {
        return []
    }
    return data.map((row) => row.language as SimplifyLanguage)
}
