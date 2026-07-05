import Link from 'next/link'
import { getMyEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'

// Simple student home page. Shows the courses they are enrolled in.
export default async function StudentDashboardPage() {
    const courses = await getMyEnrolledCourses()

    return (
        <div>
            <h1 className="text-display-xs text-ink mb-8">Welcome back</h1>

            {courses.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center">
                    <p className="text-body-md text-graphite">
                        You are not enrolled in any course yet. Ask your school admin to add you.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {courses.map((course: any) => (
                        <Link
                            key={course.id}
                            href={`/student/courses/${course.id}`}
                            className="bg-white rounded-hero shadow-card-lift p-6 block hover:bg-cloud"
                        >
                            <span className="text-body-emphasis text-ink">{course.title}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}