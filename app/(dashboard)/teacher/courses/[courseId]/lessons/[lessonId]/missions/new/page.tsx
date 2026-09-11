// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/missions/new/page.tsx
//
// NOTE: no actual quizzes/new/page.tsx was provided to mirror, so this
// wrapper is a reasonable inference from Next.js App Router
// conventions used elsewhere in this tree (server component, params
// destructured, ownership enforced via requireRole + the lesson query
// below), not a verified match to house convention. Flag if the real
// quiz "new" page does something different (e.g. a shared layout,
// breadcrumb component, or loading state) so this can be brought in
// line.
//
// DESIGN-LMS 2.1 PASS: text-heading-lg replaced with text-h1 — that
// token doesn't exist in tailwind.config.ts (same invalid-token bug
// fixed on the mission gameplay page earlier this track). This is a
// Classroom Mode authoring page, so no Fredoka — matches the
// text-h1 page-title pattern already used on EditAssignmentForm.tsx.
//
// DOUBLE BACK BUTTON FIX (2026-08-31): this page rendered its own
// <BackButton /> on top of AppShell.tsx's own back button. Read
// AppShell.tsx directly to confirm the actual mechanism (an earlier
// comment on the sibling edit/page.tsx guessed at a [missionId]-scoped
// layout by elimination, without ever reading this file) — the real
// rule is simpler and broader than that guess: AppShell.tsx computes
// showBackButton as "true for any path that isn't an EXACT match
// against NAV_ITEMS[role]'s primary destinations." A deep nested route
// like this one (.../missions/new) never matches a primary nav path,
// so the shell ALWAYS renders a back button here — for this route and
// for every other non-primary route in the app, not something scoped
// to [missionId] specifically. This page's own BackButton was
// therefore a genuine duplicate. Removed, along with its now-unused
// import — the shell's back button alone is left, matching how every
// other non-primary route already behaves without needing a page-level
// BackButton of its own.

import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { NewMissionForm } from '@/features/missions/components/NewMissionForm'

export default async function NewMissionPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
}) {
    const { courseId, lessonId } = await params
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, title, course_id, courses!inner(teacher_id, title)')
        .eq('id', lessonId)
        .eq('course_id', courseId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        notFound()
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
            <div>
                <h1 className="text-h1 text-ink">New mission</h1>
                <p className="text-body-md text-text-secondary">
                    {(lesson as any).courses.title} — {lesson.title}
                </p>
            </div>
            <NewMissionForm courseId={courseId} lessonId={lessonId} />
        </div>
    )
}
