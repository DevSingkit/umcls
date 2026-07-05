import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

// Shows one course to an enrolled student, with its published lessons.
export default async function StudentCourseDetailPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()

    if (!enrollment) {
        notFound()
    }

    const { data: course } = await supabase
        .from('courses')
        .select('id, title, description, subject')
        .eq('id', courseId)
        .single()

    if (!course) {
        notFound()
    }

    const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

    const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .is('deleted_at', null)

    return (
        <div>
            <p className="text-label-md uppercase tracking-wide text-graphite">
                {course.subject || 'Course'}
            </p>
            <h1 className="text-display-xs text-ink mt-2 mb-8">{course.title}</h1>

            {course.description && (
                <p className="text-body-md text-graphite mb-8">{course.description}</p>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Lessons</h2>
            {!lessons || lessons.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center mb-8">
                    <p className="text-body-md text-graphite">
                        No lessons are available yet.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 mb-8">
                    {lessons.map((lesson) => (
                        <Link
                            key={lesson.id}
                            href={`/student/courses/${courseId}/lessons/${lesson.id}`}
                            className="bg-white rounded-hero shadow-card-lift p-6 block hover:bg-cloud"
                        >
                            <span className="text-body-emphasis text-ink">{lesson.title}</span>
                        </Link>
                    ))}
                </div>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Quizzes</h2>
            {!quizzes || quizzes.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center">
                    <p className="text-body-md text-graphite">
                        No quizzes are available yet.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {quizzes.map((quiz) => (
                        <Link
                            key={quiz.id}
                            href={`/student/courses/${courseId}/quizzes/${quiz.id}`}
                            className="bg-white rounded-hero shadow-card-lift p-6 block hover:bg-cloud"
                        >
                            <span className="text-body-emphasis text-ink">{quiz.title}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}