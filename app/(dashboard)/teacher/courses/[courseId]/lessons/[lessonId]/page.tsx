import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { listMaterials } from '@/features/materials/actions/materials'
import { CommentsTab } from '@/features/lessons/components/CommentsTab'
import { listLessonComments } from '@/features/lessons/actions/lesson-comments'
import { SimplifyTab } from '@/features/simplify/components/SimplifyTab'
import { getSimplifiedLessonForTeacher } from '@/features/simplify/actions/simplify'
import { extractYoutubeVideoId, toYoutubeEmbedUrl } from '@/lib/utils/youtube'

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
    const simplification = user?.role === 'teacher' ? await getSimplifiedLessonForTeacher(lessonId) : null

    const videoId = lesson.youtube_url ? extractYoutubeVideoId(lesson.youtube_url) : null

    return (
        <div className="max-w-2xl mx-auto">
            <p className="text-label text-text-secondary">
                {course?.title}
            </p>
            <h1 className="font-heading text-h1 text-ink mt-1 mb-8">{lesson.title}</h1>

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
                <h2 className="font-heading text-h3 text-ink mb-4">Materials</h2>
                <MaterialList materials={lessonMaterials} canDelete={false} />
            </section>

            {user?.role === 'teacher' && (
                <section className="mb-10">
                    <h2 className="font-heading text-h3 text-ink mb-4">Simplify Lesson</h2>
                    <SimplifyTab
                        lessonId={lessonId}
                        initialSimplification={simplification}
                        isTeacher={true}
                    />
                </section>
            )}

            <section>
                <h2 className="font-heading text-h3 text-ink mb-4">Comments</h2>
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
