import { notFound } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { getAssignment } from '@/features/assignments/actions/assignments'
import { getMySubmission } from '@/features/assignments/actions/submissions'
import { listMaterials } from '@/features/materials/actions/materials'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { SubmissionUploadForm } from '@/features/assignments/components/SubmissionUploadForm'

// Rebuilt for DESIGN-LMS.md §8.10 Model B (Assignment = plain-document,
// two-column + sticky side panel) and §8.7a's icon mapping (Assignment
// = amber ClipboardList, same mapping CourseStream.tsx /
// TeacherCourseStream.tsx already use).
//
// Data-fetching is UNCHANGED — same getAssignment/getMySubmission/
// listMaterials calls. What changed: instructions + Attachments now
// live in the main (left) column, and "Your submission" — the
// SubmissionUploadForm, now in its `compact` variant — moved into a
// sticky side panel on desktop per §8.10's explicit spec ("the panel
// is the button's home now, not a stacked section"). On mobile the
// panel simply stacks below the main content in normal document flow
// (no sticky behavior), same as §8.10 requires.
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

    // Side-panel status badge — mirrors §7.3's badge set, picks the
    // single most relevant state to show at the top of the panel.
    let statusLabel = 'Assigned'
    let statusClass = 'bg-hairline text-text-secondary'
    if (submission?.status === 'returned') {
        statusLabel = `Graded: ${submission.score} / ${assignment.max_score}`
        statusClass = 'bg-info-soft text-info'
    } else if (submission) {
        statusLabel = submission.is_late ? 'Turned in — Late' : 'Turned in'
        statusClass = 'bg-brand-soft text-brand'
    } else if (isPastDue) {
        statusLabel = 'Past due'
        statusClass = 'bg-error-soft text-error'
    }

    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-soft text-amber shrink-0">
                    <ClipboardList size={16} aria-hidden="true" />
                </span>
                <span className="text-caption font-semibold text-text-secondary">Assignment</span>
            </div>

            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:items-start">
                <div>
                    <h1 className="font-heading text-h1 text-ink mb-2">{assignment.title}</h1>
                    <p className="text-caption text-text-secondary mb-6">
                        {assignment.due_at
                            ? `Due ${new Date(assignment.due_at).toLocaleString()}`
                            : 'No due date'}
                        {' · '}Max {assignment.max_score}
                        {isPastDue && !submission && (assignment.allow_late ? ' · Late submissions allowed' : '')}
                    </p>

                    {instructions?.body && (
                        <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                            <p className="text-body-md text-ink whitespace-pre-wrap">{instructions.body}</p>
                        </div>
                    )}

                    {materials.length > 0 && (
                        <div>
                            <h2 className="text-body-emphasis text-ink mb-3">Attachments</h2>
                            <MaterialList materials={materials} canDelete={false} />
                        </div>
                    )}
                </div>

                <div className="mt-6 lg:mt-0 lg:sticky lg:top-6">
                    <div className="bg-surface rounded-md shadow-card p-6 space-y-4">
                        <div>
                            <p className="text-label text-ink-soft mb-2">Your work</p>
                            <span
                                className={`inline-flex items-center rounded-pill text-caption font-semibold px-3 py-1 ${statusClass}`}
                            >
                                {statusLabel}
                            </span>
                        </div>

                        <SubmissionUploadForm
                            assignmentId={assignmentId}
                            maxScore={assignment.max_score}
                            existing={submission}
                            dueAt={assignment.due_at}
                            allowLate={assignment.allow_late}
                            compact
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
