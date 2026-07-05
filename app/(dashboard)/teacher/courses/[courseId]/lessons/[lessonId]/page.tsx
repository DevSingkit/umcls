import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { PublishToggle } from '@/features/lessons/components/PublishToggle'

// Shows the lesson content. A teacher sees a publish or unpublish
// button here too. A student only sees the content, and only if the
// lesson is published and they are enrolled in that course.
export default async function LessonViewPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
}) {
    const { courseId, lessonId } = await params
    const result = await getLesson(lessonId)

    if (!result) {
        notFound()
    }

    const { lesson, course } = result
    const user = await getCurrentUser()
    const content = lesson.content as { type: string; body: string } | null

    return (
        <div className="max-w-2xl">
            <p className="text-label-md uppercase tracking-wide text-graphite">
                {course?.title}
            </p>
            <div className="flex items-center justify-between mt-2 mb-8">
                <h1 className="text-display-xs text-ink">{lesson.title}</h1>
                {user?.role === 'teacher' && (
                    <PublishToggle
                        lessonId={lesson.id}
                        courseId={courseId}
                        isPublished={lesson.is_published}
                    />
                )}
            </div>

            <div className="bg-white rounded-hero shadow-card-lift p-8">
                <p className="text-body-md text-ink whitespace-pre-wrap">
                    {content?.body}
                </p>
            </div>
        </div>
    )
}