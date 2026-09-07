'use server'
// Mission-level actions for the gamified mastery-loop builder. Mirrors
// the quiz-level half of features/quizzes/actions/create-quiz.ts
// (createQuiz / createQuizWithFirstQuestion / getQuizForTeacher / the
// setter functions). Activity-level actions (the addQuestion /
// updateQuestion / deleteQuestion equivalents) live in
// create-activity.ts instead — this project splits mission-level and
// activity-level actions into two files, unlike quizzes' single
// combined file, per the Day 2 plan in HANDOFF.md.
//
// Ownership check differs from quizzes: quizzes.course_id points
// straight at courses, but missions only has lesson_id — every
// ownership check here goes lesson -> course -> teacher_id (two-hop
// embed) instead of quizzes' one-hop courses!inner(teacher_id).
//
// Short-answer activities are intentionally NOT supported here — the
// activities table has no column to store a reference answer for
// auto-grading. Unlike quizzes' short_answer (stored in
// questions.explanation for manual teacher grading later),
// attempt_events.is_correct is NOT NULL, so an activity needs an
// immediate right/wrong at attempt time. Only multiple_choice_single
// and true_false are accepted until that schema gap is addressed. Note
// the DB CHECK constraint on activities.activity_type still permits
// 'short_answer' — nothing stops a row with that value from being
// inserted outside this file, this is only an application-level
// restriction.
//
// CONFLICT FIX / MULTI-ACTIVITY + MULTI-QUESTION REBUILD (2026-09-02):
// this file's createMissionWithFirstActivity had regressed to
// single-activity/single-question creation somewhere along the way —
// only the table names were updated for migration 094
// (activity_questions/activity_question_options), the actual staging
// feature (stage several activities, each with several questions,
// before one save) was never carried over. create-activity.ts's
// addActivity (the EDIT-mission "add another activity" flow) already
// got the correct multi-question rework — this brings creation in
// line with it and extends one level further (multiple ACTIVITIES too,
// per the original ask), reusing create-activity.ts's exact
// questionInputSchema shape rather than inventing a slightly different
// one. buildOptionRows is duplicated here rather than imported, since
// it isn't exported from create-activity.ts and this project doesn't
// have a shared missions-internal util module — same content, kept in
// sync by hand if either copy's validation ever needs to change.
//
// "Never write an empty mission" still holds, now checked one level
// deeper: at least one activity is required, AND every activity must
// have at least one question (mirroring create-activity.ts's own
// questionsArraySchema.min(1) per activity).

import { z } from 'zod'
import { requireRole } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const questionTypeSchema = z.enum(['multiple_choice_single', 'true_false'])

// Mirrors create-activity.ts's questionInputSchema field-for-field —
// deliberately the same shape so a staged question here and a staged
// question in AddActivityForm.tsx behave identically once submitted.
const questionInputSchema = z.object({
    prompt: z.string().min(2, 'Question prompt is too short'),
    questionType: questionTypeSchema,
    options: z.string().optional(),
    correctAnswer: z.string().min(1, 'Enter the correct answer'),
    hintText: z.string().optional(),
})

const questionsArraySchema = z.array(questionInputSchema).min(1, 'Each activity needs at least one question.')

// One staged activity: its questions, plus an optional remediation
// link — same two fields addActivity's own form-level inputs collect
// (remediatesActivityId + questions), just nested here instead of
// being the whole payload.
const stagedActivitySchema = z.object({
    questions: questionsArraySchema,
    remediatesActivityId: z.string().uuid().optional(),
})

const createMissionSchema = z.object({
    lessonId: z.string().uuid(),
    title: z.string().min(2, 'Give this mission a name (at least 2 characters).'),
    description: z.string().optional(),
    masteryThreshold: z.string().optional(),
    // NEW (migration 099): teacher-controlled — whether a wrong answer
    // reveals the correct one afterward. Sent as an explicit 'true'/
    // 'false' string by the form, same optional-with-safe-default
    // pattern as masteryThreshold above; missing/anything other than
    // the literal string 'false' is treated as true, matching the
    // column's own DB default.
    revealCorrectAnswer: z.string().optional(),
    // NEW (migration 100): unlike revealCorrectAnswer, missing/absent
    // here means false (no shuffle) — matches the column's own DB
    // default and preserves every existing mission's current
    // fixed-order behavior unless a teacher explicitly opts in.
    shuffleOptions: z.string().optional(),
    // Never write an empty mission — at least one staged activity is
    // required, and (via stagedActivitySchema's own questions field)
    // every one of those activities must have at least one question.
    activities: z.array(stagedActivitySchema).min(1, 'Add at least one activity.'),
    publish: z.string().optional(),
})

export type CreateMissionResult = { ok: true; missionId: string } | { ok: false; error: string }

function buildOptionRows(
    questionId: string,
    questionType: 'multiple_choice_single' | 'true_false',
    options: string | undefined,
    correctAnswer: string
): { question_id: string; option_text: string; is_correct: boolean; order_index: number }[] | { error: string } {
    if (questionType === 'true_false') {
        return [
            { question_id: questionId, option_text: 'True', is_correct: correctAnswer === 'True', order_index: 0 },
            { question_id: questionId, option_text: 'False', is_correct: correctAnswer === 'False', order_index: 1 },
        ]
    }

    const optionTexts = (options ?? '')
        .split(',')
        .map((text) => text.trim())
        .filter(Boolean)

    if (optionTexts.length < 2) {
        return { error: 'Each multiple choice question needs at least two answer options.' }
    }

    return optionTexts.map((text, index) => ({
        question_id: questionId,
        option_text: text,
        is_correct: text === correctAnswer,
        order_index: index,
    }))
}

// A mission row is only ever written once a title AND at least one
// real activity (with at least one real question) exist together,
// inserted in the same action — same reasoning as
// createQuizWithFirstQuestion: there should never be a moment a
// titled-but-empty mission exists in the database. Now covers N
// activities, each with N questions, staged client-side and sent
// together as one JSON-encoded 'activities' field.
export async function createMissionWithFirstActivity(formData: FormData): Promise<CreateMissionResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const rawActivities = formData.get('activities')
    let parsedActivitiesJson: unknown
    try {
        parsedActivitiesJson = rawActivities ? JSON.parse(rawActivities as string) : undefined
    } catch {
        return { ok: false, error: 'Could not read the staged activities. Please try again.' }
    }

    const parsed = createMissionSchema.safeParse({
        lessonId: formData.get('lessonId'),
        title: formData.get('title'),
        description: formData.get('description') ?? undefined,
        masteryThreshold: formData.get('masteryThreshold') ?? undefined,
        activities: parsedActivitiesJson,
        publish: formData.get('publish') ?? undefined,
        revealCorrectAnswer: formData.get('revealCorrectAnswer') ?? undefined,
        shuffleOptions: formData.get('shuffleOptions') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { lessonId, title, description, activities } = parsed.data

    const masteryThreshold = parsed.data.masteryThreshold ? Number(parsed.data.masteryThreshold) : 3
    if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
        return { ok: false, error: 'Mastery threshold must be at least 1.' }
    }

    const publish = parsed.data.publish === 'true'
    const revealCorrectAnswer = parsed.data.revealCorrectAnswer !== 'false'
    const shuffleOptions = parsed.data.shuffleOptions === 'true'

    // Validate EVERY staged activity's EVERY question's options BEFORE
    // creating anything — same order/reasoning as the original
    // single-activity version and as create-activity.ts's addActivity:
    // a bad question anywhere in the whole staged batch should never
    // leave a half-created mission behind. Checked up front, in full,
    // before any insert happens.
    for (const [activityIndex, activity] of activities.entries()) {
        for (const [questionIndex, question] of activity.questions.entries()) {
            const rows = buildOptionRows('placeholder', question.questionType, question.options, question.correctAnswer)
            if ('error' in rows) {
                return {
                    ok: false,
                    error: `Activity ${activityIndex + 1}, question ${questionIndex + 1}: ${rows.error}`,
                }
            }
        }
    }

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, course_id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this lesson.' }
    }

    // Same order_index fix as questions in create-quiz.ts: count
    // existing missions on this lesson so a new one always appends
    // after the current last one instead of tying at the schema
    // default of 0.
    const { count } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('lesson_id', lessonId)

    const { data: mission, error: missionError } = await supabase
        .from('missions')
        .insert({
            lesson_id: lessonId,
            title,
            description: description && description.trim() !== '' ? description.trim() : null,
            order_index: count ?? 0,
            mastery_threshold: masteryThreshold,
            reveal_correct_answer: revealCorrectAnswer,
            shuffle_options: shuffleOptions,
            is_published: publish,
            created_by: user.id,
        })
        .select('id')
        .single()

    if (missionError || !mission) {
        return { ok: false, error: 'Could not create the mission. Please try again.' }
    }

    // Insert every staged activity in order, each with its own
    // questions and their options — mirrors create-activity.ts's
    // addActivity insert logic exactly, one activity at a time, now
    // run in an outer loop instead of being the whole function body.
    // If ANY activity, question, or its options fail to insert, the
    // mission row is rolled back — this also implicitly discards
    // whatever activities/questions/options already inserted earlier
    // in this same run, since they're all children of the mission row
    // — "never leave a half-built mission behind" now covers the full
    // three-level batch, not just one activity.
    for (const [activityIndex, activity] of activities.entries()) {
        // Same TypeScript-can't-see-Zod's-min(1) gap as
        // create-activity.ts's addActivity/updateActivity — fixed the
        // same way there after this file's own version of this bug
        // broke the build. Destructure + explicit guard instead of a
        // non-null assertion.
        const [firstQuestion] = activity.questions
        if (!firstQuestion) {
            await supabase.from('missions').delete().eq('id', mission.id)
            return { ok: false, error: `Activity ${activityIndex + 1} needs at least one question.` }
        }

        const { data: insertedActivity, error: activityError } = await supabase
            .from('activities')
            .insert({
                mission_id: mission.id,
                // prompt/activity_type are still NOT NULL columns on
                // `activities` per the existing schema — the container
                // itself has no real prompt anymore in this model, so
                // these are set from the activity's first question
                // purely to satisfy the columns, same as
                // create-activity.ts's addActivity does, never read
                // back anywhere that matters.
                prompt: firstQuestion.prompt,
                activity_type: firstQuestion.questionType,
                points: activity.questions.length,
                order_index: activityIndex,
                remediates_activity_id: activity.remediatesActivityId ?? null,
            })
            .select('id')
            .single()

        if (activityError || !insertedActivity) {
            await supabase.from('missions').delete().eq('id', mission.id)
            return { ok: false, error: `Could not save activity ${activityIndex + 1}. Please try again.` }
        }

        for (const [questionIndex, question] of activity.questions.entries()) {
            const hintText = question.hintText && question.hintText.trim() !== '' ? question.hintText.trim() : null

            const { data: insertedQuestion, error: questionError } = await supabase
                .from('activity_questions')
                .insert({
                    activity_id: insertedActivity.id,
                    prompt: question.prompt,
                    question_type: question.questionType,
                    points: 1,
                    hint_text: hintText,
                    order_index: questionIndex,
                })
                .select('id')
                .single()

            if (questionError || !insertedQuestion) {
                await supabase.from('missions').delete().eq('id', mission.id)
                return {
                    ok: false,
                    error: `Could not save activity ${activityIndex + 1}, question ${questionIndex + 1}. Please try again.`,
                }
            }

            const optionRows = buildOptionRows(
                insertedQuestion.id,
                question.questionType,
                question.options,
                question.correctAnswer
            )

            if ('error' in optionRows) {
                // Already validated up front above — this branch should
                // be unreachable, but handled rather than assumed
                // impossible, same defensive posture as the rest of
                // this file's error handling.
                await supabase.from('missions').delete().eq('id', mission.id)
                return { ok: false, error: optionRows.error }
            }

            const { error: optionsError } = await supabase.from('activity_question_options').insert(optionRows)

            if (optionsError) {
                // Same rollback principle — a half-saved question with
                // no options is just as much an "empty" mission in
                // practice.
                await supabase.from('missions').delete().eq('id', mission.id)
                return {
                    ok: false,
                    error: `Could not save the answer options for activity ${activityIndex + 1}, question ${questionIndex + 1}. Please try again.`,
                }
            }
        }
    }

    return { ok: true, missionId: mission.id }
}

// Loads a mission and its activities, including each activity's answer
// options, for the teacher to review while building it. Mirrors
// getQuizForTeacher, including its admin-client read-through:
// answer_options has SELECT fully revoked from `authenticated`
// (migration 019), and per HANDOFF.md's Day-1 note "RLS mirrors
// quizzes pattern exactly", activity_options is assumed to follow the
// same grant. That assumption isn't independently confirmed against a
// live grants dump here — worth a quick check the first time this runs
// against real data. If activity_options DOES grant authenticated
// SELECT, this still works fine, it's just a stricter read than
// strictly necessary since ownership was already verified above.
// MIGRATION 094 FIX (2026-09-01): activities are now containers —
// prompt/activity_type/hint_text no longer live on the activity row in
// any way that matters to the UI (still physically present as NOT NULL
// columns per addActivity's comment, but stale/unused). This now reads
// each activity's real activity_questions, each with its own
// activity_question_options nested inside — the shape ActivityCard.tsx
// and AddActivityForm.tsx consume directly as `activity.questions`.
export async function getMissionForTeacher(missionId: string) {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: mission } = await supabase
        .from('missions')
        .select(
            'id, title, description, lesson_id, is_published, mastery_threshold, reveal_correct_answer, shuffle_options, order_index, lessons!inner(title, course_id, courses!inner(teacher_id, title))'
        )
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return null
    }

    const supabaseAdmin = createAdminClient()
    const { data: activities, error: activitiesError } = await supabaseAdmin
        .from('activities')
        .select(
            'id, order_index, remediates_activity_id, activity_questions(id, prompt, question_type, hint_text, order_index, activity_question_options(id, option_text, is_correct, order_index))'
        )
        .eq('mission_id', missionId)
        .order('order_index')

    if (activitiesError) {
        console.error('getMissionForTeacher: failed to load activities', activitiesError)
    }

    const activitiesWithQuestions = (activities ?? []).map((a: any) => ({
        id: a.id,
        order_index: a.order_index,
        remediates_activity_id: a.remediates_activity_id,
        questions: [...(a.activity_questions ?? [])]
            .sort((x, y) => x.order_index - y.order_index)
            .map((q: any) => ({
                id: q.id,
                prompt: q.prompt,
                question_type: q.question_type,
                hint_text: q.hint_text,
                order_index: q.order_index,
                options: [...(q.activity_question_options ?? [])].sort(
                    (x: any, y: any) => x.order_index - y.order_index
                ),
            })),
    }))

    return { mission, activities: activitiesWithQuestions }
}

export type MissionSummary = {
    id: string
    title: string
    is_published: boolean
    order_index: number
    activityCount: number
}

// Lists missions for a lesson, teacher view — used on the lesson page
// to show what's already built plus a link to add more. This mirrors
// the shape MaterialList/listMaterials already established on that
// page (a list fetched server-side, handed to a small list
// component), not any quiz precedent — quizzes have no per-lesson list
// like this since they aren't lesson-scoped the way missions are.
export async function listMissionsForTeacher(lessonId: string): Promise<MissionSummary[]> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: lesson } = await supabase
        .from('lessons')
        .select('id, courses!inner(teacher_id)')
        .eq('id', lessonId)
        .single()

    if (!lesson || (lesson as any).courses.teacher_id !== user.id) {
        return []
    }

    const { data: missions, error } = await supabase
        .from('missions')
        .select('id, title, is_published, order_index, activities(id)')
        .eq('lesson_id', lessonId)
        .order('order_index')

    if (error) {
        console.error('listMissionsForTeacher: failed to load missions', error)
        return []
    }

    return (missions ?? []).map((m: any) => ({
        id: m.id,
        title: m.title,
        is_published: m.is_published,
        order_index: m.order_index,
        activityCount: (m.activities ?? []).length,
    }))
}

const updateMissionSettingsSchema = z.object({
    missionId: z.string().uuid(),
    title: z.string().min(2, 'Title is too short'),
    description: z.string().optional(),
    masteryThreshold: z.string().optional(),
    revealCorrectAnswer: z.string().optional(),
    shuffleOptions: z.string().optional(),
    publish: z.string().optional(),
})

export type UpdateMissionSettingsResult = { ok: true } | { ok: false; error: string }

// Combined title/description/mastery-threshold/publish setter — one
// Save button, same shape as saveQuizSettingsAndPublish, deliberately
// skipping quizzes' older per-field-setter pattern since missions have
// far fewer settings and quizzes itself moved away from that pattern
// on 2026-08-19. Publishing is one-way from here for the same reason
// saveQuizSettingsAndPublish made publish one-way: once live, a
// mission should not be silently unpublished via this form.
//
// NOT included here: a resetQuizAttempts equivalent. Resetting
// mission_progress/attempt_events after an edit is real Day-4
// territory (mission_progress has no direct write policy — writes are
// service-role only per HANDOFF.md's Day-1 note — so this needs a
// purpose-built RPC that doesn't exist yet, same family as
// reset_quiz_attempts). Flagging so this parity gap isn't silently
// lost before Day 4.
export async function updateMissionSettings(formData: FormData): Promise<UpdateMissionSettingsResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const parsed = updateMissionSettingsSchema.safeParse({
        missionId: formData.get('missionId'),
        title: formData.get('title'),
        description: formData.get('description') ?? undefined,
        masteryThreshold: formData.get('masteryThreshold') ?? undefined,
        revealCorrectAnswer: formData.get('revealCorrectAnswer') ?? undefined,
        shuffleOptions: formData.get('shuffleOptions') ?? undefined,
        publish: formData.get('publish') ?? undefined,
    })

    if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' }
    }

    const { missionId, title, description } = parsed.data

    const masteryThreshold = parsed.data.masteryThreshold ? Number(parsed.data.masteryThreshold) : 3
    if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
        return { ok: false, error: 'Mastery threshold must be at least 1.' }
    }

    const revealCorrectAnswer = parsed.data.revealCorrectAnswer !== 'false'
    const shuffleOptions = parsed.data.shuffleOptions === 'true'

    const { data: mission } = await supabase
        .from('missions')
        .select('id, is_published, lessons!inner(courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this mission.' }
    }

    const requestedPublish = parsed.data.publish === 'true'
    const publish = (mission as any).is_published ? true : requestedPublish

    const { data: updated, error } = await supabase
        .from('missions')
        .update({
            title,
            description: description && description.trim() !== '' ? description.trim() : null,
            mastery_threshold: masteryThreshold,
            reveal_correct_answer: revealCorrectAnswer,
            shuffle_options: shuffleOptions,
            is_published: publish,
        })
        .eq('id', missionId)
        .select('id')

    if (error) {
        return { ok: false, error: `Could not save this mission: ${error.message}` }
    }
    if (!updated || updated.length === 0) {
        return { ok: false, error: 'Could not save this mission — the update did not apply.' }
    }

    return { ok: true }
}

// GAP #2 FIX (2026-08-30, continued conversation): wipes every
// student's progress on this mission (mission_progress, attempt_events
// on its activities, activity_mastery on its activities) via the
// reset_mission_progress RPC (migration 093), mirroring
// resetQuizAttempts's exact shape for the equivalent quiz gap. See
// that migration's own header for why THREE tables need clearing here
// instead of quizzes' two.
//
// Ownership is enforced by the RPC itself (SECURITY DEFINER, explicit
// teacher_id check in SQL) — this action just calls it and translates
// the result, same pattern as deleteStreamItem for the RPC family.
export type ResetMissionProgressResult =
    | { ok: true; affectedStudents: number }
    | { ok: false; error: string }

export async function resetMissionProgress(missionId: string): Promise<ResetMissionProgressResult> {
    await requireRole(['teacher'])
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('reset_mission_progress', { p_mission_id: missionId })

    if (error) {
        return { ok: false, error: `Could not reset progress: ${error.message}` }
    }

    return { ok: true, affectedStudents: (data as number) ?? 0 }
}

// GAP #3 FIX (2026-08-30, continued conversation): a teacher-facing
// manual override for mission_progress, explicitly deferred when this
// table was first built — migration 082's own comment: "Teacher-facing
// manual override deferred (per request — settings to be added
// later)." No UI to mirror existed for this, so shaped after
// gradebook.ts/GradebookGrid.tsx's per-student-row pattern instead —
// closest existing "teacher looks at every enrolled student's state
// for one thing" precedent in this app, even though gradebook itself
// is read-only and this genuinely needs write actions per row.
//
// mission_progress has NO direct write policy for `authenticated`
// (confirmed in migration 082's own RLS section — by design, so a
// student can never write their own mastery) — so, same as
// submit-activity-attempt.ts's writes, this MUST go through the
// admin/service-role client, not the normal RLS-scoped one. Reads use
// the normal client (mission_progress DOES have a select policy for
// the owning teacher).

export type MissionProgressStatus = 'locked' | 'unlocked' | 'mastered'

// THESIS ML COMPONENT (2026-09-06): one flagged question for the
// teacher-facing "may need a check-in" surfacing. Sourced from
// mastery_shakiness_snapshots — see migration 102's header for the
// full design. Deliberately question-level, not just a count, so a
// teacher can actually act on WHICH question, not just "something."
export type FlaggedQuestion = {
    snapshotId: string
    questionId: string
    questionPrompt: string
    hintUses: number
    wrongCount: number
    daysSincePractice: number
    predictedShakyProbability: number
}

export type MissionProgressOverrideRow = {
    studentId: string
    studentName: string
    status: MissionProgressStatus
    correctStreak: number
    masteredAt: string | null
    // Whether this row reflects an ACTUAL mission_progress row, or the
    // computed bootstrapping default (no row yet) — same "no row =
    // default, computed at read time, nothing written" reasoning
    // get-mission-for-student.ts already established, reused here so
    // this teacher view can't silently disagree with what the student
    // actually sees. A teacher overriding a "default" row causes the
    // row to be created for the first time via the upsert below.
    hasRealRow: boolean
    flaggedQuestions: FlaggedQuestion[]
}

// One row per enrolled student, teacher-facing, for a single mission —
// current status/streak, with the same locked/unlocked bootstrapping
// default reasoning as getMissionsForStudent (get-mission-for-student.ts):
// a student with no mission_progress row defaults to 'unlocked' if this
// is the first published mission in its lesson, 'locked' otherwise.
// Reimplemented here rather than calling that function directly, since
// it's scoped to ONE student (requireRole(['student'])) and this needs
// EVERY enrolled student from a teacher's own session.
export async function getMissionProgressForTeacher(
    missionId: string
): Promise<{
    rows: MissionProgressOverrideRow[]
    masteryThreshold: number
    analytics: { totalPendingFlags: number; studentsWithFlags: number; modelTrainingExamples: number }
} | null> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()

    const { data: mission } = await supabase
        .from('missions')
        .select('id, lesson_id, order_index, mastery_threshold, lessons!inner(course_id, courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return null
    }

    const courseId = (mission as any).lessons.course_id

    // Is this the earliest published mission in its lesson? Needed for
    // the same bootstrapping-default reasoning get-mission-for-student.ts
    // uses — only the first mission in a lesson defaults to 'unlocked'
    // with no row.
    const { data: earlierPublished } = await supabase
        .from('missions')
        .select('id')
        .eq('lesson_id', mission.lesson_id)
        .eq('is_published', true)
        .lt('order_index', mission.order_index)
        .limit(1)
        .maybeSingle()

    const defaultStatus: MissionProgressStatus = earlierPublished ? 'locked' : 'unlocked'

    const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users!enrollments_student_id_fkey(full_name)')
        .eq('course_id', courseId)
        .eq('status', 'active')

    const students = (enrollments ?? [])
        .map((e: any) => ({ studentId: e.student_id as string, studentName: (e.users?.full_name as string) ?? 'Unknown' }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName))

    const { data: progressRows } = await supabase
        .from('mission_progress')
        .select('student_id, status, correct_streak, mastered_at')
        .eq('mission_id', missionId)

    const progressByStudent = new Map((progressRows ?? []).map((p) => [p.student_id, p]))

    // THESIS ML COMPONENT (2026-09-06): pending shakiness flags for
    // every question in this mission, joined with the question's own
    // prompt text so the teacher sees WHICH question, not just a
    // count. Reads via the regular client — migration 102's teacher
    // SELECT policy on mastery_shakiness_snapshots already scopes this
    // to missions this teacher owns, same ownership chain as
    // everywhere else in this function.
    const { data: activitiesForMission } = await supabase
        .from('activities')
        .select('id')
        .eq('mission_id', missionId)
    const activityIdsForMission = (activitiesForMission ?? []).map((a) => a.id)

    const { data: questionsForMission } = await supabase
        .from('activity_questions')
        .select('id, prompt')
        .in('activity_id', activityIdsForMission)
    const questionPromptById = new Map((questionsForMission ?? []).map((q) => [q.id, q.prompt]))
    const questionIdsForMission = (questionsForMission ?? []).map((q) => q.id)

    const { data: pendingSnapshots } = await supabase
        .from('mastery_shakiness_snapshots')
        .select('id, student_id, question_id, hint_uses, wrong_count, days_since_practice, predicted_shaky_probability')
        .in('question_id', questionIdsForMission)
        .eq('status', 'pending')

    const flaggedByStudent = new Map<string, FlaggedQuestion[]>()
    for (const snap of pendingSnapshots ?? []) {
        const list = flaggedByStudent.get(snap.student_id) ?? []
        list.push({
            snapshotId: snap.id,
            questionId: snap.question_id,
            questionPrompt: questionPromptById.get(snap.question_id) ?? 'Question',
            hintUses: snap.hint_uses,
            wrongCount: snap.wrong_count,
            daysSincePractice: snap.days_since_practice,
            predictedShakyProbability: snap.predicted_shaky_probability,
        })
        flaggedByStudent.set(snap.student_id, list)
    }

    // Model-wide (NOT mission-scoped) training count, for the simple
    // analytics summary — mastery_shakiness_model has no SELECT policy
    // for `authenticated` at all (migration 102: purely an internal
    // engine table), so this one read needs the admin client.
    const supabaseAdmin = createAdminClient()
    const { data: modelRow } = await supabaseAdmin
        .from('mastery_shakiness_model')
        .select('training_examples')
        .eq('id', 1)
        .single()

    const rows: MissionProgressOverrideRow[] = students.map((s) => {
        const existing = progressByStudent.get(s.studentId)
        const flaggedQuestions = flaggedByStudent.get(s.studentId) ?? []
        if (existing) {
            return {
                studentId: s.studentId,
                studentName: s.studentName,
                status: existing.status as MissionProgressStatus,
                correctStreak: existing.correct_streak,
                masteredAt: existing.mastered_at,
                hasRealRow: true,
                flaggedQuestions,
            }
        }
        return {
            studentId: s.studentId,
            studentName: s.studentName,
            status: defaultStatus,
            correctStreak: 0,
            masteredAt: null,
            hasRealRow: false,
            flaggedQuestions,
        }
    })

    const totalPendingFlags = rows.reduce((sum, r) => sum + r.flaggedQuestions.length, 0)
    const studentsWithFlags = rows.filter((r) => r.flaggedQuestions.length > 0).length

    return {
        rows,
        masteryThreshold: mission.mastery_threshold,
        analytics: {
            totalPendingFlags,
            studentsWithFlags,
            modelTrainingExamples: modelRow?.training_examples ?? 0,
        },
    }
}

export type ResetQuestionMasteryResult = { ok: true } | { ok: false; error: string }

/**
 * THESIS ML COMPONENT (2026-09-06): the teacher-facing action behind a
 * flagged question's "Reset" button. Two things happen, and BOTH are
 * required for the reset to actually mean anything:
 *
 * 1. question_mastery for this (student, question) goes back to
 *    'learning' with correct_streak 0 — so it genuinely re-enters this
 *    student's queue and can be re-earned for real.
 *
 * 2. mission_progress.status for this (student, mission) — IF it was
 *    'mastered' — flips back to 'unlocked'. This is NOT optional: per
 *    the Phase E mastery fix, a mission counts as mastered ONLY when
 *    every one of its questions is mastered, so a mission with one
 *    question just un-mastered genuinely isn't "mastered" anymore by
 *    that same rule — leaving mission_progress.status as 'mastered'
 *    would be inconsistent with it. It also has a hard functional
 *    reason: submit-question-attempt.ts treats status === 'mastered'
 *    as "this is a non-destructive replay," which SKIPS every mastery/
 *    ML write entirely. Without this flip, the student could answer
 *    the reset question again and NOTHING would actually be recorded
 *    — the reset would look real but silently do nothing.
 *
 * The matching pending snapshot is marked 'teacher_reset', NOT
 * 'confirmed_shaky' — this is a human decision, not an observed
 * student outcome, and must never be trained on as if it were one
 * (see migration 103's header).
 */
export async function resetQuestionMastery(
    missionId: string,
    studentId: string,
    questionId: string
): Promise<ResetQuestionMasteryResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: mission } = await supabase
        .from('missions')
        .select('id, lessons!inner(course_id, courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this mission.' }
    }

    const courseId = (mission as any).lessons.course_id

    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle()

    if (!enrollment) {
        return { ok: false, error: 'This student is not enrolled in this course.' }
    }

    // Defense in depth: confirm this question actually belongs to THIS
    // mission — never trust a client-supplied questionId without
    // checking it resolves to something inside the mission this
    // teacher is actually looking at.
    const { data: question } = await supabase
        .from('activity_questions')
        .select('id, activities!inner(mission_id)')
        .eq('id', questionId)
        .single()

    if (!question || (question as any).activities.mission_id !== missionId) {
        return { ok: false, error: 'This question does not belong to this mission.' }
    }

    const { error: masteryError } = await supabaseAdmin
        .from('question_mastery')
        .update({
            state: 'learning',
            correct_streak: 0,
            mastered_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq('student_id', studentId)
        .eq('question_id', questionId)

    if (masteryError) {
        return { ok: false, error: 'Could not reset this question.' }
    }

    // Only touch mission_progress if it was actually 'mastered' — see
    // this function's header for why leaving it 'mastered' would
    // silently defeat the whole point of the reset.
    const { data: missionProgress } = await supabaseAdmin
        .from('mission_progress')
        .select('status')
        .eq('student_id', studentId)
        .eq('mission_id', missionId)
        .maybeSingle()

    if (missionProgress?.status === 'mastered') {
        await supabaseAdmin
            .from('mission_progress')
            .update({ status: 'unlocked', mastered_at: null, updated_at: new Date().toISOString() })
            .eq('student_id', studentId)
            .eq('mission_id', missionId)
    }

    // Clear the flag — 'teacher_reset', never 'confirmed_shaky'. This
    // is a human decision, not a real observed outcome; it must never
    // be fed into the model's training.
    await supabaseAdmin
        .from('mastery_shakiness_snapshots')
        .update({ status: 'teacher_reset', resolved_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .eq('question_id', questionId)
        .eq('status', 'pending')

    return { ok: true }
}

export type OverrideMissionProgressAction = 'unlock' | 'lock' | 'mark_mastered' | 'reset_streak'

export type OverrideMissionProgressResult = { ok: true } | { ok: false; error: string }

// Applies one manual override to one student's mission_progress row —
// creating it for the first time if only the computed default existed
// before (hasRealRow: false above). Uses the ADMIN client for the
// actual write, per this function's own header note.
export async function overrideMissionProgress(
    missionId: string,
    studentId: string,
    action: OverrideMissionProgressAction
): Promise<OverrideMissionProgressResult> {
    const user = await requireRole(['teacher'])
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    const { data: mission } = await supabase
        .from('missions')
        .select('id, lessons!inner(course_id, courses!inner(teacher_id))')
        .eq('id', missionId)
        .single()

    if (!mission || (mission as any).lessons.courses.teacher_id !== user.id) {
        return { ok: false, error: 'You do not have access to this mission.' }
    }

    const courseId = (mission as any).lessons.course_id

    // Confirm the student is actually enrolled in this mission's course
    // — a teacher shouldn't be able to write a mission_progress row for
    // an arbitrary student id that was never enrolled here.
    const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle()

    if (!enrollment) {
        return { ok: false, error: 'This student is not enrolled in this course.' }
    }

    let updates: Record<string, unknown>

    switch (action) {
        case 'unlock':
            updates = { status: 'unlocked' }
            break
        case 'lock':
            updates = { status: 'locked', correct_streak: 0, mastered_at: null }
            break
        case 'mark_mastered':
            updates = { status: 'mastered', mastered_at: new Date().toISOString() }
            break
        case 'reset_streak':
            updates = { correct_streak: 0, mastered_at: null }
            break
    }

    const { error } = await supabaseAdmin.from('mission_progress').upsert(
        {
            mission_id: missionId,
            student_id: studentId,
            updated_at: new Date().toISOString(),
            ...updates,
        },
        { onConflict: 'mission_id,student_id' }
    )

    if (error) {
        return { ok: false, error: 'Could not update this student\u2019s progress.' }
    }

    return { ok: true }
}