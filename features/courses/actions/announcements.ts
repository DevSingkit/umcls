'use server'
// features/courses/actions/announcements.ts
//
// Phase 3.8: announcement CRUD. Only a teacher can create/delete an
// announcement (confirmed with user — students read + comment, never
// post the announcement itself). Ownership double-checked in
// application code before the query, same AUTH_NOTES.md convention
// used everywhere else in this app (RLS enforces it too, but the
// explicit check gives a clean error message instead of a silent
// zero-rows RLS filter).

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type AnnouncementAuthor = {
    full_name: string
    role: string
    avatar_url: string | null
}

export type AnnouncementComment = {
    id: string
    body: string
    created_at: string
    author_id: string
    users: { full_name: string; role: string } | null
}

export type Announcement = {
    id: string
    courseId: string
    body: string
    createdAt: string
    authorId: string
    authorName: string
    comments: AnnouncementComment[]
}

const postAnnouncementSchema = z.object({
    body: z.string().trim().min(1, 'Write something before posting.').max(5000),
})

export type PostAnnouncementResult = { ok: true; announcementId: string } | { ok: false; error: string }

export async function postAnnouncement(courseId: string, formData: FormData): Promise<PostAnnouncementResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = postAnnouncementSchema.safeParse({ body: formData.get('body') })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check your announcement.' }
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('teacher_id', user.id)
        .is('deleted_at', null)
        .single()

    if (!course) {
        return { ok: false, error: 'You do not have access to this course.' }
    }

    const { data: announcement, error } = await supabase
        .from('announcements')
        .insert({ course_id: courseId, author_id: user.id, body: parsed.data.body })
        .select('id')
        .single()

    if (error || !announcement) {
        return { ok: false, error: 'Could not post the announcement. Please try again.' }
    }

    return { ok: true, announcementId: announcement.id }
}

export type DeleteAnnouncementResult = { ok: true } | { ok: false; error: string }

// PHASE 3.8b ADDITION (2026-08-28, new conversation continuing the
// same project): editAnnouncement was a known gap flagged in the prior
// session's handoff — announcements.updated_at existed in the schema
// from the start but nothing wrote to it. Closed here. Same
// ownership-via-RLS pattern as deleteAnnouncement below (a plain
// UPDATE that touches zero rows means "not allowed," not a thrown
// error) rather than a separate explicit ownership SELECT first —
// consistent with how deleteAnnouncement already does it.
const editAnnouncementSchema = z.object({
    body: z.string().trim().min(1, 'Write something before saving.').max(5000),
})

export type EditAnnouncementResult = { ok: true } | { ok: false; error: string }

export async function editAnnouncement(announcementId: string, formData: FormData): Promise<EditAnnouncementResult> {
    await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = editAnnouncementSchema.safeParse({ body: formData.get('body') })
    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check your announcement.' }
    }

    const { data: updated, error } = await supabase
        .from('announcements')
        .update({ body: parsed.data.body, updated_at: new Date().toISOString() })
        .eq('id', announcementId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save changes: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'You do not have permission to edit this announcement.' }
    }

    return { ok: true }
}

export async function deleteAnnouncement(announcementId: string): Promise<DeleteAnnouncementResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    // Soft-delete via plain UPDATE — same working pattern as
    // lesson_comments (migration 027), not the SECURITY DEFINER RPC
    // workaround migration 048 needed for lessons/quizzes/assignments'
    // specifically-buggy *_update policies. See migration 088's header
    // note for the reasoning.
    const { data: updated, error } = await supabase
        .from('announcements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', announcementId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not delete this announcement: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'You do not have permission to delete this announcement.' }
    }

    return { ok: true }
}

// Batched fetch of announcements + their comments for a course,
// shared by both get-course-stream.ts and get-teacher-course-stream.ts
// so the two never independently re-derive this shape and risk
// disagreeing (same convention as this project's reuse of
// getMissionsForStudent elsewhere). Comments are fetched eagerly here,
// not on-demand when a student expands a card client-side — matching
// the existing lesson_comments precedent (CommentsTab.tsx already
// receives a fully-loaded `comments` array as a prop, not something it
// fetches itself), not introducing a new fetch-on-expand pattern.
export async function listAnnouncementsForCourse(courseId: string): Promise<Announcement[]> {
    const supabase = await createClient()

    const { data: announcements } = await supabase
        .from('announcements')
        .select('id, course_id, body, created_at, author_id, users!announcements_author_id_fkey(full_name)')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    const announcementIds = (announcements ?? []).map((a) => a.id)

    const { data: comments } =
        announcementIds.length === 0
            ? { data: [] as any[] }
            : await supabase
                  .from('announcement_comments')
                  .select('id, announcement_id, body, created_at, author_id, users!announcement_comments_author_id_fkey(full_name, role)')
                  .in('announcement_id', announcementIds)
                  .is('deleted_at', null)
                  .order('created_at', { ascending: true })

    const commentsByAnnouncementId = new Map<string, AnnouncementComment[]>()
    for (const c of comments ?? []) {
        const list = commentsByAnnouncementId.get(c.announcement_id) ?? []
        list.push({
            id: c.id,
            body: c.body,
            created_at: c.created_at,
            author_id: c.author_id,
            users: c.users,
        })
        commentsByAnnouncementId.set(c.announcement_id, list)
    }

    return (announcements ?? []).map((a: any) => ({
        id: a.id,
        courseId: a.course_id,
        body: a.body,
        createdAt: a.created_at,
        authorId: a.author_id,
        authorName: a.users?.full_name ?? 'Teacher',
        comments: commentsByAnnouncementId.get(a.id) ?? [],
    }))
}
