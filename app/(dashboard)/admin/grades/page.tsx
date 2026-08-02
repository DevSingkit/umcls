import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getAllCoursesForAdmin, getDepEdGradesForCourseAsAdmin } from '@/features/admin/actions/admin-grades'

// Read-only, cross-section grade view for admin — every teacher's
// course, every student's DepEd grade. No mutation anywhere on this
// page or in its action file: the client was explicit that admin sees
// everything but edits nothing, so there is deliberately no equivalent
// of SubmissionsGradeList or ShortAnswerGradeList here, and no "edit"
// affordance on any row.
export default async function AdminGradesPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getAllCoursesForAdmin()
    const result = courseId ? await getDepEdGradesForCourseAsAdmin(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-2">Grades</h1>
            <p className="text-body-md text-text-secondary mb-8">
                View-only. Grades are entered and edited by each course&apos;s teacher.
            </p>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No courses have been created yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8">
                    {courses.map((course) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/admin/grades?courseId=${course.id}`}
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
                                <div className="min-w-0 flex-1">
                                    <p className="text-body-emphasis text-ink truncate">{course.title}</p>
                                    <p className="text-caption text-text-secondary mt-1">
                                        {course.teacherName}
                                        {course.subject ? ` · ${course.subject}` : ''} · {course.studentCount} student
                                        {course.studentCount === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {!courseId && courses.length > 0 && (
                <p className="text-body-md text-text-secondary">Pick a course above to see its grades.</p>
            )}

            {courseId && result === null && (
                <p className="text-body-md text-error">That course could not be found.</p>
            )}

            {courseId && result !== null && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="font-heading text-body-emphasis text-ink">{result.courseTitle}</h2>
                            <p className="text-caption text-text-secondary">Taught by {result.teacherName}</p>
                        </div>
                        {result.rows.length > 0 && (
                            <span className="text-caption text-text-secondary">
                                Weights: {result.rows[0]?.weightProfile === 'mapeh' ? 'MAPEH (20/60/20)' : 'Standard (20/50/30)'}
                            </span>
                        )}
                    </div>

                    {result.rows.length === 0 ? (
                        <div className="bg-surface rounded-md shadow-card p-8 text-center">
                            <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                        </div>
                    ) : (
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
                                    {result.rows.map((row) => (
                                        <tr key={row.studentId} className="border-b border-hairline last:border-0">
                                            <td className="px-6 py-4 text-body-emphasis text-ink">{row.studentName}</td>
                                            <td className="px-6 py-4 text-body-md text-ink">
                                                {row.writtenWorkAvg !== null ? `${row.writtenWorkAvg}%` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-body-md text-ink">
                                                {row.performanceTaskAvg !== null ? `${row.performanceTaskAvg}%` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-body-md text-ink">
                                                {row.quarterlyAssessmentAvg !== null ? `${row.quarterlyAssessmentAvg}%` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-body-emphasis text-ink">
                                                {row.initialGrade !== null ? (
                                                    <span className="inline-flex items-center rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                                                        {row.initialGrade}%
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
