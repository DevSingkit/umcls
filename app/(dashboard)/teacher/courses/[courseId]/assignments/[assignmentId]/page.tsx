import { notFound } from 'next/navigation'
import { getAssignment } from '@/features/assignments/actions/assignments'
import { listSubmissionsForAssignment } from '@/features/assignments/actions/submissions'
import { SubmissionsGradeList } from '@/features/assignments/components/SubmissionsGradeList'

export default async function AssignmentDetailPage({
    params,
}: {
    params: Promise<{ courseId: string; assignmentId: string }>
}) {
    const { assignmentId } = await params
    const assignment = await getAssignment(assignmentId)

    if (!assignment) {
        notFound()
    }

    const rows = await listSubmissionsForAssignment(assignmentId)
    const instructions = assignment.instructions as { body?: string } | null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mt-2 mb-4">{assignment.title}</h1>
            <p className="text-caption text-text-secondary mb-8">
                {assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleString()}` : 'No due date'}
                {' · '}Max {assignment.max_score}
                {' · '}Passing {assignment.passing_score}
                {assignment.allow_late && ' · Late submissions allowed'}
            </p>

            {instructions?.body && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <p className="text-body-md text-ink whitespace-pre-wrap">{instructions.body}</p>
                </div>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Submissions</h2>
            <SubmissionsGradeList rows={rows} maxScore={assignment.max_score} />
        </div>
    )
}