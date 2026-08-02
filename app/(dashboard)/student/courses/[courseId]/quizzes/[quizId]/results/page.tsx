import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'

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
        .select('id, score, is_passing, status, quizzes(title, passing_score, show_results_after)')
        .eq('id', attemptId)
        .eq('student_id', user.id)
        .single()

    if (!attempt) {
        notFound()
    }

    const quiz = attempt.quizzes as unknown as {
        title: string
        passing_score: number
        show_results_after: 'immediately' | 'after_grading' | 'never'
    }

    const isFullyGraded = attempt.status === 'graded'
    const canReveal =
        quiz.show_results_after === 'immediately' ||
        (quiz.show_results_after === 'after_grading' && isFullyGraded)

    return (
        <div className="max-w-2xl mx-auto text-center py-12">
            <p className="text-label text-text-secondary">{quiz.title}</p>

            {!canReveal ? (
                <>
                    <h1 className="font-heading text-h1 text-ink mt-2 mb-8">Quiz submitted</h1>
                    <div className="bg-surface rounded-md shadow-card p-10 mb-8">
                        <p className="text-body-emphasis text-ink">
                            {quiz.show_results_after === 'never'
                                ? "Your teacher has chosen not to show quiz results."
                                : "Your score will be available once your teacher finishes grading."}
                        </p>
                    </div>
                </>
            ) : (
                <>
                    <h1 className="font-heading text-h1 text-ink mt-2 mb-8">
                        {attempt.is_passing ? 'Great job!' : "Let's practice some more"}
                    </h1>
                    <div className="bg-surface rounded-md shadow-card p-10 mb-8">
                        <p
                            className={
                                attempt.is_passing
                                    ? 'font-heading text-[3.5rem] font-extrabold leading-none text-success'
                                    : 'font-heading text-[3.5rem] font-extrabold leading-none text-error'
                            }
                        >
                            {attempt.score}
                        </p>
                        <p className="text-caption text-text-secondary mt-2">
                            {attempt.is_passing
                                ? `out of 100 — you needed ${quiz.passing_score} to pass`
                                : `out of 100 — you needed ${quiz.passing_score} to pass. You can do it!`}
                        </p>
                    </div>
                </>
            )}

            <Link
                href={`/student/courses/${courseId}`}
                className="inline-flex h-11 px-6 items-center justify-center rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover"
            >
                Back to course
            </Link>
        </div>
    )
}