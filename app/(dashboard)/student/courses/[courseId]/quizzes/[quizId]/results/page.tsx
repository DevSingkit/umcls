import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

// Shows the score right after a student submits a quiz. Reads the
// saved attempt instead of recomputing anything, since the score was
// already calculated once, safely, during grading.
export default async function QuizResultsPage({
    params,
    searchParams,
}: {
    params: Promise<{ courseId: string; quizId: string }>
    searchParams: Promise<{ attempt?: string }>
}) {
    const { courseId } = await params
    const { attempt: attemptId } = await searchParams

    if (!attemptId) {
        notFound()
    }

    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: attempt } = await supabase
        .from('quiz_attempts')
        .select('id, score, is_passing, quizzes(title, passing_score)')
        .eq('id', attemptId)
        .eq('student_id', user.id)
        .single()

    if (!attempt) {
        notFound()
    }

    const quiz = attempt.quizzes as unknown as { title: string; passing_score: number }

    return (
        <div className="max-w-xl mx-auto text-center py-12">
            <p className="text-label-md uppercase tracking-wide text-graphite">{quiz.title}</p>
            <h1 className="text-display-xs text-ink mt-2 mb-8">
                {attempt.is_passing ? 'You passed' : 'You did not pass'}
            </h1>

            <div className="bg-white rounded-hero shadow-card-lift p-10 mb-8">
                <p
                    className={
                        attempt.is_passing
                            ? 'text-6xl font-semibold text-success'
                            : 'text-6xl font-semibold text-error'
                    }
                >
                    {attempt.score}
                </p>
                <p className="text-caption-md text-graphite mt-2">
                    out of 100, passing score was {quiz.passing_score}
                </p>
            </div>

            <Link
                href={`/student/courses/${courseId}`}
                className="inline-block h-11 px-6 flex items-center justify-center rounded-button bg-ink text-white font-medium"
            >
                Back to course
            </Link>
        </div>
    )
}