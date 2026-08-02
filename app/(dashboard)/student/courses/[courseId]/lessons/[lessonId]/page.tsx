import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { LessonReader } from '@/features/lessons/components/LessonReader'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { listMaterials } from '@/features/materials/actions/materials'
import { CommentsTab } from '@/features/lessons/components/CommentsTab'
import { listLessonComments } from '@/features/lessons/actions/lesson-comments'
import { SimplifyTab } from '@/features/simplify/components/SimplifyTab'
import { getSimplifiedLessonForStudent } from '@/features/simplify/actions/simplify'

// Shows the lesson content to a student. Only works if the lesson is
// published and the student is enrolled in that course. Both checks
// already happen inside getLesson. Completion tracking (scroll depth)
// happens client-side inside LessonReader. Materials and comments are
// read/write (comments) or read-only (materials) below the reader.
export default async function StudentLessonViewPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
}) {
    const { courseId, lessonId } = await params
    const result = await getLesson(lessonId)
    if (!result) {
        notFound()
    }
    const { lesson, course } = result
    const content = lesson.content as { type: string; body: string } | null

    const user = await getCurrentUser()
    const allMaterials = await listMaterials(courseId, { type: 'lesson', lessonId })
    const lessonMaterials = allMaterials.filter((m) => m.lesson_id === lessonId)
    const comments = await listLessonComments(lessonId)
    const simplification = await getSimplifiedLessonForStudent(lessonId)

    return (
        <div className="max-w-2xl">
            <LessonReader
                lessonId={lessonId}
                title={lesson.title}
                courseTitle={course?.title}
                body={content?.body ?? ''}
                youtubeUrl={lesson.youtube_url}
            />

            <h2 className="font-heading text-body-emphasis text-ink mb-4 mt-8">Materials</h2>
            <div className="mb-8">
                <MaterialList materials={lessonMaterials} canDelete={false} />
            </div>

            <h2 className="font-heading text-body-emphasis text-ink mb-4">Simplify Lesson</h2>
            <div className="mb-8">
                <SimplifyTab
                    lessonId={lessonId}
                    initialSimplification={simplification}
                    isTeacher={false}
                />
            </div>

            <h2 className="font-heading text-body-emphasis text-ink mb-4">Comments</h2>
            {user && (
                <CommentsTab
                    lessonId={lessonId}
                    comments={comments as any}
                    currentUserId={user.id}
                    isTeacher={false}
                />
            )}
        </div>
    )
}
