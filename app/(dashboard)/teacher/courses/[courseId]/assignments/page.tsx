import Link from 'next/link'
import { listAssignmentsForTeacher } from '@/features/assignments/actions/assignments'

export default async function TeacherAssignmentsPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const assignments = await listAssignmentsForTeacher(courseId)

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="font-heading text-h1 text-ink">Assignments</h1>
                <Link
                    href={`/teacher/courses/${courseId}/assignments/new`}
                    className="h-11 px-6 flex items-center rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover"
                >
                    + New Assignment
                </Link>
            </div>

            {assignments.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No assignments yet.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {assignments.map((a) => (
                        <div key={a.id} className="bg-surface rounded-md shadow-card p-6 flex items-center justify-between">
                            <Link
                                href={`/teacher/courses/${courseId}/assignments/${a.id}`}
                                className="flex-1"
                            >
                                <p className="text-body-emphasis text-ink">{a.title}</p>
                                <p className="text-caption text-text-secondary">
                                    {a.due_at ? `Due ${new Date(a.due_at).toLocaleString()}` : 'No due date'}
                                    {' · '}
                                    Max {a.max_score}
                                </p>
                            </Link>                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}