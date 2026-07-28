import { notFound } from 'next/navigation'
import { getLessonForEdit } from '@/features/lessons/actions/lessons'
import { listMaterials } from '@/features/materials/actions/materials'
import { EditLessonForm } from '@/features/lessons/components/EditLessonForm'

export default async function EditLessonPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
}) {
    const { courseId, lessonId } = await params
    const lesson = await getLessonForEdit(lessonId)

    if (!lesson) {
        notFound()
    }

    const content = lesson.content as { type: string; body: string } | null
    const allMaterials = await listMaterials(courseId, { type: 'lesson', lessonId })
    const lessonMaterials = allMaterials.filter((m) => m.lesson_id === lessonId)

    return (
        <EditLessonForm
            courseId={courseId}
            lessonId={lessonId}
            initialTitle={lesson.title}
            initialContent={content?.body ?? ''}
            initialMaterials={lessonMaterials}
        />
    )
}