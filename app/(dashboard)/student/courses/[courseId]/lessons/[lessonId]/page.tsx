import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { LessonReader } from '@/features/lessons/components/LessonReader'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { listMaterials } from '@/features/materials/actions/materials'
import { CommentsTab } from '@/features/lessons/components/CommentsTab'
import { listLessonComments } from '@/features/lessons/actions/lesson-comments'
import { getMissionsForStudent } from '@/features/missions/actions/get-mission-for-student'
import { MissionPath } from '@/features/missions/components/MissionPath'

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

    const missions = await getMissionsForStudent(lessonId)

    const sectionLabelClass =
        'font-sans text-label font-bold uppercase tracking-wide text-text-secondary mb-4'

    return (
        <div className="max-w-2xl">
            <LessonReader
                lessonId={lessonId}
                title={lesson.title}
                courseTitle={course?.title}
                body={content?.body ?? ''}
                youtubeUrl={lesson.youtube_url}
            />

            <h2 className={`${sectionLabelClass} mt-8`}>Missions</h2>
            <div className="mb-8">
                <MissionPath missions={missions} courseId={courseId} lessonId={lessonId} />
            </div>

            <h2 className={sectionLabelClass}>Materials</h2>
            <div className="mb-8">
                <MaterialList materials={lessonMaterials} canDelete={false} />
            </div>

            <h2 className={sectionLabelClass}>Comments</h2>
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
