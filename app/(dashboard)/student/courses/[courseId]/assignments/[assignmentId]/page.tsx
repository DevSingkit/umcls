import Link from 'next/link'
import { listAssignmentsForStudent } from '@/features/assignments/actions/assignments'

export default async function StudentAssignmentsPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const assignments = await listAssignmentsForStudent(courseId)

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Assignments</h1>

            {assignments.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No assignments available yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {assignments.map((a) => (
                        <Link
                            key={a.id}
                            href={`/student/courses/${courseId}/assignments/${a.id}`}
                            className="bg-surface rounded-md shadow-card p-6 flex items-center justify-between hover:shadow-card-hover"
                        >
                            <div>
                                <p className="text-body-emphasis text-ink">{a.title}</p>
                                <p className="text-caption text-text-secondary">
                                    {a.due_at ? `Due ${new Date(a.due_at).toLocaleString()}` : 'No due date'}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}