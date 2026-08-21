import { NewAssignmentForm } from '@/features/assignments/components/NewAssignmentForm'

export default async function NewAssignmentPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-6">New Assignment</h1>
            <NewAssignmentForm courseId={courseId} />
        </div>
    )
}