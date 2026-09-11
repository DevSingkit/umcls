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

    // BUG FIX (2026-08-03): this used to be
    //   const dueAtLocal = assignment.due_at ? assignment.due_at.slice(0, 16) : ''
    // — a naive slice of the UTC ISO string, which mislabels UTC
    // wall-clock digits as if they were the teacher's local (Manila)
    // time. That's wrong on its own (an assignment due "11:59 PM" would
    // display as "7:59 AM" the same day, or similar, depending on the
    // stored UTC value), and layered on top of the identical bug on the
    // submit side (see NewAssignmentForm.tsx's 2026-08-03 fix).
    //
    // Real UTC-to-local conversion requires knowing the actual browser
    // timezone, which a Server Component page like this one cannot see —
    // only the client can. So this page now passes the raw ISO string
    // straight through, and EditAssignmentForm (a 'use client' component)
    // does the real conversion for both display and submission.

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
