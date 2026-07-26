import { notFound } from 'next/navigation'
import { getQuizForTeacher } from '@/features/quizzes/actions/create-quiz'
import { QuizPreviewForm } from '@/features/quizzes/components/QuizPreviewForm'

// Teacher-only quiz preview (PH4-001b). Reuses getQuizForTeacher (same
// ownership check as the edit page) but strips is_correct before
// handing questions to the client — a preview should look exactly like
// what a student sees, not an answer-key view.
export default async function QuizPreviewPage({
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

    const previewQuestions = questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: (q.answer_options ?? []).map((o: { id: string; option_text: string }) => ({
            id: o.id,
            option_text: o.option_text,
        })),
    }))

    return (
        <QuizPreviewForm
            quiz={{
                id: quiz.id,
                title: quiz.title,
                description: null,
                passing_score: quiz.passing_score,
                time_limit_minutes: quiz.time_limit_minutes,
                questions: previewQuestions,
            }}
        />
    )
}