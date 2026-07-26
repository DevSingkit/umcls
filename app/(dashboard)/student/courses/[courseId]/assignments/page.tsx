import { notFound } from 'next/navigation'
import { getAssignment } from '@/features/assignments/actions/assignments'
import { getMySubmission } from '@/features/assignments/actions/submissions'
import { SubmissionUploadForm } from '@/features/assignments/components/SubmissionUploadForm'

export default async function StudentAssignmentPage({
    params,
}: {
    params: Promise<{ courseId: string; assignmentId: string }>
}) {
    const { assignmentId } = await params
    const assignment = await getAssignment(assignmentId)

    if (!assignment || !assignment.is_published) {
        notFound()
    }

    const existing = await getMySubmission(assignmentId)
    const instructions = assignment.instructions as { body?: string } | null

    const isPastDue = assignment.due_at ? new Date() > new Date(assignment.due_at) : false

    return (
        <div className="max-w-2xl">
            <h1 className="font-heading text-h1 text-ink mb-2">{assignment.title}</h1>
            <p className="text-caption text-text-secondary mb-8">
                {assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleString()}` : 'No due date'}
                {' · '}Worth {assignment.max_score} points
            </p>

            {instructions?.body && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <p className="text-body-md text-ink whitespace-pre-wrap">{instructions.body}</p>
                </div>
            )}

            {isPastDue && (
                <p className="text-caption text-error mb-4">
                    This one&apos;s past due, but don&apos;t worry — go ahead and turn it in whenever you&apos;re ready.
                </p>
            )}
            <SubmissionUploadForm assignmentId={assignmentId} maxScore={assignment.max_score} existing={existing} />
        </div>
    )
}