// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/page.tsx
//
// Original file, unchanged except for one addition: a "Missions"
// section, inserted after Materials and before Simplify Lesson,
// mirroring that section's exact shape (fetch server-side, hand the
// list to a small component, "+ New X" link included in that
// component). Gated behind `user?.role === 'teacher'`, same pattern
// already used for the Simplify Lesson section below it — this file
// isn't exclusively teacher-only by its own logic (relies on
// getCurrentUser, not requireRole), so the gate is kept consistent
// with how the file already guards teacher-only sections rather than
// assumed redundant.
//
// PHASE 8 REMOVAL (2026-08-28, new conversation continuing the same
// project): Simplify Lesson section removed entirely — AI Simplify is
// being retired app-wide (full UI removal, confirmed with user).
// getSimplifiedLessonsForTeacher call and the simplifications fetch
// removed along with it. Database (lesson_simplifications table,
// users.preferred_simplify_language column) deliberately left
// untouched — only the UI/actions are being removed this pass, not
// the schema; flagged to user as the safer, reversible default rather
// than assumed.
//
// DESIGN-LMS 2.1 PASS: removed font-heading from title and all three
// section headers (Materials/Missions/Comments) — this is the
// teacher-side Classroom Mode lesson view, not the student Mission
// Mode lesson-reading page, so Fredoka doesn't apply here at all.

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
