import { NewLessonForm } from '@/features/lessons/components/NewLessonForm'

// This page just reads the courseId from the URL and hands it to the
// actual form, which needs to run in the browser so it can track typing
// and show errors as the teacher fills it in.
export default async function NewLessonPage({
    params,
}: {
    params: Promise<{ courseId: string }>
}) {
    const { courseId } = await params

    return <NewLessonForm courseId={courseId} />
}