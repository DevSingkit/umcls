import Link from 'next/link'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { getMyGradesForCourse } from '@/features/grades/queries/student-grades'
import { GradedFileDownloadLink } from '@/features/grades/components/GradedFileDownloadLink'

const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
    submitted: 'Turned in — waiting for your teacher to check it',
    resubmitted: 'Turned in again — waiting for your teacher to check it',
    graded: 'Graded',
    returned: 'Graded',
}

export default async function StudentGradesPage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getMyEnrolledCourses()
    const grades = courseId ? await getMyGradesForCourse(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">My Grades</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You are not enrolled in any course yet.</p>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {courses.map((course: any) => (
                        <Link
                            key={course.id}
                            href={`/student/grades?courseId=${course.id}`}
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
                <p className="text-body-md text-text-secondary">Pick a course above to see your grades.</p>
            )}

            {courseId && grades === null && (
                <p className="text-body-md text-error">You are not enrolled in that course.</p>
            )}

            {courseId && grades && (
                <div className="grid gap-8">
                    <div>
                        <h2 className="text-body-emphasis text-ink mb-4">Assignments</h2>
                        {grades.assignments.length === 0 ? (
                            <p className="text-body-md text-text-secondary">No assignments yet.</p>
                        ) : (
                            <div className="grid gap-3">
                                {grades.assignments.map((a) => (
                                    <div key={a.assignmentId} className="bg-surface rounded-md shadow-card p-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-body-emphasis text-ink">{a.title}</p>
                                            <span className="text-body-md text-ink">
                                                {a.score !== null ? `${a.score} / ${a.maxScore}` : '—'}
                                            </span>
                                        </div>
                                        <p className="text-caption text-text-secondary mt-1">
                                            {a.status ? ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status : 'Not turned in yet'}
                                        </p>
                                        {a.feedback && (
                                            <p className="text-caption text-ink mt-2 italic">&quot;{a.feedback}&quot;</p>
                                        )}
                                        {a.submissionId && (a.status === 'graded' || a.status === 'returned') && (
                                            <div className="mt-2">
                                                <GradedFileDownloadLink submissionId={a.submissionId} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-body-emphasis text-ink mb-4">Quizzes</h2>
                        {grades.quizzes.length === 0 ? (
                            <p className="text-body-md text-text-secondary">No quizzes taken yet.</p>
                        ) : (
                            <div className="grid gap-3">
                                {grades.quizzes.map((q) => (
                                    <div key={q.attemptId} className="bg-surface rounded-md shadow-card p-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-body-emphasis text-ink">{q.title}</p>
                                            <span className="text-body-md text-ink">
                                                {q.score !== null ? `${q.score}%` : 'Your teacher is still checking this'}
                                            </span>
                                        </div>
                                        {q.isPassing !== null && (
                                            <p
                                                className={`text-caption mt-1 ${q.isPassing ? 'text-success' : 'text-error'
                                                    }`}
                                            >
                                                {q.isPassing ? 'Passed' : 'Keep practicing — you\'ll get it'}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}