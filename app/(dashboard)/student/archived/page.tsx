import { requireRole } from '@/lib/auth/get-current-user'
import { getMyArchivedEnrolledCourses } from '@/features/courses/actions/get-enrolled-courses'
import { CourseCard } from '@/features/courses/components/CourseCard'

// Same purpose as the teacher archived page: a course an admin
// archived no longer shows on the student dashboard, but everything
// in it (lessons, quizzes, grades already recorded) is still fully
// accessible from here.
export default async function StudentArchivedCoursesPage() {
    await requireRole(['student'])
    const courses = await getMyArchivedEnrolledCourses()

    return (
        <div>
            <h1 className="mb-2 font-heading text-h1 text-ink">Archived Courses</h1>
            <p className="mb-8 text-body-md text-text-secondary">
                These courses have been archived and no longer show on your dashboard.
                Everything in them is still here.
            </p>

            {courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">No archived courses.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {courses.map((course) => (
                        <CourseCard
                            key={course.id}
                            id={course.id}
                            title={course.title}
                            subject={course.subject}
                            href={`/student/courses/${course.id}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
