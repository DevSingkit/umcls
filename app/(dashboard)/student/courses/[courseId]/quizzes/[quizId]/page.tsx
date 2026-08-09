import { notFound } from 'next/navigation'
import { getQuizForStudent, getQuizOverviewForStudent } from '@/features/quizzes/actions/get-quiz-for-student'
import { TakeQuizForm } from '@/features/quizzes/components/TakeQuizForm'

export default async function QuizDetailsPage({
    params,
}: {
    params: Promise<{ courseId: string; quizId: string }>
}) {
    const { courseId, quizId } = await params

    let overview
    try {
        overview = await getQuizOverviewForStudent(quizId)
    } catch {
        notFound()
    }

    const { quiz, latestAttempt, canStartNewAttempt } = overview

    const shouldShowTakeForm =
        !latestAttempt || latestAttempt.status === 'in_progress'

    if (shouldShowTakeForm) {
        const fullQuiz = await getQuizForStudent(quizId)
        return <TakeQuizForm quiz={fullQuiz} courseId={courseId} />
    }

    const isPendingGrading = latestAttempt.status === 'submitted'
    const scoreHidden = latestAttempt.score === null

    return (
        <div className="max-w-2xl">
            <h1 className="font-heading text-h1 text-ink mb-2">{quiz.title}</h1>
            {quiz.description && (
                <p className="text-body-md text-text-secondary mb-8">{quiz.description}</p>
            )}

            <div className="bg-surface rounded-md shadow-card p-6 mb-6">
                {isPendingGrading && (
                    <p className="text-body-emphasis text-ink mb-2">
                        Submitted &mdash; waiting on your teacher to finish grading.
                    </p>
                )}

                {!isPendingGrading && scoreHidden && (
                    <p className="text-body-emphasis text-ink mb-2">
                        Submitted. Your teacher hasn&apos;t made results visible yet.
                    </p>
                )}

                {!scoreHidden && (
                    <p className="font-heading text-h1 text-ink mb-1">
                        {latestAttempt.score} <span className="text-h2 text-text-secondary">/ {latestAttempt.maxScore}</span>
                    </p>
                )}
            </div>

            {latestAttempt.questionResults.length > 0 && (
                <div className="grid gap-2 mb-6">
                    {latestAttempt.questionResults.map((r, i) => (
                        <div
                            key={r.questionId}
                            className="flex items-center justify-between bg-surface rounded-md border border-hairline px-4 py-3"
                        >
                            <span className="text-caption text-text-secondary">Question {i + 1}</span>
                            {r.isCorrect === undefined ? (
                                <span className="inline-flex items-center rounded-pill bg-hairline px-3 py-1 text-caption font-semibold text-text-secondary">
                                    Not shown
                                </span>
                            ) : (
                                <span
                                    className={`inline-flex items-center rounded-pill px-3 py-1 text-caption font-semibold ${r.isCorrect ? 'bg-success-soft text-success' : 'bg-error-soft text-error'
                                        }`}
                                >
                                    {r.isCorrect ? 'Correct' : 'Try again next time'}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canStartNewAttempt && (
                <p className="text-caption text-text-secondary">
                    You have another attempt available.
                </p>
            )}
        </div>
    )
}