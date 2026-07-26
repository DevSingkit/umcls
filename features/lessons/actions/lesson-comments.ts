'use server'
// Comments on a lesson, Google Classroom style. Both teacher (owner)
// and enrolled students can post; RLS in 027_lesson_comments.sql
// enforces who can read/write, but we re-check role/ownership here
// too per AUTH_NOTES.md.
import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

export type PostCommentResult = { ok: true } | { ok: false; error: string }

export async function listLessonComments(lessonId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lesson_comments')
        .select('id, body, created_at, author_id, users!lesson_comments_author_id_fkey(full_name, role)')
        .eq('lesson_id', lessonId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    if (error) {
        return []
    }
    return data
}

export async function postLessonComment(lessonId: string, formData: FormData): Promise<PostCommentResult> {
    const user = await requireUser()
    const body = formData.get('body')

    if (typeof body !== 'string' || body.trim().length === 0) {
        return { ok: false, error: 'Comment cannot be empty.' }
    }
    if (body.length > 2000) {
        return { ok: false, error: 'Comment is too long (max 2000 characters).' }
    }

    const supabase = await createClient()

    const { error } = await supabase.from('lesson_comments').insert({
        lesson_id: lessonId,
        author_id: user.id,
        body: body.trim(),
    })

    if (error) {
        return { ok: false, error: 'Could not post comment. You may not have access to this lesson.' }
    }

    return { ok: true }
}

// Deletes a comment. A student can delete their own; a teacher can
// delete their own OR moderate any comment on a lesson in their course.
export async function deleteLessonComment(commentId: string): Promise<{ ok: boolean }> {
    const user = await requireUser()
    const supabase = await createClient()

    const { data: comment } = await supabase
        .from('lesson_comments')
        .select('id, author_id, lesson_id, lessons!inner(course_id, courses!inner(teacher_id))')
        .eq('id', commentId)
        .single()

    if (!comment) {
        return { ok: false }
    }

    const isAuthor = comment.author_id === user.id
    const isOwningTeacher = (comment as any).lessons.courses.teacher_id === user.id

    if (!isAuthor && !isOwningTeacher) {
        return { ok: false }
    }

    const { error } = await supabase
        .from('lesson_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)

    if (error) {
        return { ok: false }
    }

    return { ok: true }
}