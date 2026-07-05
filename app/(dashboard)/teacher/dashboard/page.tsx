import Link from 'next/link'
import { getMyCourses } from '@/features/courses/actions/courses'

// Simple teacher home page. Shows their courses so they have something
// useful to land on after logging in.
export default async function TeacherDashboardPage() {
    const courses = await getMyCourses()

    return (
        <div>
            <h1 className="text-display-xs text-ink mb-8">Welcome back</h1>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-body-emphasis text-ink">Your courses</h2>
                <Link href="/teacher/courses" className="text-caption-md text-link">
                    View all
                </Link>
            </div>

            {courses.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center">
                    <p className="text-body-md text-graphite">
                        You have not created a course yet.
                    </p>
                    <Link
                        href="/teacher/courses/new"
                        className="inline-block mt-4 h-11 px-6 flex items-center justify-center rounded-button bg-ink text-white font-medium"
                    >
                        Create your first course
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {courses.slice(0, 5).map((course) => (
                        <Link
                            key={course.id}
                            href={`/teacher/courses/${course.id}`}
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