import Link from 'next/link'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'

export default async function StudentCoursesPage() {
    const courses = await getMyEnrolledCourses()

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">My Courses</h1>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">
                        You are not enrolled in any course yet. Ask your school admin to add you.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {courses.map((course: any) => (
                        <Link
                            key={course.id}
                            href={`/student/courses/${course.id}`}
                            className="bg-surface rounded-md shadow-card p-6 block hover:shadow-card-hover"
                        >
                            <p className="text-body-emphasis text-ink">{course.title}</p>
                            {course.subject && (
                                <p className="text-caption text-text-secondary mt-1">{course.subject}</p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}