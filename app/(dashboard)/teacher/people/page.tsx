import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { getMyCourses, getCourseRoster } from '@/features/courses/actions/courses'

export default async function TeacherPeoplePage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getMyCourses()
    const roster = courseId ? await getCourseRoster(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">People</h1>

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
                                href={`/teacher/people?courseId=${course.id}`}
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
                <p className="text-body-md text-text-secondary">Pick a course above to see who&apos;s enrolled.</p>
            )}

            {courseId && roster === null && (
                <p className="text-body-md text-error">You do not have access to that course.</p>
            )}

            {courseId && roster !== null && roster.length === 0 && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No students enrolled in this course yet.</p>
                </div>
            )}

            {courseId && roster !== null && roster.length > 0 && (
                <div className="bg-surface rounded-md shadow-card overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-hairline">
                                <th className="px-6 py-4 text-label text-text-secondary">Student</th>
                                <th className="px-6 py-4 text-label text-text-secondary">Enrolled</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roster.map((student) => (
                                <tr key={student.studentId} className="border-b border-hairline last:border-0">
                                    <td className="px-6 py-4 text-body-emphasis text-ink">{student.studentName}</td>
                                    <td className="px-6 py-4 text-body-md text-text-secondary">
                                        {new Date(student.enrolledAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}