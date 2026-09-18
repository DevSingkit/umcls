import { notFound } from 'next/navigation'
import { getGradebookForCourseGrid } from '@/features/grades/queries/gradebook'
import { GradebookGrid } from '@/features/grades/components/GradebookGrid'

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
