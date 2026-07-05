import { NewQuizForm } from '@/features/quizzes/components/NewQuizForm'

// Reads which course this quiz belongs to, then shows the form.
export default async function NewQuizPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params

    return <NewQuizForm courseId={courseId} />
}