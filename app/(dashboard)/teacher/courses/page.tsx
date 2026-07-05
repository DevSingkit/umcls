import Link from 'next/link'
import { getMyCourses } from '@/features/courses/actions/courses'

// Shows every course the logged in teacher owns. If they have none yet,
// shows a simple message and a button to create the first one.
export default async function TeacherCoursesPage() {
    const courses = await getMyCourses()

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-display-xs text-ink">My Courses</h1>
                <Link
                    href="/teacher/courses/new"
                    className="h-11 px-6 flex items-center rounded-button bg-ink text-white font-medium"
                >
                    New Course
                </Link>
            </div>

            {courses.length === 0 ? (
                <div className="bg-white rounded-hero shadow-card-lift p-8 text-center">
                    <p className="text-body-md text-graphite">
                        You have not created a course yet.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {courses.map((course) => (
                        <Link
                            key={course.id}
                            href={`/teacher/courses/${course.id}`}
                            className="bg-white rounded-hero shadow-card-lift p-6 block hover:bg-cloud"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-body-emphasis text-ink">{course.title}</h2>
                                <span
                                    className={
                                        course.is_published
                                            ? 'text-caption-md text-success'
                                            : 'text-caption-md text-graphite'
                                    }
                                >
                                    {course.is_published ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            {course.description && (
                                <p className="text-caption-md text-graphite mt-2">
                                    {course.description}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}