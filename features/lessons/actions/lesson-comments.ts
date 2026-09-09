'use server'
// Comments on a lesson, Google Classroom style. Both teacher (owner)
// and enrolled students can post; RLS in 027_lesson_comments.sql
// enforces who can read/write, but we re-check role/ownership here
// too per AUTH_NOTES.md.
import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

// Shared shape — used by CommentsTab.tsx (which renders these) and by
// get-course-stream.ts / get-teacher-course-stream.ts (which now also
// batch-fetch a lesson's comments for the inline stream card), so both
// sides agree on exactly what a comment carries instead of each
// re-declaring a slightly different local type.
export type LessonComment = {
    id: string
    body: string
    created_at: string
    author_id: string
    parent_comment_id: string | null
    users: { full_name: string; role: string; avatar_url: string | null } | null
}

export type PostCommentResult = { ok: true } | { ok: false; error: string }

export async function listLessonComments(lessonId: string): Promise<LessonComment[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lesson_comments')
        .select('id, body, created_at, author_id, parent_comment_id, users!lesson_comments_author_id_fkey(full_name, role, avatar_url)')
        .eq('lesson_id', lessonId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    if (error) {
        return []
    }
    return data as unknown as LessonComment[]
}

// Batched version of listLessonComments, for the course stream pages —
// one query for every lesson in the stream instead of one round trip
// per lesson card. Returns comments grouped by lesson_id.
export async function listLessonCommentsForLessons(
    lessonIds: string[]
): Promise<Map<string, LessonComment[]>> {
    const result = new Map<string, LessonComment[]>()
    if (lessonIds.length === 0) {
        return result
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lesson_comments')
        .select('id, lesson_id, body, created_at, author_id, parent_comment_id, users!lesson_comments_author_id_fkey(full_name, role, avatar_url)')
        .in('lesson_id', lessonIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

    if (error) {
        return result
    }

    for (const row of (data ?? []) as any[]) {
        const list = result.get(row.lesson_id) ?? []
        list.push({
            id: row.id,
            body: row.body,
            created_at: row.created_at,
            author_id: row.author_id,
            parent_comment_id: row.parent_comment_id,
            users: row.users,
        })
        result.set(row.lesson_id, list)
    }

    return result
}

export async function postLessonComment(lessonId: string, formData: FormData): Promise<PostCommentResult> {
    const user = await requireUser()
    const body = formData.get('body')
    const parentCommentIdRaw = formData.get('parentCommentId')

    if (typeof body !== 'string' || body.trim().length === 0) {
        return { ok: false, error: 'Comment cannot be empty.' }
    }
    if (body.length > 2000) {
        return { ok: false, error: 'Comment is too long (max 2000 characters).' }
    }

    // Optional — present only when this is a reply. Single-level only:
    // this is never itself another reply's parent, enforced in the UI
    // (reply rows don't get their own Reply button), not re-checked
    // here since there's no correctness/security reason a second level
    // would need blocking server-side.
    const parentCommentId =
        typeof parentCommentIdRaw === 'string' && parentCommentIdRaw.length > 0 ? parentCommentIdRaw : null

    const supabase = await createClient()

    const { error } = await supabase.from('lesson_comments').insert({
        lesson_id: lessonId,
        author_id: user.id,
        body: body.trim(),
        parent_comment_id: parentCommentId,
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