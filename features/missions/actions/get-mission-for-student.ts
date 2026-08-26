// features/missions/actions/get-mission-for-student.ts
//
// Mirrors features/quizzes/actions/get-quiz-for-student.ts, but there
// is no single precedent function to copy 1:1 — quizzes has nothing
// shaped like "list of missions in a lesson with this student's
// aggregate progress joined in". The closest quiz analog is
// getQuizOverviewForStudent's attempt-joining logic, but that loads a
// SINGLE quiz's attempt history, not a list. This file's shape is new
// for that reason, per HANDOFF.md's Day 3 note that MissionPath.tsx
// has "no direct precedent to mirror".
//
// What IS mirrored exactly: reading multiple-choice option text
// without is_correct. Quizzes' getQuizForStudent reads from
// answer_options_for_student, a DB view with is_correct left out
// entirely — "even if this code has a mistake, the database still
// refuses to hand back the answer key." Per HANDOFF.md's Day 1 entry,
// activity_options_for_student was created the same way in migration
// 082, so this file reads from that view for the same guarantee. (Day
// 3 doesn't actually need option text at all — the path only shows
// mission-level status, not activity content — but getMissionPreview
// below is included for a "peek before you start" case some UIs want;
// skip calling it if that's not needed yet.)
//
// KEY DESIGN DECISION, not documented anywhere else: mission_progress
// has no direct write policy (service-role only, per HANDOFF.md's
// Day 1 note), so a brand-new student has ZERO rows in that table.
// Without a bootstrapping rule, every mission would read as its schema
// default ('locked') and nobody could ever start. The rule applied
// here: when no mission_progress row exists for a (mission, student)
// pair, the FIRST published mission in the lesson (by order_index) is
// treated as 'unlocked'; every other missing row is treated as
// 'locked'. This is computed here at READ time — nothing is written.
// Day 4's mastery-check action, which does the actual writing, needs
// to apply this exact same rule when it creates a student's first-ever
// mission_progress row, or the read path here and the write path
// there will disagree about what a fresh student's first mission
// should be.

import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-user'

export type MissionStatus = 'locked' | 'unlocked' | 'mastered'

export type MissionForStudent = {
    id: string
    title: string
    description: string | null
    orderIndex: number
    masteryThreshold: number
    status: MissionStatus
    correctStreak: number
    masteredAt: string | null
}

/**
 * Loads every published mission in a lesson, with this student's
 * progress (or the computed bootstrapping default described above)
 * joined in. This is what MissionPath.tsx renders directly.
 */
export async function getMissionsForStudent(lessonId: string): Promise<MissionForStudent[]> {
    const user = await requireRole(['student'])
    const supabase = await createClient()

    const { data: missions, error: missionsError } = await supabase
        .from('missions')
        .select('id, title, description, order_index, mastery_threshold')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .order('order_index')

    if (missionsError) {
        throw new Error('Could not load missions')
    }

    const missionRows = missions ?? []
    const missionIds = missionRows.map((m) => m.id)

    const { data: progress, error: progressError } = await supabase
        .from('mission_progress')
        .select('mission_id, status, correct_streak, mastered_at')
        .eq('student_id', user.id)
        .in('mission_id', missionIds)

    if (progressError) {
        throw new Error('Could not load mission progress')
    }

    const progressByMissionId = new Map((progress ?? []).map((p) => [p.mission_id, p]))

    return missionRows.map((mission, index) => {
        const existing = progressByMissionId.get(mission.id)

        if (existing) {
            return {
                id: mission.id,
                title: mission.title,
                description: mission.description,
                orderIndex: mission.order_index,
                masteryThreshold: mission.mastery_threshold,
                status: existing.status as MissionStatus,
                correctStreak: existing.correct_streak,
                masteredAt: existing.mastered_at,
            }
        }

        // No row yet — apply the bootstrapping default documented at
        // the top of this file. `index` is the position in this
        // already-published-filtered, already-order_index-sorted
        // array, not the raw order_index column, since a draft mission
        // could otherwise occupy order_index 0 while being invisible
        // to students.
        return {
            id: mission.id,
            title: mission.title,
            description: mission.description,
            orderIndex: mission.order_index,
            masteryThreshold: mission.mastery_threshold,
            status: index === 0 ? 'unlocked' : 'locked',
            correctStreak: 0,
            masteredAt: null,
        }
    })
}

export type ActivityPreviewForStudent = {
    id: string
    prompt: string
    activityType: string
    orderIndex: number
    options: { id: string; optionText: string }[]
}

export type MissionPreviewForStudent = {
    id: string
    title: string
    description: string | null
    masteryThreshold: number
    activities: ActivityPreviewForStudent[]
}

/**
 * Loads a single mission's activities for the student to work through
 * — the mission-detail equivalent of getQuizForStudent. Included for
 * Day 4's ActivityRunner.tsx to build on, since it needs this same
 * read; not required for Day 3's path view itself, which only needs
 * getMissionsForStudent above.
 *
 * Same guarantee as getQuizForStudent: this never returns is_correct,
 * because it only reads from activity_options_for_student, a view
 * that leaves is_correct out entirely.
 */
export async function getMissionPreviewForStudent(missionId: string): Promise<MissionPreviewForStudent> {
    await requireRole(['student'])
    const supabase = await createClient()

    const { data: mission, error: missionError } = await supabase
        .from('missions')
        .select('id, title, description, mastery_threshold')
        .eq('id', missionId)
        .eq('is_published', true)
        .single()

    if (missionError || !mission) {
        throw new Error('Mission not found')
    }

    const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, prompt, activity_type, order_index')
        .eq('mission_id', missionId)
        .order('order_index')

    if (activitiesError) {
        throw new Error('Could not load activities')
    }

    const activityIds = (activities ?? []).map((a) => a.id)

    const { data: options, error: optionsError } = await supabase
        .from('activity_options_for_student')
        .select('id, activity_id, option_text, order_index')
        .in('activity_id', activityIds)
        .order('order_index')

    if (optionsError) {
        throw new Error('Could not load answer options')
    }

    const activitiesWithOptions = (activities ?? []).map((activity) => ({
        id: activity.id,
        prompt: activity.prompt,
        activityType: activity.activity_type,
        orderIndex: activity.order_index,
        options: (options ?? [])
            .filter((o) => o.activity_id === activity.id)
            .map((o) => ({ id: o.id, optionText: o.option_text })),
    }))

    return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        masteryThreshold: mission.mastery_threshold,
        activities: activitiesWithOptions,
    }
}
