import Link from 'next/link'
import { getMyCourses } from '@/features/courses/actions/courses'
import { getGradebookForCourse, getAssignmentHeatmapForCourse } from '@/features/grades/queries/gradebook'
import { GradebookExportControls } from '@/features/grades/components/GradebookExportControls'

const STATUS_STYLES: Record<string, string> = {
    graded: 'bg-success-soft text-success',
    returned: 'bg-success-soft text-success',
    submitted: 'bg-hairline text-ink',
    late: 'bg-error-soft text-error',
    missing: 'bg-error-soft text-error',
    not_due: 'bg-surface-sunken text-text-secondary',
}

const STATUS_LABELS: Record<string, string> = {
    graded: 'Graded',
    returned: 'Returned',
    submitted: 'Submitted',
    late: 'Late',
    missing: 'Missing',
    not_due: '—',
}

export default async function GradebookPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getMyCourses()
    const rows = courseId ? await getGradebookForCourse(courseId) : null
    const heatmap = courseId ? await getAssignmentHeatmapForCourse(courseId) : null
    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Gradebook</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You have not created a course yet.</p>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/teacher/gradebook?courseId=${course.id}`}
                            className={`h-9 px-4 flex items-center rounded-pill text-caption font-medium ${course.id === courseId
                                ? 'bg-brand text-on-ink'
                                : 'bg-surface border border-hairline text-ink hover:bg-surface-sunken'
                                }`}
                        >
                            {course.title}
                        </Link>
                    ))}
                </div>
            )}

            {!courseId && courses.length > 0 && (
                <p className="text-body-md text-text-secondary">Pick a course above to see its gradebook.</p>
            )}

            {courseId && rows === null && (
                <p className="text-body-md text-error">You do not have access to that course.</p>
            )}

            {courseId && rows !== null && rows.length === 0 && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                </div>
            )}

            {courseId && rows !== null && rows.length > 0 && (
                <GradebookExportControls courseId={courseId} />
            )}

            {courseId && rows !== null && rows.length > 0 && (
                <div className="bg-surface rounded-md shadow-card overflow-x-auto mb-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-hairline">
                                <th className="px-6 py-4 text-label text-text-secondary">Student</th>
                                <th className="px-6 py-4 text-label text-text-secondary">Lessons</th>
                                <th className="px-6 py-4 text-label text-text-secondary">Assignment Avg</th>
                                <th className="px-6 py-4 text-label text-text-secondary">Quiz Avg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.studentId} className="border-b border-hairline last:border-0">
                                    <td className="px-6 py-4 text-body-emphasis text-ink">{row.studentName}</td>
                                    <td className="px-6 py-4 text-body-md text-ink">
                                        {row.lessonsCompleted} / {row.totalLessons}
                                    </td>
                                    <td className="px-6 py-4 text-body-md text-ink">
                                        {row.assignmentAverage !== null
                                            ? `${row.assignmentAverage}% (${row.assignmentCount})`
                                            : '—'}
                                    </td>
                                    <td className="px-6 py-4 text-body-md text-ink">
                                        {row.quizAverage !== null ? `${row.quizAverage}% (${row.quizCount})` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {heatmap && heatmap.assignments.length > 0 && (
                <div className="bg-surface rounded-md shadow-card overflow-x-auto">
                    <div className="px-6 pt-4">
                        <h2 className="text-body-emphasis text-ink">Assignment status</h2>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-hairline">
                                <th className="px-6 py-4 text-label text-text-secondary">Student</th>
                                {heatmap.assignments.map((a) => (
                                    <th key={a.id} className="px-4 py-4 text-label text-text-secondary whitespace-nowrap">
                                        {a.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {heatmap.students.map((student) => (
                                <tr key={student.id} className="border-b border-hairline last:border-0">
                                    <td className="px-6 py-4 text-body-emphasis text-ink whitespace-nowrap">{student.name}</td>
                                    {heatmap.assignments.map((a) => {
                                        const status = heatmap.cells[`${student.id}:${a.id}`] ?? 'not_due'
                                        return (
                                            <td key={a.id} className="px-4 py-4">
                                                <span className={`inline-block px-2 py-1 rounded-pill text-caption font-medium ${STATUS_STYLES[status]}`}>
                                                    {STATUS_LABELS[status]}
                                                </span>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}