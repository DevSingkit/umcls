import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getMyCourses } from '@/features/courses/actions/courses'
import { getGradebookForCourse, getAssignmentHeatmapForCourse, getDepEdGradesForCourse } from '@/features/grades/queries/gradebook'
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
    // DepEd Matatag weighted grade (migration 057) — computed separately
    // from `rows` above rather than merged into getGradebookForCourse's
    // own return shape, since that function's assignmentAverage/
    // quizAverage split is a different, older computation (kept as-is
    // for whatever still depends on it) and this is the real,
    // DepEd-official one. Joined together below by studentId for
    // display, not by changing either query's shape.
    const depEdRows = courseId ? await getDepEdGradesForCourse(courseId) : null
    const depEdByStudent = new Map((depEdRows ?? []).map((r) => [r.studentId, r]))

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Gradebook</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You have not created a course yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8">
                    {courses.map((course) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/teacher/gradebook?courseId=${course.id}`}
                                className={`flex items-center gap-4 rounded-md p-5 shadow-card hover:shadow-card-hover ${
                                    isSelected
                                        ? 'bg-brand-soft border-[1.5px] border-brand'
                                        : 'bg-surface'
                                }`}
                            >
                                <span
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${
                                        isSelected ? 'bg-brand text-on-ink' : 'bg-brand-soft text-brand'
                                    }`}
                                >
                                    <BookOpen size={20} aria-hidden="true" />
                                </span>
                                <div>
                                    <p className="text-body-emphasis text-ink">{course.title}</p>
                                    {course.description && (
                                        <p className="text-caption text-text-secondary mt-1">{course.description}</p>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
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
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-heading text-body-emphasis text-ink">DepEd quarterly grade</h2>
                        {depEdRows && depEdRows.length > 0 && (
                            <span className="text-caption text-text-secondary">
                                Weights: {depEdRows[0]?.weightProfile === 'mapeh' ? 'MAPEH (20/60/20)' : 'Standard (20/50/30)'}
                            </span>
                        )}
                    </div>
                    <div className="bg-surface rounded-md shadow-card overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-hairline">
                                    <th className="px-6 py-4 text-label text-text-secondary">Student</th>
                                    <th className="px-6 py-4 text-label text-text-secondary">Written Work</th>
                                    <th className="px-6 py-4 text-label text-text-secondary">Performance Task</th>
                                    <th className="px-6 py-4 text-label text-text-secondary">Quarterly Assessment</th>
                                    <th className="px-6 py-4 text-label text-text-secondary">Final Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => {
                                    const depEd = depEdByStudent.get(row.studentId)
                                    return (
                                        <tr key={row.studentId} className="border-b border-hairline last:border-0">
                                            <td className="px-6 py-4 text-body-emphasis text-ink">{row.studentName}</td>
                                            <td className="px-6 py-4 text-body-md text-ink">
                                                {depEd?.writtenWorkAvg !== null && depEd?.writtenWorkAvg !== undefined
                                                    ? `${depEd.writtenWorkAvg}%`
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-body-md text-ink">
                                                {depEd?.performanceTaskAvg !== null && depEd?.performanceTaskAvg !== undefined
                                                    ? `${depEd.performanceTaskAvg}%`
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-body-md text-ink">
                                                {depEd?.quarterlyAssessmentAvg !== null && depEd?.quarterlyAssessmentAvg !== undefined
                                                    ? `${depEd.quarterlyAssessmentAvg}%`
                                                    : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-body-emphasis text-ink">
                                                {depEd?.initialGrade !== null && depEd?.initialGrade !== undefined ? (
                                                    <span className="inline-flex items-center rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                                        {depEd.initialGrade}%
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {courseId && rows !== null && rows.length > 0 && (
                <div className="mb-8">
                    <h2 className="font-heading text-body-emphasis text-ink mb-3">Raw activity averages</h2>
                    <div className="bg-surface rounded-md shadow-card overflow-x-auto">
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
                </div>
            )}

            {heatmap && heatmap.assignments.length > 0 && (
                <div className="bg-surface rounded-md shadow-card overflow-x-auto">
                    <div className="px-6 pt-4">
                        <h2 className="font-heading text-body-emphasis text-ink">Assignment status</h2>
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
