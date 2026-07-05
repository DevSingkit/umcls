import { notFound } from 'next/navigation'
import { getQuizForTeacher } from '@/features/quizzes/actions/create-quiz'
import { AddQuestionForm } from '@/features/quizzes/components/AddQuestionForm'
import { PublishQuizToggle } from '@/features/quizzes/components/PublishQuizToggle'
import { PassingScoreSetting } from '@/features/quizzes/components/PassingScoreSetting'
import { QuestionCard } from '@/features/quizzes/components/QuestionCard'

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
    const { quizId } = await params
    const result = await getQuizForTeacher(quizId)

    if (!result) {
        notFound()
    }

    const { quiz, questions } = result

    return (
        <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-display-xs text-ink">{quiz.title}</h1>
                    <p className="text-caption-md text-graphite mt-1">
                        {questions.length === 0
                            ? 'No questions yet — add your first one below.'
                            : `${questions.length} question${questions.length === 1 ? '' : 's'} drafted`}
                    </p>
                </div>
                {questions.length > 0 && (
                    <PublishQuizToggle quizId={quiz.id} isPublished={quiz.is_published} />
                )}
            </div>

            {questions.length > 0 && (
                <PassingScoreSetting
                    quizId={quiz.id}
                    totalQuestions={questions.length}
                    currentPassingScore={quiz.passing_score}
                />
            )}

            {questions.length > 0 && (
                <div className="mb-6 grid gap-4">
                    {questions.map((question: any, index: number) => (
                        <QuestionCard key={question.id} question={question} index={index} />
                    ))}
                </div>
            )}

            <AddQuestionForm quizId={quiz.id} />
        </div>
    )
}