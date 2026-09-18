// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/missions/new/page.tsx
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
