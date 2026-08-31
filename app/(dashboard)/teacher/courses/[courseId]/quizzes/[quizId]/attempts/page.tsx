import { notFound } from 'next/navigation'
import { listAttemptsForQuiz } from '@/features/quizzes/actions/grade-short-answer'
import { AttemptsList } from '@/features/quizzes/components/AttemptsList'

// DESIGN-LMS 2.1 PASS: removed font-heading from title (Classroom
// Mode, Fredoka is Mission-Mode-only).
export default async function QuizAttemptsPage({
    params,
}: {
    params: Promise<{ courseId: string; quizId: string }>
}) {
    const { courseId, quizId } = await params
    const attempts = await listAttemptsForQuiz(quizId)

    if (!attempts) {
        notFound()
    }

    return (
        <div className="max-w-2xl">
            <h1 className="text-h1 text-ink mb-8">Attempts</h1>
            <AttemptsList attempts={attempts} courseId={courseId} quizId={quizId} />
        </div>
    )
}
