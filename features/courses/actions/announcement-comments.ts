'use server'
// features/courses/actions/announcement-comments.ts
//
// Mirrors features/lessons/actions/lesson-comments.ts's exact
// interface shape (postLessonComment(lessonId, formData),
// deleteLessonComment(commentId)) — inferred from CommentsTab.tsx's
// calls, not guessed independently, so a shared/renamed CommentsTab
// component (or a near-identical sibling) can call either pair with
// the same calling convention.

import { z } from 'zod'
import { requireRole, getCurrentUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

const postCommentSchema = z.object({
    body: z.string().trim().min(1).max(2000),
})

export type PostAnnouncementCommentResult = { ok: true } | { ok: false; error: string }

export async function postAnnouncementComment(
    announcementId: string,
    formData: FormData
): Promise<PostAnnouncementCommentResult> {
    const user = await getCurrentUser()
    if (!user) {
        return { ok: false, error: 'Not signed in.' }
    }

    const parsed = postCommentSchema.safeParse({ body: formData.get('body') })
    if (!parsed.success) {
        return { ok: false, error: 'Write something before posting.' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('announcement_comments')
        .insert({ announcement_id: announcementId, author_id: user.id, body: parsed.data.body })

    if (error) {
        return { ok: false, error: 'Could not post your comment. Please try again.' }
    }

    return { ok: true }
}

export type DeleteAnnouncementCommentResult = { ok: true } | { ok: false; error: string }

export async function deleteAnnouncementComment(commentId: string): Promise<DeleteAnnouncementCommentResult> {
    await requireRole(['student', 'teacher'])
    const supabase = await createClient()

    // Same soft-delete-via-update pattern as lesson_comments — RLS's
    // "Authors delete their own announcement comment" policy (or the
    // teacher-moderation policy) is what actually enforces who can do
    // this; a plain UPDATE that touches nothing just means "not
    // allowed," reported below.
    const { data: updated, error } = await supabase
        .from('announcement_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not delete this comment: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'You do not have permission to delete this comment.' }
    }

    return { ok: true }
}
