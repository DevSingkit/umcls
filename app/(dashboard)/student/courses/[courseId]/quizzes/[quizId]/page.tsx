import { notFound } from 'next/navigation'
import { HelpCircle } from 'lucide-react'
import { getQuizForStudent, getQuizOverviewForStudent } from '@/features/quizzes/actions/get-quiz-for-student'
import { QuizStartGate } from '@/features/quizzes/components/QuizStartGate'

// Rebuilt for DESIGN-LMS.md §8.10 Model B (Quiz = plain-document,
// two-column + sticky side panel) and §8.7a's icon mapping (Quiz =
// info-blue HelpCircle, same mapping CourseStream.tsx /
// TeacherCourseStream.tsx already use — reused here rather than
// invented fresh).
//
// Data-fetching logic is UNCHANGED from the original — same
// getQuizOverviewForStudent/getQuizForStudent calls, same
// shouldShowTakeForm branch. Only the rendering changed: the
// "not started / in progress" branch now goes through QuizStartGate
// (Model B overview -> Start/Resume -> unmodified TakeQuizForm) instead
// of mounting TakeQuizForm immediately, and the results branch is now
// a real two-column layout instead of a single stacked column.
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

    const shouldShowTakeForm = !latestAttempt || latestAttempt.status === 'in_progress'

    const TypeHeader = (
        <div className="flex items-center gap-2 mb-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-info-soft text-info shrink-0">
                <HelpCircle size={16} aria-hidden="true" />
            </span>
            <span className="text-caption font-semibold text-text-secondary">Quiz</span>
        </div>
    )

    if (shouldShowTakeForm) {
        const fullQuiz = await getQuizForStudent(quizId)
        return (
            <div>
                {TypeHeader}
                <QuizStartGate quiz={fullQuiz} courseId={courseId} isResume={!!latestAttempt} />
            </div>
        )
    }

    const isPendingGrading = latestAttempt.status === 'submitted'
    const scoreHidden = latestAttempt.score === null

    return (
        <div>
            {TypeHeader}
            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">
                <div>
                    <h1 className="font-heading text-h1 text-ink mb-2">{quiz.title}</h1>
                    {quiz.description && (
                        <p className="text-body-md text-text-secondary mb-6">{quiz.description}</p>
                    )}

                    {latestAttempt.questionResults.length > 0 && (
                        <div className="grid gap-2">
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
                                            className={`inline-flex items-center rounded-pill px-3 py-1 text-caption font-semibold ${
                                                r.isCorrect ? 'bg-success-soft text-success' : 'bg-error-soft text-error'
                                            }`}
                                        >
                                            {r.isCorrect ? 'Correct' : 'Try again next time'}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 lg:mt-0 lg:sticky lg:top-6">
                    <div className="bg-surface rounded-md shadow-card p-6 space-y-4">
                        {isPendingGrading && (
                            <div>
                                <span className="inline-flex items-center rounded-pill bg-hairline text-text-secondary text-caption font-semibold px-3 py-1">
                                    Submitted
                                </span>
                                <p className="text-caption text-text-secondary mt-2">
                                    Waiting on your teacher to finish grading.
                                </p>
                            </div>
                        )}

                        {!isPendingGrading && scoreHidden && (
                            <div>
                                <span className="inline-flex items-center rounded-pill bg-hairline text-text-secondary text-caption font-semibold px-3 py-1">
                                    Submitted
                                </span>
                                <p className="text-caption text-text-secondary mt-2">
                                    Your teacher hasn&apos;t made results visible yet.
                                </p>
                            </div>
                        )}

                        {!scoreHidden && (
                            <div>
                                <span className="inline-flex items-center rounded-pill bg-info-soft text-info text-caption font-semibold px-3 py-1">
                                    Graded
                                </span>
                                <p className="font-heading text-h1 text-ink mt-3">
                                    {latestAttempt.score}{' '}
                                    <span className="text-h2 text-text-secondary">/ {latestAttempt.maxScore}</span>
                                </p>
                            </div>
                        )}

                        {canStartNewAttempt && (
                            <p className="text-caption text-text-secondary pt-3 border-t border-hairline">
                                You have another attempt available.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
