import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCourseWithLessons } from '@/features/lessons/actions/lessons'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

// Shows one course, its lessons, and its quizzes. If the course does
// not exist, or does not belong to this teacher, shows a normal 404
// page instead of leaking that it exists.
export default async function CourseDetailPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const result = await getCourseWithLessons(courseId)

    if (!result) {
        notFound()
    }

    const { course, lessons } = result

    const user = await requireRole(['teacher'])
    const supabase = await createClient()
    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title, is_published')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    return (
        <div>
            <p className="text-label-md uppercase tracking-wide text-graphite">
                {course.subject || 'Course'}
            </p>
            <div className="flex items-center justify-between mt-2 mb-8">
                <h1 className="text-display-xs text-ink">{course.title}</h1>
                <div className="flex gap-3">
                    <Link
                        href={`/teacher/courses/${courseId}/quizzes/new`}
                        className="h-11 px-6 flex items-center rounded-button border border-hairline font-medium"
                    >
                        New Quiz
                    </Link>
                    <Link
                        href={`/teacher/courses/${courseId}/lessons/new`}
                        className="h-11 px-6 flex items-center rounded-button bg-ink text-white font-medium"
                    >
                        New Lesson
                    </Link>
                </div>
            </div>

            {course.description && (
                <p className="text-body-md text-graphite mb-8">{course.description}</p>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Lessons</h2>
            {lessons.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center mb-8">
                    <p className="text-body-md text-graphite">
                        This course has no lessons yet.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 mb-8">
                    {lessons.map((lesson) => (
                        <Link
                            key={lesson.id}
                            href={`/teacher/courses/${courseId}/lessons/${lesson.id}`}
                            className="bg-white rounded-hero shadow-card-lift p-6 flex items-center justify-between hover:bg-cloud"
                        >
                            <span className="text-body-emphasis text-ink">{lesson.title}</span>
                            <span
                                className={
                                    lesson.is_published
                                        ? 'text-caption-md text-success'
                                        : 'text-caption-md text-graphite'
                                }
                            >
                                {lesson.is_published ? 'Published' : 'Draft'}
                            </span>
                        </Link>
                    ))}
                </div>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Quizzes</h2>
            {!quizzes || quizzes.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center">
                    <p className="text-body-md text-graphite">
                        This course has no quizzes yet.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {quizzes.map((quiz) => (
                        <Link
                            key={quiz.id}
                            href={`/teacher/courses/${courseId}/quizzes/${quiz.id}/edit`}
                            className="bg-white rounded-hero shadow-card-lift p-6 flex items-center justify-between hover:bg-cloud"
                        >
                            <span className="text-body-emphasis text-ink">{quiz.title}</span>
                            <span
                                className={
                                    quiz.is_published
                                        ? 'text-caption-md text-success'
                                        : 'text-caption-md text-graphite'
                                }
                            >
                                {quiz.is_published ? 'Published' : 'Draft'}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}