// app/(dashboard)/teacher/courses/[courseId]/quizzes/new/page.tsx
import { requireRole } from '@/lib/auth/get-current-user'
import { NewQuizForm } from '@/features/quizzes/components/NewQuizForm'

export default async function NewQuizPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    await requireRole(['teacher'])

    return (
        <div className="max-w-2xl">
            <h1 className="text-h1 text-ink mb-6">Create Quiz</h1>

            <NewQuizForm courseId={courseId} />
        </div>
    )
}
