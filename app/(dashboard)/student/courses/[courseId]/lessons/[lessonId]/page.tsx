import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'

// Shows the lesson content to a student. Only works if the lesson is
// published and the student is enrolled in that course. Both checks
// already happen inside getLesson.
export default async function StudentLessonViewPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
}) {
    const { lessonId } = await params
    const result = await getLesson(lessonId)

    if (!result) {
        notFound()
    }

    const { lesson, course } = result
    const content = lesson.content as { type: string; body: string } | null

    return (
        <div className="max-w-2xl">
            <p className="text-label-md uppercase tracking-wide text-graphite">
                {course?.title}
            </p>
            <h1 className="text-display-xs text-ink mt-2 mb-8">{lesson.title}</h1>

            <div className="bg-white rounded-hero shadow-card-lift p-8">
                <p className="text-body-md text-ink whitespace-pre-wrap">
                    {content?.body}
                </p>
            </div>
        </div>
    )
}