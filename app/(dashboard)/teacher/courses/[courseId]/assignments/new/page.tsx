import { NewAssignmentForm } from '@/features/assignments/components/NewAssignmentForm'

// DESIGN-LMS 2.1 PASS: removed font-heading from title (Classroom
// Mode, Fredoka is Mission-Mode-only).
export default async function NewAssignmentPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    return (
        <div>
            <h1 className="text-h1 text-ink mb-6">New Assignment</h1>
            <NewAssignmentForm courseId={courseId} />
        </div>
    )
}
