import { requireRole } from '@/lib/auth/get-current-user'
import { getAllTeachers } from '@/features/admin/actions/users'
import { getAllCourses } from '@/features/admin/actions/enroll-student'
import { CourseReassignment } from '@/features/admin/components/CourseReassignment'

// One job: reassign which teacher owns a course. Split out of the old
// combined admin/users/page.tsx.
//
// Design pass: same treatment as the Enroll page — single-form
// content stays max-w-2xl, eyebrow and redundant wrapper dropped.
export default async function AdminReassignCoursePage() {
    await requireRole(['admin'])

    const [teachers, courses] = await Promise.all([getAllTeachers(), getAllCourses()])

    return (
        <div className="max-w-2xl">
            <h1 className="text-h1 text-ink mb-8">Reassign a class to a teacher</h1>

            {courses.length === 0 || teachers.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">
                        Reassignment needs at least one class and one teacher to exist first.
                    </p>
                </div>
            ) : (
                <CourseReassignment courses={courses} teachers={teachers} />
            )}
        </div>
    )
}