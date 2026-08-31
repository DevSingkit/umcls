import { notFound } from 'next/navigation'
import { getAssignment } from '@/features/assignments/actions/assignments'
import { listSubmissionsForAssignment } from '@/features/assignments/actions/submissions'
import { SubmissionsGradeList } from '@/features/assignments/components/SubmissionsGradeList'
import { listMaterials } from '@/features/materials/actions/materials'
import { MaterialList } from '@/features/materials/components/MaterialList'

// DESIGN-LMS 2.1 PASS: removed font-heading from title (Classroom
// Mode, Fredoka is Mission-Mode-only); bg-amber-soft/text-amber ->
// bg-warning-soft/text-warning (dead tokens, same fix applied
// everywhere else this track).
export default async function AssignmentDetailPage({
    params,
}: {
    params: Promise<{ courseId: string; assignmentId: string }>
}) {
    const { courseId, assignmentId } = await params
    const assignment = await getAssignment(assignmentId)

    if (!assignment) {
        notFound()
    }

    const [rows, materials] = await Promise.all([
        listSubmissionsForAssignment(assignmentId),
        listMaterials(courseId, { type: 'assignment', assignmentId }),
    ])
    const instructions = assignment.instructions as { body?: string } | null

    return (
        <div>
            <div className="flex items-center gap-3 mt-2 mb-4">
                <h1 className="text-h1 text-ink">{assignment.title}</h1>
                {!assignment.is_published && (
                    <span className="inline-flex items-center rounded-pill bg-warning-soft text-warning text-caption font-semibold px-3 py-1">
                        Draft — not posted
                    </span>
                )}
            </div>
            <p className="text-caption text-text-secondary mb-8">
                {assignment.due_at ? `Due ${new Date(assignment.due_at).toLocaleString()}` : 'No due date'}
                {' · '}Max {assignment.max_score}
                {assignment.allow_late && ' · Late submissions allowed'}
            </p>

            {instructions?.body && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <p className="text-body-md text-ink whitespace-pre-wrap">{instructions.body}</p>
                </div>
            )}

            {materials.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-body-emphasis text-ink mb-4">Attachments</h2>
                    <MaterialList materials={materials} canDelete />
                </div>
            )}

            <h2 className="text-body-emphasis text-ink mb-4">Submissions</h2>
            <SubmissionsGradeList rows={rows} maxScore={assignment.max_score} />
        </div>
    )
}
