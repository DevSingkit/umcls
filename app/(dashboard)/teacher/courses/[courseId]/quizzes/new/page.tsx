import { requireRole } from '@/lib/auth/get-current-user'
import { NewQuizForm } from '@/features/quizzes/components/NewQuizForm'

// app/(dashboard)/teacher/courses/[courseId]/quizzes/new/page.tsx
//
// Replaces the old flow (CreateMenu → createDraftQuiz → redirect to
// /quizzes/[quizId]/edit). No quiz exists yet at this URL — the title
// and first question are collected here, client-side, and only once
// both are valid does createQuizWithFirstQuestion write anything to
// the database (see that function's comment in create-quiz.ts for
// why: the old flow inserted an empty draft the instant the button
// was clicked, which showed up in the course stream with no content).
export default async function NewQuizPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    await requireRole(['teacher'])

    return (
        <div className="max-w-2xl">
            <h1 className="font-heading text-h1 text-ink mb-2">Create Quiz</h1>
            <p className="text-caption text-text-secondary mb-6">
                Add a title and your first question to create this quiz. You can add more
                questions and change settings once it's created.
            </p>

            <NewQuizForm courseId={courseId} />
        </div>
    )
}
