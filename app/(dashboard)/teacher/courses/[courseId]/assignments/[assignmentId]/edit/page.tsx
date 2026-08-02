import { notFound } from 'next/navigation'
import { getAssignmentForEdit } from '@/features/assignments/actions/assignments'
import { listMaterials } from '@/features/materials/actions/materials'
import { EditAssignmentForm } from '@/features/assignments/components/EditAssignmentForm'

export default async function EditAssignmentPage({
    params,
}: {
    params: Promise<{ courseId: string; assignmentId: string }>
}) {
    const { courseId, assignmentId } = await params
    const assignment = await getAssignmentForEdit(assignmentId)

    if (!assignment) {
        notFound()
    }

    const materials = await listMaterials(courseId, { type: 'assignment', assignmentId })

    const instructions = assignment.instructions as { body?: string } | null

    // datetime-local inputs need "YYYY-MM-DDTHH:mm", not a full ISO
    // string with seconds/timezone — trim it down if a due date exists.
    const dueAtLocal = assignment.due_at ? assignment.due_at.slice(0, 16) : ''

    return (
        <EditAssignmentForm
            courseId={courseId}
            assignmentId={assignmentId}
            initialTitle={assignment.title}
            initialInstructions={instructions?.body ?? ''}
            initialDueAt={dueAtLocal}
            initialMaxScore={assignment.max_score}
            initialPassingScore={assignment.passing_score}
            initialAllowLate={assignment.allow_late}
            initialIsPublished={assignment.is_published}
            initialMaterials={materials.filter((m) => m.assignment_id === assignmentId)}
            initialGradingComponent={assignment.grading_component}
        />
    )
}