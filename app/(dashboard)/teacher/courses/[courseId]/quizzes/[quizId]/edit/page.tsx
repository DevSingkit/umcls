import { notFound } from 'next/navigation'
import { getQuizForTeacher } from '@/features/quizzes/actions/create-quiz'
import { AddQuestionForm } from '@/features/quizzes/components/AddQuestionForm'
import { QuizSettingsForm } from '@/features/quizzes/components/QuizSettingsForm'
import { QuestionCard } from '@/features/quizzes/components/QuestionCard'
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
// as the next card, followed by the settings/post form.
//
// 2026-08-19: PostQuizButton removed — posting is now handled by
// QuizSettingsForm's single "Save & Post" button (see that
// component's own comment). A quiz's actual creation (title + first
// question) also no longer happens on this page at all — it now
// requires an existing quiz, created via
// /teacher/courses/[courseId]/quizzes/new, so this page is reached
// only once real content already exists.
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
            <h1 className="font-heading text-h1 text-ink mb-6">Edit Quiz</h1>

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
