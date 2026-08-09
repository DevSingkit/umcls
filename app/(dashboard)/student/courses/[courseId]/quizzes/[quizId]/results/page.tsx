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
        .select('id, score, status, quizzes(id, title, show_results_after)')
        .eq('id', attemptId)
        .eq('student_id', user.id)
        .single()

    if (!attempt) {
        notFound()
    }

    const quiz = attempt.quizzes as unknown as {
        id: string
        title: string
        show_results_after: 'submission' | 'grading' | 'never'
    }

    // Total possible points for this quiz — sum of every question's
    // points, since quiz_attempts.score is now a raw point total
    // (e.g. "8"), not a 0-100 percentage. No pass/fail anymore either,
    // so there's nothing to compare the score against except this max.
    const { data: questions } = await supabase
        .from('questions')
        .select('points')
        .eq('quiz_id', quiz.id)

    const maxPoints = (questions ?? []).reduce((sum, q) => sum + (q.points ?? 0), 0)

    const isFullyGraded = attempt.status === 'graded'
    const canReveal =
        quiz.show_results_after === 'submission' ||
        (quiz.show_results_after === 'grading' && isFullyGraded)

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
                    <h1 className="font-heading text-h1 text-ink mt-2 mb-8">Quiz results</h1>
                    <div className="bg-surface rounded-md shadow-card p-10 mb-8">
                        <p className="font-heading text-[3.5rem] font-extrabold leading-none text-ink">
                            {attempt.score}
                            <span className="text-h2 text-text-secondary"> / {maxPoints}</span>
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