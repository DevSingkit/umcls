import Link from 'next/link'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { getClassmates } from '@/features/courses/actions/courses'

export default async function StudentPeoplePage({
    searchParams,
}: {
    searchParams: Promise<{ courseId?: string }>
}) {
    const { courseId } = await searchParams
    const courses = await getMyEnrolledCourses()
    const classmates = courseId ? await getClassmates(courseId) : null

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">People</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">You are not enrolled in any course yet.</p>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    {courses.map((course: any) => (
                        <Link
                            key={course.id}
                            href={`/student/people?courseId=${course.id}`}
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
                <p className="text-body-md text-text-secondary">Pick a course above to see your classmates.</p>
            )}

            {courseId && classmates !== null && classmates.length === 0 && (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No classmates to show right now.</p>
                </div>
            )}

            {courseId && classmates !== null && classmates.length > 0 && (
                <div className="grid gap-3">
                    {classmates.map((classmate) => (
                        <div key={classmate.id} className="bg-surface rounded-md shadow-card p-4">
                            <p className="text-body-emphasis text-ink">{classmate.full_name}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}