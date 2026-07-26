'use server'
// Actions for lesson creation and listing (PH3-002, simplified for V1).
// A teacher can only add lessons to a course they own. We check that
// here in addition to RLS, same reasoning as AUTH_NOTES.md.
//
// Lesson creation and materials attachment happen in one single-submit
// form now (non-technical-user-friendly — no multi-step navigation).
// Materials can only ever be attached at this moment; there is no
// later "add material to an existing lesson" flow.

import { z } from 'zod'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024 // 40 MB, same limit as materials.ts

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4',
])

const createLessonSchema = z.object({
    courseId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
    content: z.string().min(1, 'Lesson content cannot be empty'),
})

export type CreateLessonResult =
    | { ok: true }
    | { ok: false; error: string }

// Creates a new lesson inside a course the teacher owns, then attaches
// any files and links submitted in the same form. Best-effort on the
// materials: if the lesson itself is created successfully but a
// material fails, that failure is surfaced in the error but the lesson
// is NOT rolled back — the teacher can see what happened and the
// lesson still exists (they just can't add materials later, so it's
// reported clearly here).
export async function createLesson(formData: FormData): Promise<CreateLessonResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = createLessonSchema.safeParse({
        courseId: formData.get('courseId'),
        title: formData.get('title'),
        content: formData.get('content'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { courseId, title, content } = parsed.data

    // Confirm this teacher actually owns the course before adding a lesson to it.
    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this course.' }
    }

    // Validate all files and links up front, before creating anything,
    // so a bad attachment doesn't leave a lesson with half its
    // materials missing.
    const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
    for (const file of files) {
        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return {
                ok: false,
                error: `"${file.name}" is not an allowed file type. Allowed: PDF, DOC/DOCX, JPEG/PNG, MP3, MP4.`,
            }
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return { ok: false, error: `"${file.name}" is too large. Max size is 40 MB.` }
        }
    }

    const linkLabels = formData.getAll('linkLabel').map((v) => (typeof v === 'string' ? v : ''))
    const linkUrls = formData.getAll('linkUrl').map((v) => (typeof v === 'string' ? v : ''))
    const links: { label: string; url: string }[] = []
    for (let i = 0; i < linkUrls.length; i++) {
        const rawUrl = linkUrls[i]?.trim()
        if (!rawUrl) continue // empty link rows are just skipped, not errors
        let parsedUrl: URL
        try {
            parsedUrl = new URL(rawUrl)
        } catch {
            return { ok: false, error: `"${rawUrl}" doesn't look like a valid URL.` }
        }
        if (parsedUrl.protocol !== 'https:') {
            return { ok: false, error: 'Links must use https://.' }
        }
        links.push({ label: linkLabels[i]?.trim() || parsedUrl.hostname, url: parsedUrl.toString() })
    }

    // Plain text content wrapped in a simple shape for now. A richer
    // editor can replace this later without changing how it is stored.
    const { data: newLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
            course_id: courseId,
            title,
            content: { type: 'text', body: content },
        })
        .select('id')
        .single()

    if (lessonError || !newLesson) {
        return { ok: false, error: 'Could not create the lesson. Please try again.' }
    }

    const lessonId = newLesson.id
    const materialErrors: string[] = []

    for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${courseId}/${crypto.randomUUID()}-${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('materials')
            .upload(storagePath, file, { contentType: file.type, upsert: false })

        if (uploadError) {
            materialErrors.push(`Could not upload "${file.name}".`)
            continue
        }

        const { error: insertError } = await supabase.from('materials').insert({
            course_id: courseId,
            lesson_id: lessonId,
            uploaded_by: user.id,
            file_name: file.name,
            file_type: file.type,
            file_size_bytes: file.size,
            storage_path: storagePath,
        })

        if (insertError) {
            await supabase.storage.from('materials').remove([storagePath])
            materialErrors.push(`Could not save file record for "${file.name}".`)
        }
    }

    for (const link of links) {
        const { error: linkError } = await supabase.from('materials').insert({
            course_id: courseId,
            lesson_id: lessonId,
            uploaded_by: user.id,
            file_name: link.label,
            file_type: 'text/url',
            external_url: link.url,
        })

        if (linkError) {
            materialErrors.push(`Could not save link "${link.label}".`)
        }
    }

    if (materialErrors.length > 0) {
        // Lesson was created successfully; only some materials failed.
        // Report it, but don't block navigation — the teacher can't
        // retry materials later anyway, so keep them informed here.
        return {
            ok: false,
            error: `Lesson created, but some materials could not be added: ${materialErrors.join(' ')}`,
        }
    }

    redirect(`/teacher/courses/${courseId}`)
}

// Fetches one lesson for editing — teacher-owned only. Separate from
// getLesson() in get-lesson.ts, which handles both roles' read paths;
// this is teacher-edit-specific and always includes course_id for the
// ownership check on save.
export async function getLessonForEdit(lessonId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, title, content')
        .eq('id', lessonId)
        .is('deleted_at', null)
        .single()

    if (!lesson) {
        return null
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', lesson.course_id)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return null
    }

    return lesson
}

const updateLessonSchema = z.object({
    lessonId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
    content: z.string().min(1, 'Lesson content cannot be empty'),
})

export type UpdateLessonResult = { ok: true } | { ok: false; error: string }

export async function updateLesson(formData: FormData): Promise<UpdateLessonResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = updateLessonSchema.safeParse({
        lessonId: formData.get('lessonId'),
        title: formData.get('title'),
        content: formData.get('content'),
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' }
    }

    const { lessonId, title, content } = parsed.data

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id')
        .eq('id', lessonId)
        .is('deleted_at', null)
        .single()

    if (!lesson) {
        return { ok: false, error: 'Lesson not found.' }
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', lesson.course_id)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this lesson.' }
    }

    const { error } = await supabase
        .from('lessons')
        .update({ title, content: { type: 'text', body: content } })
        .eq('id', lessonId)

    if (error) {
        // Same RLS-WITH-CHECK-rejects-valid-owner issue documented for
        // materials/lessons deletes — if this starts failing the same
        // way, it'll need the same SECURITY DEFINER RPC workaround.
        return { ok: false, error: `Could not save changes: ${error.message}` }
    }

    return { ok: true }
}

// Returns the course details plus all its lessons, only if the logged
// in teacher owns that course.
export async function getCourseWithLessons(courseId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, description, subject, is_published')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return null
    }

    const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title, is_published, order_index')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    return { course, lessons: lessons ?? [] }
}
