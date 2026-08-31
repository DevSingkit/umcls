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

// Shows the lesson content to a student. Only works if the lesson is
// published and the student is enrolled in that course. Both checks
// already happen inside getLesson. Completion tracking (scroll depth)
// happens client-side inside LessonReader. Materials and comments are
// read/write (comments) or read-only (materials) below the reader.
//
// PHASE 3.7 REWORK (ADAPTIVE-ENGINE-PLAN.md, "Problem B" scoping,
// 2026-08-28): Missions used to sit third, after Materials, in a
// stack of visually-identical section headers — a student had to
// scroll past Materials before even seeing the game part existed.
// Moved to come FIRST, right after the lesson text, before Materials.
// Confirmed with user (chose "move it up" specifically, not "move it
// up AND restyle the header" — so the heading markup below is
// deliberately untouched, only the ORDER changed). This required no
// changes to MissionPath.tsx itself — its v3 "game hub" card styling
// (pulsing "Start here," brand-tinted current node, Play icon) was
// already exactly right, it just needed to not be buried.
//
// PHASE 8 REMOVAL (2026-08-28, new conversation continuing the same
// project): Simplify Lesson section removed entirely, along with the
// requestedLanguage resolution logic that fed it (searchParams' `lang`
// param, user.preferredSimplifyLanguage) — none of that had any other
// purpose in this file. Database (lesson_simplifications,
// users.preferred_simplify_language) deliberately left untouched, UI/
// actions only — flagged to user as the safer default.
//
// DESIGN-LMS 2.1 PASS (2026-08-31): this page is Mission Mode per the
// locked mode split. The Missions/Materials/Comments section headers
// previously used font-heading (Fredoka) at body-emphasis size —
// mixing the Mission Mode font into what's really a structural label,
// not a headline. Per your call: the 22px/28px "mission" token is
// reserved for the ONE primary heading or active question prompt per
// screen (here, that's LessonReader's own title, which lives inside
// that component and wasn't touched). These three section headers are
// now plain structural labels — Nunito (Mission Mode body/UI font),
// uppercase, small caption size, tracked out — so they read as
// dividers between content blocks rather than competing headlines.
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
