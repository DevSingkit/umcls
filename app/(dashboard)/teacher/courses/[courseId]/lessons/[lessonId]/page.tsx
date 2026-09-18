// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/page.tsx
import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { listMaterials } from '@/features/materials/actions/materials'
import { CommentsTab } from '@/features/lessons/components/CommentsTab'
import { listLessonComments } from '@/features/lessons/actions/lesson-comments'
import { extractYoutubeVideoId, toYoutubeEmbedUrl } from '@/lib/utils/youtube'
import { listMissionsForTeacher } from '@/features/missions/actions/create-mission'
import { MissionList } from '@/features/missions/components/MissionList'

export default async function LessonViewPage({
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
    const user = await getCurrentUser()
    const content = lesson.content as { type: string; body: string } | null

    const allMaterials = await listMaterials(courseId, { type: 'lesson', lessonId })
    const lessonMaterials = allMaterials.filter((m) => m.lesson_id === lessonId)
    const comments = await listLessonComments(lessonId)

    const missions = user?.role === 'teacher' ? await listMissionsForTeacher(lessonId) : []

    const videoId = lesson.youtube_url ? extractYoutubeVideoId(lesson.youtube_url) : null

    return (
        <div className="max-w-2xl mx-auto">
            <p className="text-label text-text-secondary">
                {course?.title}
            </p>
            <h1 className="text-h1 text-ink mt-1 mb-8">{lesson.title}</h1>

            {videoId && (
                <div className="mb-6 rounded-md overflow-hidden shadow-card aspect-video">
                    <iframe
                        src={toYoutubeEmbedUrl(videoId)}
                        title={`${lesson.title} — video`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                    />
                </div>
            )}

            <div className="bg-surface rounded-md shadow-card p-8 mb-10">
                <p className="text-body-lg text-ink-soft whitespace-pre-wrap">
                    {content?.body}
                </p>
            </div>

            <section className="mb-10">
                <h2 className="text-h3 text-ink mb-4">Materials</h2>
                <MaterialList materials={lessonMaterials} canDelete={false} />
            </section>

            {user?.role === 'teacher' && (
                <section className="mb-10">
                    <h2 className="text-h3 text-ink mb-4">Missions</h2>
                    <MissionList missions={missions} courseId={courseId} lessonId={lessonId} />
                </section>
            )}

            <section>
                <h2 className="text-h3 text-ink mb-4">Comments</h2>
                {user && (
                    <CommentsTab
                        lessonId={lessonId}
                        comments={comments as any}
                        currentUserId={user.id}
                        isTeacher={user.role === 'teacher'}
                    />
                )}
            </section>
        </div>
    )
}
