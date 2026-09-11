import { notFound } from 'next/navigation'
import { getGradebookForCourseGrid } from '@/features/grades/queries/gradebook'
import { GradebookGrid } from '@/features/grades/components/GradebookGrid'

// Course-scoped Grades tab (teacher). Replaces the old standalone
// /teacher/gradebook page and its dead getGradebookForCourseGrid/
// getLinkableItemsForCourse imports from the now-deleted
// gradebook-items.ts (backed tables dropped in migration 083). This
// uses gradebook.ts's real replacement instead — same function name,
// different (correct) implementation, read-only, Classroom-style:
// one column per published assignment/quiz, no manual columns, no
// aggregate.
export default async function TeacherCourseGradesPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params
    const data = await getGradebookForCourseGrid(courseId)

    if (data === null) {
        notFound()
    }

    return <GradebookGrid courseId={courseId} data={data} />
}
