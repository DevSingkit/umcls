import { requireRole } from '@/lib/auth/get-current-user'
import { getMyArchivedCourses } from '@/features/courses/actions/courses'
import { CourseCard } from '@/features/courses/components/CourseCard'

// Read-only-in-the-sense-of-no-archive-controls-here list of a
// teacher's archived courses. Everything about the course itself
// (lessons, quizzes, grading, etc.) still works exactly as before —
// this page only exists so an archived course is still reachable now
// that it no longer appears on the dashboard/main course list.
// Unarchiving is admin-only (migration 059) — there is deliberately no
// button here to reverse it.
export default async function TeacherArchivedCoursesPage() {
    await requireRole(['teacher'])
    const courses = await getMyArchivedCourses()

    return (
        <div>
            <h1 className="mb-2 font-heading text-h1 text-ink">Archived Courses</h1>
            <p className="mb-8 text-body-md text-text-secondary">
                These courses have been archived by an admin and no longer show on your
                dashboard. Everything in them is still here — only an admin can unarchive.
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
                            href={`/teacher/courses/${course.id}`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
