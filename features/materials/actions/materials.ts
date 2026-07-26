'use server'
// Material upload/list/delete for PH3-003. Files go to the 'materials'
// Supabase Storage bucket; metadata is tracked in public.materials.
// MIME type and size are checked here AND at the bucket level
// (see supabase/migrations/..._materials_storage_bucket.sql) — same
// "check it in two places" reasoning as AUTH_NOTES.md.
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE_BYTES = 40 * 1024 * 1024 // 40 MB

const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'audio/mpeg',
    'video/mp4',
])

export type UploadMaterialResult =
    | { ok: true }
    | { ok: false; error: string }

// Uploads a file as a material attached to a course (and optionally a
// specific lesson within it). Teacher must own the course.
export async function uploadMaterial(
    courseId: string,
    lessonId: string | null,
    formData: FormData
): Promise<UploadMaterialResult> {
    const user = await requireRole(['teacher'])
    const file = formData.get('file')

    if (!(file instanceof File) || file.size === 0) {
        return { ok: false, error: 'Please choose a file to upload.' }
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return {
            ok: false,
            error: 'That file type is not allowed. Allowed: PDF, DOC/DOCX, JPEG/PNG, MP3, MP4.',
        }
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { ok: false, error: 'File is too large. Max size is 40 MB.' }
    }

    const supabase = await createClient()

    // Confirm this teacher owns the course before writing anything.
    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'Course not found.' }
    }

    // If a lesson id was given, confirm it actually belongs to this course.
    if (lessonId) {
        const { data: lesson } = await supabase
            .from('lessons')
            .select('id')
            .eq('id', lessonId)
            .eq('course_id', courseId)
            .single()

        if (!lesson) {
            return { ok: false, error: 'Lesson not found in this course.' }
        }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${courseId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
        return { ok: false, error: 'Upload failed. Please try again.' }
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
        // Roll back the storage upload so we don't leave an orphaned
        // file with no matching row.
        await supabase.storage.from('materials').remove([storagePath])
        return { ok: false, error: 'Could not save file record. Please try again.' }
    }

    return { ok: true }
}

// Attaches an external cloud link (Google Drive, YouTube, etc.) as a
// material, instead of an uploaded file. Requires the 026 migration
// that makes storage_path nullable and adds external_url.
export async function addMaterialLink(
    courseId: string,
    lessonId: string | null,
    formData: FormData
): Promise<UploadMaterialResult> {
    const user = await requireRole(['teacher'])
    const url = formData.get('url')
    const label = formData.get('label')

    if (typeof url !== 'string' || url.trim().length === 0) {
        return { ok: false, error: 'Please enter a link.' }
    }

    let parsed: URL
    try {
        parsed = new URL(url.trim())
    } catch {
        return { ok: false, error: 'That doesn\'t look like a valid URL.' }
    }
    if (parsed.protocol !== 'https:') {
        return { ok: false, error: 'Links must use https://.' }
    }

    const supabase = await createClient()

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .single()

    if (!course) {
        return { ok: false, error: 'Course not found.' }
    }

    if (lessonId) {
        const { data: lesson } = await supabase
            .from('lessons')
            .select('id')
            .eq('id', lessonId)
            .eq('course_id', courseId)
            .single()

        if (!lesson) {
            return { ok: false, error: 'Lesson not found in this course.' }
        }
    }

    const { error } = await supabase.from('materials').insert({
        course_id: courseId,
        lesson_id: lessonId,
        uploaded_by: user.id,
        file_name: typeof label === 'string' && label.trim() ? label.trim() : parsed.hostname,
        file_type: 'text/url',
        external_url: parsed.toString(),
    })

    if (error) {
        return { ok: false, error: 'Could not save the link. Please try again.' }
    }

    return { ok: true }
}

// Works for teacher (own course) or student (enrolled + active).
export async function listMaterials(courseId: string, lessonId?: string | null) {
    const supabase = await createClient()

    let query = supabase
        .from('materials')
        .select('id, file_name, file_type, file_size_bytes, storage_path, external_url, lesson_id, created_at')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (lessonId) {
        query = query.eq('lesson_id', lessonId)
    }

    const { data, error } = await query
    if (error) {
        return []
    }
    return data
}

// Returns a temporary signed URL for downloading/viewing a material.
// Bucket is private, so this is required rather than a public URL.
export async function getMaterialDownloadUrl(materialId: string) {
    const supabase = await createClient()
    const { data: material } = await supabase
        .from('materials')
        .select('storage_path, external_url')
        .eq('id', materialId)
        .is('deleted_at', null)
        .single()

    if (!material) {
        return null
    }

    if (material.external_url) {
        return material.external_url
    }

    if (!material.storage_path) {
        return null
    }

    const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(material.storage_path, 60 * 5) // 5 minutes

    if (error) {
        return null
    }
    return data.signedUrl
}

// Soft-deletes a material. Teacher must own the course it belongs to.
//
// Fixed 2026-07-12: previously used an embedded `courses!inner(teacher_id)`
// join and never checked that query's `error` — if the join failed for any
// reason (RLS interaction, PostgREST relationship ambiguity since materials
// can reach courses both directly via course_id and indirectly via
// lesson_id -> lessons -> course_id, etc.), `data` came back null and this
// function silently returned { ok: false } with zero diagnostic info. That
// was the actual cause behind the "Remove doesn't work" report — the button
// wasn't broken, this function was failing silently every time.
//
// Rewritten to use a separate ownership query instead, matching the pattern
// already used successfully in uploadMaterial/addMaterialLink above, and to
// return a real error string so failures are visible instead of silent.
export async function deleteMaterial(materialId: string): Promise<{ ok: boolean; error?: string }> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: material, error: materialError } = await supabase
        .from('materials')
        .select('id, course_id, storage_path, external_url')
        .eq('id', materialId)
        .is('deleted_at', null)
        .single()

    if (materialError || !material) {
        return { ok: false, error: 'Material not found.' }
    }

    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', material.course_id)
        .eq('teacher_id', user.id)
        .single()

    if (courseError || !course) {
        return { ok: false, error: 'You do not have permission to delete this material.' }
    }

    // Uses delete_material() RPC instead of a direct table UPDATE — see
    // migration 036 for why. materials_update_teacher's RLS with_check
    // was rejecting this UPDATE even with a verified-correct auth
    // context; this RPC performs the same ownership check explicitly
    // and updates the row itself under SECURITY DEFINER.
    const { data: deleted, error: deleteError } = await supabase
        .rpc('delete_material', { p_material_id: materialId })

    if (deleteError) {
        return { ok: false, error: `Could not delete material: ${deleteError.message}` }
    }

    if (!deleted) {
        return { ok: false, error: 'You do not have permission to delete this material.' }
    }

    // Best-effort remove from storage too; the soft-delete on the row
    // is what actually matters for access control going forward.
    // Nothing to remove for link-type materials.
    if (material.storage_path) {
        await supabase.storage.from('materials').remove([material.storage_path])
    }

    return { ok: true }
}