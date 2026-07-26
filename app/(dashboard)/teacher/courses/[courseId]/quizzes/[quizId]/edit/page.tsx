import { notFound } from 'next/navigation'
import { getQuizForTeacher } from '@/features/quizzes/actions/create-quiz'
import { AddQuestionForm } from '@/features/quizzes/components/AddQuestionForm'
import { PassingScoreSetting } from '@/features/quizzes/components/PassingScoreSetting'
import { TimeLimitSetting } from '@/features/quizzes/components/TimeLimitSetting'
import { ResultsVisibilitySetting } from '@/features/quizzes/components/ResultsVisibilitySetting'
import { QuestionCard } from '@/features/quizzes/components/QuestionCard'
import Link from 'next/link'

// Shows the quiz being built, Google Forms-style: each saved question
// is a card showing the question text and its options, with the
// correct one marked. The "add question" form is pinned at the bottom
// as the next card. Publish button appears once there is at least one
// question.
export default async function QuizEditPage({
    params,
}: {
    params: Promise<{ courseId: string; quizId: string }>
}) {
    const { courseId, quizId } = await params
    const result = await getQuizForTeacher(quizId)

    if (!result) {
        notFound()
    }

    const { quiz, questions } = result

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="font-heading text-h1 text-ink">{quiz.title}</h1>
                <p className="text-caption text-text-secondary mt-1">
                    {questions.length === 0
                        ? 'No questions yet — add your first one below.'
                        : `${questions.length} question${questions.length === 1 ? '' : 's'} drafted`}
                </p>
            </div>

            <div className="space-y-6 mb-6">
                <TimeLimitSetting quizId={quiz.id} currentTimeLimitMinutes={quiz.time_limit_minutes} />

                {questions.length > 0 && (
                    <PassingScoreSetting
                        quizId={quiz.id}
                        totalQuestions={questions.length}
                        currentPassingScore={quiz.passing_score}
                    />
                )}

                <ResultsVisibilitySetting quizId={quiz.id} currentVisibility={quiz.show_results_after} />
            </div>

            {questions.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-8 bg-surface rounded-md border border-hairline p-4">
                    <Link
                        href={`/teacher/courses/${courseId}/quizzes/${quiz.id}/preview`}
                        className="h-11 px-5 flex items-center rounded-md border-[1.5px] border-hairline-strong text-body-md font-semibold text-ink hover:bg-surface-sunken transition-colors"
                    >
                        Preview
                    </Link>
                    <Link
                        href={`/teacher/courses/${courseId}/quizzes/${quiz.id}/attempts`}
                        className="h-11 px-5 flex items-center rounded-md border-[1.5px] border-hairline-strong text-body-md font-semibold text-ink hover:bg-surface-sunken transition-colors"
                    >
                        Attempts
                    </Link>
                </div>
            )}

            {questions.length > 0 && (
                <div className="space-y-4 mb-8">
                    {questions.map((question, index) => (
                        <QuestionCard key={question.id} question={question} index={index} />
                    ))}
                </div>
            )}

            <AddQuestionForm quizId={quiz.id} />
        </div>
    )
}
