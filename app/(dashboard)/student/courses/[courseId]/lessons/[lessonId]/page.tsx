import { notFound } from 'next/navigation'
import { getLesson } from '@/features/lessons/actions/get-lesson'
import { getCurrentUser } from '@/lib/auth/get-current-user'
import { LessonReader } from '@/features/lessons/components/LessonReader'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { listMaterials } from '@/features/materials/actions/materials'
import { CommentsTab } from '@/features/lessons/components/CommentsTab'
import { listLessonComments } from '@/features/lessons/actions/lesson-comments'
import { SimplifyTab } from '@/features/simplify/components/SimplifyTab'
import {
    getSimplifiedLessonForStudent,
    getAvailableSimplifyLanguages,
} from '@/features/simplify/actions/simplify'
import { getMissionsForStudent } from '@/features/missions/actions/get-mission-for-student'
import { MissionPath } from '@/features/missions/components/MissionPath'

type SimplifyLanguage = 'english' | 'tagalog'

// Shows the lesson content to a student. Only works if the lesson is
// published and the student is enrolled in that course. Both checks
// already happen inside getLesson. Completion tracking (scroll depth)
// happens client-side inside LessonReader. Materials and comments are
// read/write (comments) or read-only (materials) below the reader.
//
// Missions section added — same shape as the equivalent addition to
// the teacher lesson page: fetched server-side, handed to a small
// component. Placed Materials -> Missions -> Simplify -> Comments,
// matching the section order already used on the teacher side, for
// consistency between the two lesson pages rather than for any
// reason specific to this file. Unlike the teacher page's Missions
// section, this one isn't gated behind a role check — this file is
// already student-only (StudentLessonViewPage), so there's nothing to
// gate.
export default async function StudentLessonViewPage({
    params,
    searchParams,
}: {
    params: Promise<{ courseId: string; lessonId: string }>
    searchParams: Promise<{ lang?: string }>
}) {
    const { courseId, lessonId } = await params
    const { lang } = await searchParams

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

    // Language resolution order: explicit ?lang= in the URL (set by
    // clicking the toggle) > the student's saved preference
    // (users.preferred_simplify_language, migration 067, returned by
    // getCurrentUser() as preferredSimplifyLanguage) > English.
    const requestedLanguage: SimplifyLanguage =
        lang === 'tagalog' ? 'tagalog' : lang === 'english' ? 'english' : (user?.preferredSimplifyLanguage ?? 'english')

    const [simplification, availableLanguages, missions] = await Promise.all([
        getSimplifiedLessonForStudent(lessonId, requestedLanguage),
        getAvailableSimplifyLanguages(lessonId),
        getMissionsForStudent(lessonId),
    ])

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

            <h2 className="font-heading text-body-emphasis text-ink mb-4">Missions</h2>
            <div className="mb-8">
                <MissionPath missions={missions} courseId={courseId} lessonId={lessonId} />
            </div>

            <h2 className="font-heading text-body-emphasis text-ink mb-4">Simplify Lesson</h2>
            <div className="mb-8">
                <SimplifyTab
                    lessonId={lessonId}
                    isTeacher={false}
                    initialContent={simplification?.content ?? null}
                    initialLanguage={requestedLanguage}
                    availableLanguages={availableLanguages}
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
