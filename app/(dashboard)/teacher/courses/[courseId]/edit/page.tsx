import { notFound } from 'next/navigation'
import { getCourseForEdit } from '@/features/courses/actions/courses'
import { EditCourseForm } from '@/features/courses/components/EditCourseForm'

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
            <h1 className="mb-8 font-heading text-h1 text-ink">Edit course</h1>
            <EditCourseForm
                courseId={course.id}
                initialTitle={course.title}
                initialDescription={course.description}
                initialSubject={course.subject}
                initialShowClassmates={course.show_classmates}
                initialGradeLevel={course.grade_level}
            />
        </div>
    )
}
