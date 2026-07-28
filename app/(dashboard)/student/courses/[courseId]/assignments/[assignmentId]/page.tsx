import { notFound } from 'next/navigation'
import { getAssignment } from '@/features/assignments/actions/assignments'
import { getMySubmission } from '@/features/assignments/actions/submissions'
import { listMaterials } from '@/features/materials/actions/materials'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { SubmissionUploadForm } from '@/features/assignments/components/SubmissionUploadForm'

export default async function StudentAssignmentDetailPage({
    params,
}: {
    params: Promise<{ courseId: string; assignmentId: string }>
}) {
    const { courseId, assignmentId } = await params

    const assignment = await getAssignment(assignmentId)
    if (!assignment || !assignment.is_published) {
        notFound()
    }

    const [submission, materials] = await Promise.all([
        getMySubmission(assignmentId),
        listMaterials(courseId, { type: 'assignment', assignmentId }),
    ])

    const instructions = assignment.instructions as { body?: string } | null
    const isPastDue = assignment.due_at ? new Date(assignment.due_at).getTime() < Date.now() : false

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mt-2 mb-2">{assignment.title}</h1>
            <p className="text-caption text-text-secondary mb-8">
                {assignment.due_at
                    ? `Due ${new Date(assignment.due_at).toLocaleString()}`
                    : 'No due date'}
                {' · '}Max {assignment.max_score}
                {isPastDue && !submission && ' · Past due'}
            </p>

            {instructions?.body && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <p className="text-body-md text-ink whitespace-pre-wrap">{instructions.body}</p>
                </div>
            )}

            {materials.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-body-emphasis text-ink mb-4">Attachments</h2>
                    <MaterialList materials={materials} canDelete={false} />
                </div>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Your submission</h2>

            {submission && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-6">
                    <p className="text-body-md text-ink">{submission.file_name}</p>
                    <p className="text-caption text-text-secondary mt-1">
                        Submitted {new Date(submission.submitted_at).toLocaleString()}
                        {submission.is_late && ' · Late'}
                        {' · '}
                        {submission.status === 'graded' || submission.status === 'returned'
                            ? `Score: ${submission.score} / ${assignment.max_score}`
                            : submission.status === 'resubmitted'
                              ? 'Resubmitted — awaiting grading'
                              : 'Submitted — awaiting grading'}
                    </p>
                    {submission.feedback && (
                        <p className="text-body-md text-ink mt-3 whitespace-pre-wrap">
                            {submission.feedback}
                        </p>
                    )}
                </div>
            )}

            <SubmissionUploadForm
    assignmentId={assignmentId}
    maxScore={assignment.max_score}
    existing={submission}
/>
        </div>
    )
}
