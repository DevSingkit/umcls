import { notFound } from 'next/navigation'
import { getQuizForTeacher } from '@/features/quizzes/actions/create-quiz'
import { AddQuestionForm } from '@/features/quizzes/components/AddQuestionForm'
import { PassingScoreSetting } from '@/features/quizzes/components/PassingScoreSetting'
import { TimeLimitSetting } from '@/features/quizzes/components/TimeLimitSetting'
import { QuizDeadlineSetting } from '@/features/quizzes/components/QuizDeadlineSetting'
import { ResultsVisibilitySetting } from '@/features/quizzes/components/ResultsVisibilitySetting'
import { GradingComponentSetting } from '@/features/quizzes/components/GradingComponentSetting'
import { QuestionCard } from '@/features/quizzes/components/QuestionCard'
import { PostQuizButton } from '@/features/quizzes/components/PostQuizButton'
import { QuizTitleField } from '@/features/quizzes/components/QuizTitleField'
import Link from 'next/link'

// FIX: this page was serving stale question data after adding a
// question, even though addQuestion's insert succeeded and
// router.refresh() was firing correctly. Root cause: the Supabase
// client's select() calls go over fetch() internally, and Next.js can
// cache fetch() responses (its Data Cache) independently of whether
// the route itself is dynamically rendered — those are two separate
// caching layers. Being dynamic (this route already is, since
// requireRole() reads cookies) does not by itself force every fetch()
// inside the render to skip that cache. The two exports below force
// every fetch issued during this page's render, including the ones
// Supabase's client makes invisibly, to bypass Next's Data Cache
// entirely, so a question added a moment ago is always reflected on
// the very next render.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// Shows the quiz being built, Google Forms-style: each saved question
// is a card showing the question text and its options, with the
// correct one marked. The "add question" form is pinned at the bottom
// as the next card, followed by the Post button — the quiz stays a
// draft (is_published defaults to false, migration 051) until the
// teacher explicitly posts it here.
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
                <QuizTitleField quizId={quiz.id} initialTitle={quiz.title} />
                <p className="text-caption text-text-secondary mt-1">
                    {questions.length === 0
                        ? 'No questions yet — add your first one below.'
                        : `${questions.length} question${questions.length === 1 ? '' : 's'} drafted`}
                </p>
            </div>

            <div className="space-y-6 mb-6">
                <GradingComponentSetting
                    quizId={quiz.id}
                    currentGradingComponent={quiz.grading_component}
                />

                <TimeLimitSetting quizId={quiz.id} currentTimeLimitMinutes={quiz.time_limit_minutes} />

                <QuizDeadlineSetting
                    quizId={quiz.id}
                    currentAvailableUntil={quiz.available_until}
                    currentAllowLate={quiz.allow_late}
                />

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

            <div className="mt-8">
                <PostQuizButton
                    quizId={quiz.id}
                    isPublished={quiz.is_published}
                    hasQuestions={questions.length > 0}
                />
            </div>
        </div>
    )
}
