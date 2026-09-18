import { NewLessonForm } from '@/features/lessons/components/NewLessonForm'

export default async function NewLessonPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params

    return <NewLessonForm courseId={courseId} />
}