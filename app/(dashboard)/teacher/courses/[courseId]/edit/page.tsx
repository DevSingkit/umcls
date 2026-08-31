import { notFound } from 'next/navigation'
import { getCourseForEdit } from '@/features/courses/actions/courses'
import { EditCourseForm } from '@/features/courses/components/EditCourseForm'

// GRADE_LEVEL PROP REMOVED (2026-08-30, continued conversation,
// migration 092): getCourseForEdit no longer selects grade_level (the
// column is gone), and EditCourseForm no longer accepts
// initialGradeLevel — this page's usage updated to match.
//
// DESIGN-LMS 2.1 PASS: removed font-heading from title — Classroom
// Mode page, Fredoka is Mission-Mode-only, same recurring fix applied
// everywhere else this track.
export default async function EditCoursePage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const course = await getCourseForEdit(courseId)

    if (!course) {
        notFound()
    }

    return (
        <div>
            <h1 className="mb-8 text-h1 text-ink">Edit course</h1>
            <EditCourseForm
                courseId={course.id}
                initialTitle={course.title}
                initialDescription={course.description}
                initialSubject={course.subject}
                initialShowClassmates={course.show_classmates}
            />
        </div>
    )
}
