import { getQuizForStudent } from '@/features/quizzes/actions/get-quiz-for-student'
import { TakeQuizForm } from '@/features/quizzes/components/TakeQuizForm'

// Loads the quiz using the same action that already keeps the answer
// key hidden, then shows the take quiz form.
export default async function TakeQuizPage({
    params,
}: {
    params: Promise<{ courseId: string; quizId: string }>
}) {
    const { courseId, quizId } = await params
    const quiz = await getQuizForStudent(quizId)

    return <TakeQuizForm quiz={quiz} courseId={courseId} />
}