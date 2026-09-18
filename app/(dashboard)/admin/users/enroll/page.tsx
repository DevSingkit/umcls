import { requireRole } from '@/lib/auth/get-current-user'
import { getAllCourses, getStudents } from '@/features/admin/actions/enroll-student'
import { EnrollForm } from '@/features/admin/components/EnrollForm'

// One job: enroll a student into a course. Split out of the old
// combined admin/users/page.tsx. Confirmed EnrollForm calls the
// admin-scoped enrollStudent, not the teacher-scoped
// enrollStudentIntoOwnCourse — unrelated despite the shared filename.
//
// Design pass: single-form content, so max-w-2xl per §7.8 is correct
// and kept. Dropped the "• ADMIN" eyebrow and the redundant
// min-h-screen/bg-canvas/px-md/py-xxl wrapper, same as the other admin
// form pages — AppShell already provides page background and padding.
export default async function AdminEnrollStudentPage() {
    await requireRole(['admin'])

    const [students, courses] = await Promise.all([getStudents(), getAllCourses()])

    return (
        <div className="max-w-2xl">
            <h1 className="text-h1 text-ink mb-8">Enroll a student</h1>

            {students.length === 0 || courses.length === 0 ? (
                <div className="bg-surface rounded-md shadow-card p-8 text-center">
                    <p className="text-body-md text-text-secondary">
                        Enrollment needs at least one student and one course to exist first.
                    </p>
                </div>
            ) : (
                <EnrollForm students={students} courses={courses} />
            )}
        </div>
    )
}