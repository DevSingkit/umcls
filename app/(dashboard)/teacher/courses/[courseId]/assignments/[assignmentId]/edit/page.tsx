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

    return (
        <EditAssignmentForm
            courseId={courseId}
            assignmentId={assignmentId}
            initialTitle={assignment.title}
            initialInstructions={instructions?.body ?? ''}
            initialDueAt={assignment.due_at}
            initialMaxScore={assignment.max_score}
            initialAllowLate={assignment.allow_late}
            initialIsPublished={assignment.is_published}
            initialMaterials={materials.filter((m) => m.assignment_id === assignmentId)}
        />
    )
}
