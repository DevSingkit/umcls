import { requireRole } from '@/lib/auth/get-current-user'
import { listUsers, getAllTeachers } from '@/features/admin/actions/users'
import { getAllCourses, getStudents } from '@/features/admin/actions/enroll-student'
import { CreateUserForm } from '@/features/admin/components/CreateUserForm'
import { UserList } from '@/features/admin/components/UserList'
import { CourseReassignment } from '@/features/admin/components/CourseReassignment'
import { EnrollForm } from '@/features/admin/components/EnrollForm'

// Full admin user management (PH2-002): create accounts, search/filter
// the user list, deactivate/reactivate, reset passwords, and reassign
// which teacher owns a course.
export default async function AdminUsersPage() {
    await requireRole(['admin'])

    const [users, teachers, courses, students] = await Promise.all([
        listUsers({}),
        getAllTeachers(),
        getAllCourses(),
        getStudents(),
    ])

    return (
        <div className="min-h-screen bg-canvas px-md py-xxl">
            <div className="mx-auto max-w-3xl space-y-12">
                <div>
                    <p className="text-label uppercase tracking-wide text-text-secondary">• ADMIN</p>
                    <h1 className="text-h1 text-ink mt-2 mb-8">Create a new account</h1>
                    <CreateUserForm />
                </div>

                <div>
                    <h2 className="text-body-emphasis text-ink mb-4">All users</h2>
                    <UserList initialUsers={users} />
                </div>

                <div>
                    <h2 className="text-body-emphasis text-ink mb-4">Reassign a course</h2>
                    {courses.length === 0 || teachers.length === 0 ? (
                        <div className="bg-surface rounded-md shadow-card p-8 text-center">
                            <p className="text-body-md text-text-secondary">
                                Reassignment needs at least one course and one teacher to exist first.
                            </p>
                        </div>
                    ) : (
                        <CourseReassignment courses={courses} teachers={teachers} />
                    )}
                </div>

                <div>
                    <h2 className="text-body-emphasis text-ink mb-4">Enroll a student</h2>
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
            </div>
        </div>
    )
}