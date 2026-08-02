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
                {isPastDue && !submission && (assignment.allow_late ? ' · Past due — late submission allowed' : ' · Past due')}
            </p>

            {instructions?.body && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <p className="text-body-md text-ink whitespace-pre-wrap">{instructions.body}</p>
                </div>
            )}

            <h2 className="font-heading text-body-emphasis text-ink mb-4">Your submission</h2>

            {materials.length > 0 && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <h2 className="font-heading text-body-emphasis text-ink mb-4">Attachments</h2>
                    <MaterialList materials={materials} canDelete={false} />
                </div>
            )}

            {/*
                The submission summary card, the note field, the file
                input, and the Unsubmit button all live inside
                SubmissionUploadForm now — previously there was a
                separate, decorative <textarea id="submissionNote">
                rendered directly on this page that was never inside a
                <form> and never actually reached submitAssignment. That
                field looked functional but silently did nothing; it's
                removed here in favor of the real, wired-up note field
                inside the form component. See CHANGELOG.md 2026-08-01.
            */}
            <SubmissionUploadForm
                assignmentId={assignmentId}
                maxScore={assignment.max_score}
                existing={submission}
                dueAt={assignment.due_at}
                allowLate={assignment.allow_late}
            />
        </div>
    )
}
