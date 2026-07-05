import { EnrollForm } from '@/features/admin/components/EnrollForm'
import { getStudents, getAllCourses } from '@/features/admin/actions/enroll-student'

// Loads the list of students and courses, then hands them to the form
// so the admin can pick one of each and enroll the student.
export default async function EnrollPage() {
    const students = await getStudents()
    const courses = await getAllCourses()

    return <EnrollForm students={students} courses={courses} />
}