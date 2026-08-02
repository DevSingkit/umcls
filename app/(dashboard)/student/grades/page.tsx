import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { getMyGradesForCourse, getMyDepEdGradeForCourse } from '@/features/grades/queries/student-grades'
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
    // DepEd Matatag weighted grade (migration 057) — same computation as
    // the teacher gradebook's getDepEdGradesForCourse, scoped to this
    // student only. Fetched separately from `grades` above since it's a
    // different query answering a different question ("what's my grade
    // in this subject" vs "what did I score on each item").
    const depEd = courseId ? await getMyDepEdGradeForCourse(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">My Grades</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You are not enrolled in any course yet.</p>
                </div>
            ) : (
                <div className="grid gap-3 mb-8">
                    {courses.map((course: any) => {
                        const isSelected = course.id === courseId
                        return (
                            <Link
                                key={course.id}
                                href={`/student/grades?courseId=${course.id}`}
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
                                    {course.subject && (
                                        <p className="text-caption text-text-secondary mt-1">{course.subject}</p>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {!courseId && courses.length > 0 && (
                <p className="text-body-md text-text-secondary">Pick a course above to see your grades.</p>
            )}

            {courseId && grades === null && (
                <p className="text-body-md text-error">You are not enrolled in that course.</p>
            )}

            {courseId && depEd && (
                <div className="bg-surface rounded-md shadow-card p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-heading text-body-emphasis text-ink">Your quarterly grade</h2>
                        <span className="text-caption text-text-secondary">
                            {depEd.weightProfile === 'mapeh' ? 'MAPEH weights (20/60/20)' : 'Standard weights (20/50/30)'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <p className="text-caption text-text-secondary mb-1">Written Work</p>
                            <p className="text-h3 font-heading text-ink">
                                {depEd.writtenWorkAvg !== null ? `${depEd.writtenWorkAvg}%` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary mb-1">Performance Task</p>
                            <p className="text-h3 font-heading text-ink">
                                {depEd.performanceTaskAvg !== null ? `${depEd.performanceTaskAvg}%` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary mb-1">Quarterly Assessment</p>
                            <p className="text-h3 font-heading text-ink">
                                {depEd.quarterlyAssessmentAvg !== null ? `${depEd.quarterlyAssessmentAvg}%` : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-caption text-text-secondary mb-1">Final Grade</p>
                            {depEd.initialGrade !== null ? (
                                <span className="inline-flex items-center rounded-pill bg-brand-soft text-brand text-h3 font-heading font-semibold px-4 py-1">
                                    {depEd.initialGrade}%
                                </span>
                            ) : (
                                <p className="text-h3 font-heading text-ink">—</p>
                            )}
                        </div>
                    </div>

                    {depEd.initialGrade === null && (
                        <p className="text-caption text-text-secondary mt-4">
                            Your grade will appear here once your teacher has graded at least one item.
                        </p>
                    )}
                </div>
            )}

            {courseId && grades && (
                <div className="grid gap-8">
                    <div>
                        <h2 className="font-heading text-body-emphasis text-ink mb-4">Assignments</h2>
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
                        <h2 className="font-heading text-body-emphasis text-ink mb-4">Quizzes</h2>
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
