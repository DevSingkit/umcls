import { notFound } from 'next/navigation'
import { getAttemptForGrading } from '@/features/quizzes/actions/grade-short-answer'
import { ShortAnswerGradeList } from '@/features/quizzes/components/ShortAnswerGradeList'

// DESIGN-LMS 2.1 PASS: removed font-heading from student-name title
// (Classroom Mode, Fredoka is Mission-Mode-only).
export default async function GradeAttemptPage({
    params,
}: {
    params: Promise<{ courseId: string; quizId: string; attemptId: string }>
}) {
    const { attemptId } = await params
    const result = await getAttemptForGrading(attemptId)

    if (!result) {
        notFound()
    }

    const { attempt, responses } = result

    return (
        <div className="max-w-2xl">
            <p className="text-caption text-text-secondary">{attempt.quizTitle}</p>
            <h1 className="text-h1 text-ink mb-2">{attempt.studentName}</h1>
            <p className="text-caption text-text-secondary mb-8">
                {attempt.status === 'graded' ? `Final score: ${attempt.score}` : 'Awaiting short-answer grading'}
            </p>

            {responses.length === 0 ? (
                <div className="bg-surface rounded-md border border-hairline p-8 text-center">
                    <p className="text-body-md text-text-secondary">
                        This attempt has no short-answer questions.
                    </p>
                </div>
            ) : (
                <ShortAnswerGradeList attemptId={attempt.id} responses={responses} />
            )}
        </div>
    )
}
