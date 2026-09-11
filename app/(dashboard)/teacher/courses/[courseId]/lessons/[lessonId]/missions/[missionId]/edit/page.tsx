// app/(dashboard)/teacher/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/edit/page.tsx
//
// Revised now that QuizSettingsForm.tsx and QuestionCard.tsx are
// available to mirror properly — this replaces the earlier version's
// hand-rolled read-only activity list with MissionSettingsForm +
// ActivityCard, matching the real quiz-edit-page pattern.
//
// Still inferred (no actual quizzes/[quizId]/edit/page.tsx was
// provided): the overall page shell/layout below. If the real one
// differs — a shared breadcrumb, a different section order — bring
// this in line.
//
// BackButton removed: this page had its own BackButton PLUS whatever
// is rendering one at the missions/[missionId]/ route level — sibling
// mission page (new/page.tsx, a different static segment) does NOT
// double up, which rules out a global dashboard-layout back button and
// points instead at something scoped specifically to the [missionId]
// dynamic segment (most likely a layout.tsx shared across edit/
// attempts/preview-style routes, mirroring however quizzes/[quizId]/
// is set up). That file wasn't provided, so this is confirmed by
// elimination rather than by reading it directly — worth a quick check
// if a third mission route ever gets added under [missionId]/ and
// needs the same treatment.
//
// REMEDIATION FIX (2026-08-30, continued conversation): both
// ActivityCard and AddActivityForm now need the full `activities`
// array (not just the single activity each ActivityCard already
// received) to build their remediation-picker sibling lists — passed
// through as allActivities / existingActivities below. `activities`
// was already being fetched via getMissionForTeacher for the list
// itself, so this is just passing something already-in-scope further
// down, not a new query.
//
// DESIGN-LMS 2.1 PASS: text-heading-lg/text-heading-sm replaced with
// text-h1/text-h3 — same invalid-token bug as the sibling new/page.tsx
// and the mission gameplay page fixed earlier this track. Classroom
// Mode authoring page, no Fredoka.

// EDIT-PAGE HEADING FIX (2026-09-02): matches the create-page's
// activity+question count phrasing (NewMissionForm.tsx's submit button
// reads "Create mission (N activities, M questions)") — this page's
// "Activities (N)" heading now also shows a total question count,
// since an activity can hold multiple questions per the migration-094
// rework and the activity count alone no longer conveys the actual
// size of the mission. No preview panel here — this page never had
// one; the "match the create page" ask was specifically about this
// count phrasing, not about adding/removing a preview.

// STUDENT PROGRESS MOVED OUT (2026-09-06): the analytics summary +
// per-student mastery table + reset actions (MissionProgressOverride)
// used to live at the bottom of this page, requiring a scroll past
// every activity just to check on students. Moved to its own sibling
// route, progress/page.tsx, reachable via a direct "Progress" button
// on the lesson page's mission row (alongside a new "Settings" button
// pointing back here) — see progress/page.tsx for the moved content.

import { notFound } from 'next/navigation'
import { getMissionForTeacher } from '@/features/missions/actions/create-mission'
import { MissionSettingsForm } from '@/features/missions/components/MissionSettingsForm'
import { ActivityCard } from '@/features/missions/components/ActivityCard'
import { AddActivityForm } from '@/features/missions/components/AddActivityForm'

export default async function EditMissionPage({
    params,
}: {
    params: Promise<{ courseId: string; lessonId: string; missionId: string }>
}) {
    const { courseId, lessonId, missionId } = await params

    const result = await getMissionForTeacher(missionId)
    if (!result) {
        notFound()
    }
    const { mission, activities } = result
    const m = mission as any

    // Matches NewMissionForm.tsx's "N activities, M questions" phrasing
    // on the create page — computed here rather than in ActivityCard/
    // MissionSettingsForm since it's a page-level summary of the whole
    // activities array, not something either of those components
    // already tracks.
    const totalQuestionCount = activities.reduce(
        (sum: number, a: any) => sum + (a.questions?.length ?? 0),
        0
    )

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            <div>
                <p className="text-caption text-text-secondary">
                    {m.lessons.courses.title} — {m.lessons.title}
                </p>
                <h1 className="text-h1 text-ink">{m.title}</h1>
            </div>

            <MissionSettingsForm
                missionId={missionId}
                courseId={courseId}
                lessonId={lessonId}
                currentTitle={m.title}
                currentDescription={m.description}
                currentMasteryThreshold={m.mastery_threshold}
                currentRevealCorrectAnswer={m.reveal_correct_answer}
                currentShuffleOptions={m.shuffle_options}
                totalActivities={activities.length}
                isPublished={m.is_published}
            />

            <div className="space-y-4">
                <h2 className="text-h3 text-ink">
                    {activities.length} {activities.length === 1 ? 'activity' : 'activities'}, {totalQuestionCount}{' '}
                    {totalQuestionCount === 1 ? 'question' : 'questions'}
                </h2>
                {activities.length === 0 && (
                    <p className="text-body-md text-text-secondary">No activities yet — add the first one below.</p>
                )}
                {activities.map((activity: any, index: number) => (
                    <ActivityCard
                        key={activity.id}
                        activity={activity}
                        index={index}
                        missionId={missionId}
                        allActivities={activities}
                    />
                ))}
            </div>

            <div>
                <h2 className="text-h3 text-ink mb-3">Add another activity</h2>
                <AddActivityForm missionId={missionId} existingActivities={activities} />
            </div>
        </div>
    )
}
