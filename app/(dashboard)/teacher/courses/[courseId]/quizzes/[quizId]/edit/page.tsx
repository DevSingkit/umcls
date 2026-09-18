import { notFound } from 'next/navigation'
import { getQuizForTeacher } from '@/features/quizzes/actions/create-quiz'
import { AddQuestionForm } from '@/features/quizzes/components/AddQuestionForm'
import { QuizSettingsForm } from '@/features/quizzes/components/QuizSettingsForm'
import { QuestionCard } from '@/features/quizzes/components/QuestionCard'
import { QuizTitleField } from '@/features/quizzes/components/QuizTitleField'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

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
            <h1 className="text-h1 text-ink mb-6">Edit Quiz</h1>

            <div className="mb-2">
                <QuizTitleField quizId={quiz.id} initialTitle={quiz.title} />
            </div>
            <p className="text-caption text-text-secondary mb-6">
                {questions.length === 0
                    ? 'No questions yet — add your first one below.'
                    : `${questions.length} question${questions.length === 1 ? '' : 's'} drafted`}
            </p>
            {questions.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-8 bg-surface rounded-md border border-hairline p-4">
                    
                    <Link
                        href={`/teacher/courses/${courseId}/quizzes/${quiz.id}/attempts`}
                        className="h-11 px-5 flex items-center rounded-md border-2 border-hairline text-body-md font-semibold text-ink hover:bg-surface-sunken transition-colors"
                    >
                        Attempts
                    </Link>
                </div>
            )}

            {questions.length > 0 && (
                <div className="space-y-4 mb-8">
                    {questions.map((question, index) => (
                        <QuestionCard key={question.id} question={question} index={index} quizId={quiz.id} />
                    ))}
                </div>
            )}

            <AddQuestionForm quizId={quiz.id} />

            <div className="mt-8">
                <QuizSettingsForm
                    quizId={quiz.id}
                    courseId={courseId}
                    currentTimeLimitMinutes={quiz.time_limit_minutes}
                    currentMaxAttempts={quiz.max_attempts}
                    currentAvailableUntil={quiz.available_until}
                    currentAllowLate={quiz.allow_late}
                    totalQuestions={questions.length}
                    currentVisibility={quiz.show_results_after}
                    isPublished={quiz.is_published}
                />
            </div>
        </div>
    )
}
