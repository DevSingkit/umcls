'use client'
// features/missions/components/ActivityRunner.tsx
//
// MIGRATION 094 REWRITE (2026-09-01): an activity is now a container
// of multiple questions — the in-session queue this component owns
// (Phase 3's live requeue system) now operates at QUESTION
// granularity, not activity granularity. Structurally this is the
// same "wrong/unmastered items get reinserted 1-3 spots deeper"
// system as before, just flattened one level: every
// {activityId, questionId} pair across every activity in the mission
// goes into one queue, instead of one entry per activity.
//
// UI COPY RULE, UPDATED 2026-09-07: "streak" language is reserved for
// QUESTION-level feedback only. The "X/Y Questions Mastered" indicator
// this rule used to also cover has been REMOVED from the UI entirely
// (see below) — students should not see how many attempts mastery
// takes, so there's no longer a rendered mastery-count to word-choice
// about at all.
//
// MISSION-LEVEL UI UNCHANGED: the top progress bar, streak flame
// counter, and full-screen mastery celebration are all still driven by
// the mission-wide correctStreak/masteryThreshold exactly as before —
// migration 094 didn't touch that layer at all.
//
// REMEDIATION STAYS ACTIVITY-LEVEL: submit-question-attempt.ts returns
// remediationActivityId (an activity id), matching what the teacher UI
// actually configures. When following one, this component shows that
// activity's FIRST question — a reasonable default since remediation
// activities aren't guaranteed to correspond 1:1 with the question
// that triggered them.
//
// 2026-09-07 PASS — several changes together, summarized here since
// they touch overlapping parts of this file:
//   1. UNLOCK-CHAIN BUG: not fixed here at all — the actual fix lives
//      in get-mission-for-student.ts (a bootstrapping-logic bug, not
//      a runtime bug), see that file for detail.
//   2. REVIEW MODE: `isReviewMode` (true when every question in every
//      activity is already mastered) now drives an entirely separate,
//      client-only, visual-only progression layer — see reviewStreaksRef
//      and the isReviewMode branch inside handleCheck. NOTHING here
//      writes to the database in review mode; the server already
//      guaranteed that (submit-question-attempt.ts's
//      isReviewOfMasteredMission branch), this only makes the CLIENT
//      stop reflecting the server's frozen real numbers and instead
//      show a genuine, resettable, session-local progression, ending
//      in the same mastery celebration screen again once a full
//      review pass completes.
//   3/4. Bigger, more prominent "Let's review again!" badge; new
//      persistent "Review mode" banner while isReviewMode is true.
//   5. The "X/Y Questions Mastered" pill is gone from the UI entirely.
//   6. Review mode now has a real stopping point (triggers the mastery
//      screen again) instead of cycling forever with no signal.
//   9. Praise message moved from below the tile grid to between the
//      question and the grid; "N in a row!" text removed, "Nice job!"
//      is now the only text shown for a correct answer.
//   10. A plain wrong answer now re-shows the SAME question after a
//      short pause (see the wrong-answer auto-retry effect) instead of
//      shuffling into the queue — replaces the old manual "Keep going"
//      button and its gap-reinsertion path. Remediation (a real,
//      deliberate fork) still stays a manual button, unaffected.
//   11. No more "Check answer" button — tapping a tile submits
//      immediately (handleSelectOption calls handleCheck directly,
//      passing the tapped option id rather than reading async state).
//      Mis-taps are accepted as a real answer, per explicit
//      confirmation — no "confirm before submitting" step was added.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Circle,
    Square,
    Triangle,
    Diamond,
    RotateCcw,
    Lightbulb,
    Star,
    Sparkles,
    Flame,
    Pause,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { submitQuestionAttempt } from '@/features/missions/actions/submit-question-attempt'
import type { MissionPreviewForStudent, ActivityPreviewForStudent, QuestionPreviewForStudent } from '@/features/missions/actions/get-mission-for-student'
import { TTSButton } from '@/components/ui/TTSButton'
import { useAudioFX } from '@/lib/utils/useAudioFX'

const MISSION_MASTERY_STREAK_TARGET_FALLBACK = 3 // only used if masteryThreshold is ever missing
const QUESTION_MASTERY_STREAK_TARGET = 3

// Same 4-color/4-shape tile system as before — color AND shape carry
// meaning together (not color alone), still cycling through the same
// four brand-safe tokens. `amber` fixed to `warning` in the earlier
// design pass; unchanged here.
const TILE_STYLES = [
    { icon: Circle, bg: 'bg-brand', ring: 'ring-brand', border: 'border-brand-border' },
    { icon: Square, bg: 'bg-info', ring: 'ring-info', border: 'border-gamified-pink-dark' },
    { icon: Triangle, bg: 'bg-warning', ring: 'ring-warning', border: 'border-[#C47A30]' },
    { icon: Diamond, bg: 'bg-brand-hover', ring: 'ring-brand-hover', border: 'border-brand-border' },
]

// PHASE C GRID FIX (2026-09-04): the answer grid was a hardcoded
// grid-cols-2 regardless of option count. That's fine for 2 or 4
// options, but breaks down for odd counts (5 options -> a lone 5th
// tile stranded alone in the left column, an ugly empty gap on the
// right where nothing was ever there to fill it) and gets needlessly
// tall for 5-6 options (3 stacked rows at the same big min-h as a
// 2-option question can push "Check answer" off-screen). This keeps
// the exact same tile look (icon-left/label-right, same colors) —
// only the column count, tile height, and icon/text size scale with
// how many options and rows there actually are.
function getGridLayout(optionCount: number) {
    const lgColsClass = getDesktopColsClass(optionCount)
    if (optionCount <= 2) {
        return { colsClass: 'grid-cols-2', lgColsClass, tileMinH: 'min-h-[120px]', padding: 'p-6', iconSize: 28, textSize: 'text-base', rows: 1 }
    }
    if (optionCount === 3) {
        // 3 divides evenly into a single row of 3 — no leftover gap,
        // but each column is narrower, so the tile shrinks to fit.
        return { colsClass: 'grid-cols-3', lgColsClass, tileMinH: 'min-h-[100px]', padding: 'p-3', iconSize: 20, textSize: 'text-sm', rows: 1 }
    }
    // 4+: stay in 2 columns (4 = a clean 2x2). For 5-6 that's 3 rows,
    // so the tile shrinks a step further to keep the whole grid from
    // growing taller than 4's 2x2 footprint. Desktop (lgColsClass)
    // ignores all of this — it always fits every option in one row
    // regardless of count, since desktop has far more width to spend.
    const rows = Math.ceil(optionCount / 2)
    if (rows >= 3) {
        return { colsClass: 'grid-cols-2', lgColsClass, tileMinH: 'min-h-[76px]', padding: 'p-3', iconSize: 20, textSize: 'text-sm', rows }
    }
    return { colsClass: 'grid-cols-2', lgColsClass, tileMinH: 'min-h-[100px]', padding: 'p-4', iconSize: 24, textSize: 'text-base', rows }
}

// Fisher-Yates, not .sort(() => Math.random() - 0.5) — that's a
// well-known biased shuffle. Pure function, takes a copy, never
// mutates its input.
function shuffleArray<T>(items: T[]): T[] {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const temp = copy[i]!
        copy[i] = copy[j]!
        copy[j] = temp
    }
    return copy
}

// DESKTOP SIZING (2026-09-05): desktop has far more width than the
// 360-430px mobile viewport this whole grid was originally tuned for,
// so it doesn't need the same row-count-driven shrinking mobile does
// — a single row fits comfortably even at 6 options. Returns a
// literal, Tailwind-scanner-safe class string (a computed template
// string like `lg:grid-cols-${count}` would never get generated,
// since Tailwind's JIT scans for literal class names in source).
function getDesktopColsClass(optionCount: number): string {
    switch (optionCount) {
        case 2: return 'lg:grid-cols-2'
        case 3: return 'lg:grid-cols-3'
        case 4: return 'lg:grid-cols-4'
        case 5: return 'lg:grid-cols-5'
        default: return 'lg:grid-cols-6'
    }
}

type QueueItem = { activityId: string; questionId: string }

type Feedback = {
    isCorrect: boolean
    remediationActivityId: string | null
    correctOptionId: string | null
    correctOptionText: string | null
    questionCorrectStreak: number
}

function flattenQueue(activities: ActivityPreviewForStudent[]): QueueItem[] {
    const items: QueueItem[] = []
    for (const activity of activities) {
        for (const question of activity.questions) {
            items.push({ activityId: activity.id, questionId: question.id })
        }
    }
    return items
}

function findQuestion(
    activities: ActivityPreviewForStudent[],
    activityId: string,
    questionId: string
): { activity: ActivityPreviewForStudent; question: QuestionPreviewForStudent } | null {
    const activity = activities.find((a) => a.id === activityId)
    if (!activity) return null
    const question = activity.questions.find((q) => q.id === questionId)
    if (!question) return null
    return { activity, question }
}

export function ActivityRunner({
    mission,
    courseId,
    lessonId,
    initialCorrectStreak,
}: {
    mission: MissionPreviewForStudent
    courseId: string
    lessonId: string
    initialCorrectStreak: number
}) {
    const router = useRouter()
    const { playCorrect, playRetry } = useAudioFX()

    // REVIEW MODE (2026-09-07): true when EVERY question in EVERY
    // activity of this mission is already mastered — i.e. this whole
    // session is a non-destructive replay (see submit-question-
    // attempt.ts's isReviewOfMasteredMission branch, which never
    // writes anything for a session like this). Computed once from
    // data already in the `mission` prop — no new prop or server call
    // needed. An empty mission (no activities/questions at all) is
    // never review mode, matching the same "empty ≠ vacuously
    // mastered" reasoning get-mission-for-student.ts's own rollup
    // already uses.
    const isReviewMode =
        mission.activities.length > 0 &&
        mission.activities.every((a) => a.questions.length > 0 && a.questions.every((q) => q.isMastered))

    const [queue, setQueue] = useState<QueueItem[]>(() => flattenQueue(mission.activities))
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Feedback | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Seeded to 0 in review mode rather than the real (already-maxed)
    // initialCorrectStreak — see this component's header comment for
    // why review mode needs its own fully independent, visual-only
    // progression instead of reflecting the frozen real numbers.
    const [correctStreak, setCorrectStreak] = useState(isReviewMode ? 0 : initialCorrectStreak)
    const [showMastered, setShowMastered] = useState(false)
    const [unlockedNextMission, setUnlockedNextMission] = useState(false)
    const [overrideActivityId, setOverrideActivityId] = useState<string | null>(null)
    const [showPauseMenu, setShowPauseMenu] = useState(false)
    // TAP-TO-REVEAL HINT (2026-09-05): replaces the old auto-show-
    // after-2-wrong. Hint text is already available up front in
    // activeQuestion.hintText — this only tracks whether THIS student
    // chose to tap it open for THIS question, reset whenever the
    // active question changes (see the effect below).
    const [hintRevealed, setHintRevealed] = useState(false)

    // Per-QUESTION streak cache — seeded from each question's own
    // initialCorrectStreak, updated locally after every submit so the
    // requeue decision (mastered this session -> drop from queue) never
    // has to wait on a server round-trip to know the current count.
    const questionStreaksRef = useRef<Record<string, number>>(
        Object.fromEntries(
            mission.activities.flatMap((a) => a.questions.map((q) => [q.id, q.initialCorrectStreak]))
        )
    )
    // REVIEW MODE (2026-09-07): a SEPARATE streak tracker, used only
    // when isReviewMode is true, starting empty (every question reads
    // as 0 via the `?? 0` default wherever this is read). Deliberately
    // NOT seeded from real data, unlike questionStreaksRef above —
    // review mode needs to start from a genuine visual zero and climb
    // purely client-side. Never written to the database; nothing here
    // ever calls a server action other than the same submitQuestionAttempt
    // every mode already calls, which itself performs no writes during
    // a review session (see submit-question-attempt.ts).
    const reviewStreaksRef = useRef<Record<string, number>>({})
    // Per-ACTIVITY rollup cache — kept updating internally in real mode
    // (still useful data), but no longer rendered anywhere (the "X/Y
    // Questions Mastered" indicator was removed from the UI entirely
    // on 2026-09-07 — students should not see how many attempts
    // mastery takes). Left in place rather than stripped out, since
    // removing it risks missing some other future use of the same
    // data with more edit churn than leaving inert state costs.
    const [activityRollups, setActivityRollups] = useState<
        Record<string, { masteredCount: number; totalCount: number }>
    >(
        Object.fromEntries(
            mission.activities.map((a) => [a.id, { masteredCount: a.masteredQuestionCount, totalCount: a.totalQuestionCount }])
        )
    )

    // Which questions have already been seen once this session — drives
    // the "Let's review again!" requeue badge, same as before.
    const seenThisSessionRef = useRef<Set<string>>(new Set())
    const [, forceRerenderTick] = useState(0)

    const masteryThreshold = mission.masteryThreshold || MISSION_MASTERY_STREAK_TARGET_FALLBACK

    const activeItem = queue[0] ?? null

    const active = useMemo(() => {
        if (overrideActivityId) {
            const remediationActivity = mission.activities.find((a) => a.id === overrideActivityId)
            const firstQuestion = remediationActivity?.questions[0]
            if (remediationActivity && firstQuestion) {
                return { activity: remediationActivity, question: firstQuestion }
            }
        }
        if (!activeItem) return null
        return findQuestion(mission.activities, activeItem.activityId, activeItem.questionId)
    }, [overrideActivityId, activeItem, mission.activities])

    const activeActivity = active?.activity ?? null
    const activeQuestion = active?.question ?? null
    const activeRollup = activeActivity ? activityRollups[activeActivity.id] : null

    // Shuffle is resolved here, client-side, per question — stable
    // across re-renders of the SAME question (selecting an option,
    // getting feedback back) via the activeQuestion.id dependency, but
    // reshuffled fresh the next time this question comes up in the
    // queue. Safe to shuffle client-side: is_correct is never sent to
    // the client at all (see get-mission-for-student.ts), so shuffling
    // here has no security implication, only a display one.
    const displayOptions = useMemo(() => {
        if (!activeQuestion) return []
        return mission.shuffleOptions ? shuffleArray(activeQuestion.options) : activeQuestion.options
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeQuestion?.id, mission.shuffleOptions])

    const isReturningQuestion = activeQuestion ? seenThisSessionRef.current.has(activeQuestion.id) : false

    function markSeen(questionId: string) {
        seenThisSessionRef.current.add(questionId)
        forceRerenderTick((n) => n + 1)
    }

    function handleSelectOption(optionId: string) {
        // CONTINUOUS MODE (2026-09-07): tapping a tile IS the answer —
        // no separate "Check answer" button anymore. isSubmitting guard
        // prevents a rapid double-tap from firing two submits for the
        // same answer.
        if (feedback || isSubmitting) return
        setSelectedOptionId(optionId)
        handleCheck(optionId)
    }

    async function handleCheck(optionId: string) {
        if (!activeQuestion || !activeActivity) return
        setIsSubmitting(true)
        setError(null)

        const result = await submitQuestionAttempt({
            activityId: activeActivity.id,
            questionId: activeQuestion.id,
            selectedOptionId: optionId,
            hintWasVisible: hintRevealed,
        })

        setIsSubmitting(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        markSeen(activeQuestion.id)

        // Audio FX feedback
        if (result.isCorrect) playCorrect()
        else if (!result.remediationActivityId) playRetry()

        if (isReviewMode) {
            // REVIEW MODE (2026-09-07): the server never writes
            // anything for this session and always reports this
            // question's REAL, FROZEN streak (already at target) no
            // matter what's actually tapped here — see submit-
            // question-attempt.ts's isReviewOfMasteredMission branch.
            // Using that frozen number would mean review mode could
            // never visually reset like a first attempt. So review
            // mode tracks its own fully independent, client-only
            // streak (reviewStreaksRef) and mission-wide streak
            // (correctStreak state) — neither ever reads
            // result.questionCorrectStreak or result.correctStreak.
            // Nothing here writes to the database; this is purely a
            // visual "start fresh" layer over data that never actually
            // changes underneath it. The ORIGINAL mastery-shakiness
            // snapshot (captured at the true first-mastery moment,
            // migration 102) is completely unaffected by any of this.
            const newLocalStreak = result.isCorrect
                ? (reviewStreaksRef.current[activeQuestion.id] ?? 0) + 1
                : 0
            reviewStreaksRef.current[activeQuestion.id] = newLocalStreak
            setCorrectStreak((prev) => (result.isCorrect ? prev + 1 : 0))

            const everyQuestionLocallyMastered = mission.activities.every((a) =>
                a.questions.every((q) => (reviewStreaksRef.current[q.id] ?? 0) >= QUESTION_MASTERY_STREAK_TARGET)
            )

            if (result.isCorrect && everyQuestionLocallyMastered) {
                // A full review pass just completed — stop here rather
                // than refilling the queue and cycling forever. Same
                // celebration screen as real first mastery, just with
                // different wording (see the showMastered screen below).
                setShowMastered(true)
                return
            }

            setFeedback({
                isCorrect: result.isCorrect,
                remediationActivityId: null, // remediation stays a real-mode-only concept
                correctOptionId: result.correctOptionId,
                correctOptionText: result.correctOptionText,
                questionCorrectStreak: newLocalStreak,
            })
            return
        }

        // Real (non-review) mode — unchanged behavior from before.
        questionStreaksRef.current[activeQuestion.id] = result.questionCorrectStreak
        setActivityRollups((prev) => ({
            ...prev,
            [activeActivity.id]: {
                masteredCount: result.activityMasteredQuestionCount,
                totalCount: result.activityTotalQuestionCount,
            },
        }))
        setCorrectStreak(result.correctStreak)

        if (result.unlockedNextMissionId) setUnlockedNextMission(true)

        if (result.justMastered) {
            setShowMastered(true)
            // Fire confetti on mastery
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } })
            return
        }

        setFeedback({
            isCorrect: result.isCorrect,
            remediationActivityId: result.remediationActivityId,
            correctOptionId: result.correctOptionId,
            correctOptionText: result.correctOptionText,
            questionCorrectStreak: result.questionCorrectStreak,
        })
    }

    function advanceQueue() {
        if (!activeItem) return
        const finishedQuestionId = activeItem.questionId
        const rest = queue.slice(1)
        // Review mode tracks its own separate streak — see
        // reviewStreaksRef's declaration above for why.
        const streakRef = isReviewMode ? reviewStreaksRef : questionStreaksRef
        const nowMastered = (streakRef.current[finishedQuestionId] ?? 0) >= QUESTION_MASTERY_STREAK_TARGET

        let nextQueue: QueueItem[]
        if (nowMastered) {
            nextQueue = rest
        } else {
            const gap = Math.min(rest.length, 1 + Math.floor(Math.random() * 3))
            nextQueue = [...rest.slice(0, gap), activeItem, ...rest.slice(gap)]
        }

        // Queue emptied without every question mastered yet (mission
        // not complete, just ran through everything once) — refill from
        // the full set so the session keeps going rather than stalling.
        if (nextQueue.length === 0) {
            nextQueue = flattenQueue(mission.activities)
        }

        setQueue(nextQueue)
        setSelectedOptionId(null)
        setFeedback(null)
        setOverrideActivityId(null)
    }

    function handleContinueAfterCorrect() {
        advanceQueue()
    }

    function handleGoToRemediation() {
        if (!feedback?.remediationActivityId) return
        setOverrideActivityId(feedback.remediationActivityId)
        setSelectedOptionId(null)
        setFeedback(null)
    }

    function exitToLesson() {
        router.push(`/student/courses/${courseId}`)
        router.refresh()
    }

    // Reset the hint reveal per question — a hint tapped open on
    // question A must not still be showing when the queue moves to
    // question B.
    useEffect(() => {
        setHintRevealed(false)
    }, [activeQuestion?.id])

    // AUTO-ADVANCE ON CORRECT (2026-09-05): move to the next question
    // automatically after a short delay instead of waiting on a manual
    // "Continue" tap. Cleared on unmount/dependency change so a
    // Pause-tap or Quit mid-delay can't fire a stale advance after the
    // component's gone.
    useEffect(() => {
        if (!feedback?.isCorrect) return
        const timer = setTimeout(() => {
            handleContinueAfterCorrect()
        }, 3000)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedback])

    // WRONG-ANSWER AUTO-RETRY (2026-09-07): re-shows the SAME question
    // after a brief pause instead of shuffling to a different one —
    // replaces the old manual "Keep going" button/gap-reinsertion path
    // for the ordinary wrong-answer case. Deliberately does NOT
    // advance the queue at all — activeItem stays exactly where it was,
    // so the identical question renders again, letting the student try
    // a different option right where they are. Skipped once
    // remediation becomes available (feedback.remediationActivityId
    // set, real mode only) — that's still a deliberate manual fork the
    // student/teacher should see and choose, not something to silently
    // skip past.
    useEffect(() => {
        if (!feedback || feedback.isCorrect || feedback.remediationActivityId) return
        const timer = setTimeout(() => {
            setSelectedOptionId(null)
            setFeedback(null)
        }, 1800)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedback])

    if (queue.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="font-sans text-body-md text-text-secondary">This mission has no activities yet.</p>
                <button
                    type="button"
                    onClick={exitToLesson}
                    className="font-sans text-body-emphasis text-brand hover:underline"
                >
                    ← Back to lesson
                </button>
            </div>
        )
    }

    if (showMastered) {
        return (
            <div className="fixed inset-0 z-50 bg-brand flex flex-col items-center justify-center gap-6 px-6 text-center">
                <span className="motion-safe:animate-bounce-in flex h-28 w-28 items-center justify-center rounded-pill bg-surface text-warning shadow-modal">
                    <Star size={56} fill="currentColor" aria-hidden="true" />
                </span>
                <div className="flex items-center justify-center gap-2">
                    <Sparkles size={26} className="text-on-ink" aria-hidden="true" />
                    <p className="font-heading text-h1 text-on-ink">
                        {isReviewMode ? 'Mastered again!' : 'Mission mastered!'}
                    </p>
                    <Sparkles size={26} className="text-on-ink" aria-hidden="true" />
                </div>
                <p className="font-sans text-body-lg text-on-ink/90">
                    You got {masteryThreshold} in a row on &quot;{mission.title}&quot;.
                </p>
                {unlockedNextMission && (
                    <p className="font-sans text-body-emphasis text-brand bg-surface inline-block rounded-pill px-5 py-2 shadow-clay-card">
                        A new mission just unlocked!
                    </p>
                )}
                <button
                    type="button"
                    onClick={exitToLesson}
                    className="clay-button mt-2 px-10 bg-surface text-brand font-heading text-lg uppercase tracking-wide border-hairline-strong shadow-modal hover:scale-105"
                >
                    Back to missions
                </button>
            </div>
        )
    }

    if (!activeQuestion || !activeActivity) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="font-sans text-body-md text-text-secondary">This mission has no activities yet.</p>
                <button
                    type="button"
                    onClick={exitToLesson}
                    className="font-sans text-body-emphasis text-brand hover:underline"
                >
                    ← Back to lesson
                </button>
            </div>
        )
    }

    const gridLayout = getGridLayout(activeQuestion.options.length)

    return (
        <div className="min-h-screen flex flex-col">
            {/* ── Compact header: pause + streak progress + hint indicator
                all in one row, so the rest of the screen (question,
                answers) gets the space instead. ─────────────────────── */}
            <div className="px-4 sm:px-8 pt-3 pb-2 space-y-2">
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-3 rounded-pill bg-hairline overflow-hidden">
                        <div
                            className="h-full bg-brand rounded-pill transition-[width] duration-300"
                            style={{ width: `${Math.min(100, (correctStreak / masteryThreshold) * 100)}%` }}
                        />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Flame
                            size={20}
                            className={correctStreak > 0 ? 'text-warning' : 'text-text-muted'}
                            fill={correctStreak > 0 ? 'currentColor' : 'none'}
                            aria-hidden="true"
                        />
                        <span className="font-sans text-body-emphasis text-ink">{correctStreak}</span>
                    </div>
                    {/* TAP-TO-REVEAL HINT (2026-09-05): a real button now,
                        not a passive indicator. Only rendered when this
                        question actually has hint text — nothing to tap
                        otherwise. Tapping just flips local state; the
                        actual hint_uses log happens server-side on the
                        next answer submit via hintWasVisible above. */}
                    {activeQuestion.hintText && !feedback && (
                        <button
                            type="button"
                            onClick={() => setHintRevealed(true)}
                            aria-label="Show hint"
                            aria-pressed={hintRevealed}
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill transition-colors ${
                                hintRevealed
                                    ? 'bg-info text-white'
                                    : 'bg-info-soft text-info hover:bg-info/20'
                            }`}
                        >
                            <Lightbulb size={18} aria-hidden="true" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowPauseMenu(true)}
                        aria-label="Pause mission"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-ink-soft hover:bg-hairline transition-colors"
                    >
                        <Pause size={18} aria-hidden="true" />
                    </button>
                </div>

                {/* NEW (2026-09-07): the "X/Y Questions Mastered" pill
                    that used to live here is gone entirely — students
                    should not see how many attempts mastery takes.
                    Replaced with a persistent, prominent review-mode
                    banner instead of a small pill, per explicit
                    request that this kind of context "is too little to
                    be noticed." */}
                {isReviewMode && (
                    <div className="flex items-center gap-2 rounded-2xl bg-gamified-purple/10 border-2 border-gamified-purple px-4 py-3">
                        <RotateCcw size={22} className="text-gamified-purple shrink-0" aria-hidden="true" />
                        <p className="font-sans text-body-emphasis lg:text-lg font-bold text-gamified-purple flex-1">
                            Review mode — you already mastered this! Just for fun.
                        </p>
                        <TTSButton text="Review mode. You already mastered this! Just for fun." />
                    </div>
                )}

                {(overrideActivityId || (isReturningQuestion && !overrideActivityId)) && (
                    <div className="flex flex-wrap items-center gap-2">
                        {overrideActivityId && (
                            <span className="font-sans text-caption font-semibold text-info bg-info-soft rounded-pill px-3 py-1">
                                Related question
                            </span>
                        )}
                        {isReturningQuestion && !overrideActivityId && (
                            <div className="flex items-center gap-2 rounded-md bg-warning-soft border-2 border-warning px-4 py-3">
                                <RotateCcw size={20} className="text-warning shrink-0" aria-hidden="true" />
                                <p className="font-sans text-body-emphasis lg:text-lg font-bold text-warning">
                                    Let&apos;s review again!
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Question + praise: floats centered in whatever space is
                left above the answer block, same "middle of screen"
                feel as before. Praise now renders ABOVE the tile grid
                (moved here from below it, 2026-09-07) and is the ONLY
                text shown for a correct answer — the streak-count
                sentence that used to sit alongside it was removed. ── */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 sm:px-8 py-4 max-w-2xl lg:max-w-4xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <p className="text-center font-heading text-mission md:text-[1.75rem] lg:text-4xl text-ink">
                        {activeQuestion.prompt}
                    </p>
                    <TTSButton text={activeQuestion.prompt} />
                </div>
                {feedback?.isCorrect && (
                    <div className="flex items-center gap-2 text-success motion-safe:animate-wiggle">
                        <Sparkles size={24} aria-hidden="true" />
                        <span className="font-heading text-lg lg:text-2xl uppercase tracking-wide">Nice job!</span>
                        <Sparkles size={24} aria-hidden="true" />
                    </div>
                )}
            </div>

            {/* ── Answer grid + Check/feedback buttons: kept together as
                ONE block anchored near the bottom of the screen, so the
                tiles a student just tapped are right next to the button
                they need next — no reach back up the screen. For 5-6
                options (3 rows) the grid is taller, so this block gets
                a bit more top padding to keep it from feeling jammed
                right under the question. DESKTOP (2026-09-05): mobile
                sizing below is untouched — every lg: class here is a
                pure addition on top of it, never a replacement, so
                nothing about the phone layout changes. ───────────────── */}
            <div
                className={`px-4 sm:px-8 pb-6 sm:pb-8 lg:pb-12 max-w-2xl lg:max-w-4xl mx-auto w-full space-y-4 lg:space-y-8 ${
                    gridLayout.rows >= 3 ? 'pt-8 sm:pt-10' : 'pt-2'
                } lg:pt-6`}
            >
                <div className={`grid ${gridLayout.colsClass} ${gridLayout.lgColsClass} gap-3 lg:gap-4`}>
                    {displayOptions.map((option, i) => {
                        const style = TILE_STYLES[i % TILE_STYLES.length] ?? TILE_STYLES[0]!
                        const Icon = style.icon
                        const isSelected = selectedOptionId === option.id
                        const isCorrectAnswer = feedback && feedback.isCorrect && isSelected
                        const isWrongAnswer = feedback && !feedback.isCorrect && isSelected
                        // TILE-HIGHLIGHT REVEAL (2026-09-05): replaces the
                        // old text banner entirely — the correct answer is
                        // now shown by ringing the actual tile, not a
                        // separate sentence. Only true when this mission's
                        // reveal_correct_answer is on (feedback.correctOptionId
                        // is null otherwise, same gating as before).
                        const isRevealedCorrect =
                            feedback && !feedback.isCorrect && feedback.correctOptionId === option.id
                        const isLast = i === displayOptions.length - 1
                        // Odd option count in a 2-column grid leaves the
                        // last tile alone in the left column with a dead
                        // gap on the right — span it full-width instead.
                        const spanFull =
                            gridLayout.colsClass === 'grid-cols-2' &&
                            displayOptions.length % 2 === 1 &&
                            isLast
                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={Boolean(feedback) || isSubmitting}
                                onClick={() => handleSelectOption(option.id)}
                                className={[
                                    `flex ${gridLayout.tileMinH} lg:min-h-[140px] w-full items-center gap-3 lg:gap-4 rounded-2xl ${gridLayout.padding} lg:p-6 text-left font-sans font-bold ${gridLayout.textSize} lg:text-xl text-on-ink shadow-clay-button border-b-[6px] transition-all active:border-b-0 active:translate-y-1 active:shadow-none`,
                                    style.bg,
                                    style.border,
                                    spanFull ? 'col-span-2' : '',
                                    isSelected ? `ring-4 ${style.ring} ring-offset-2` : '',
                                    isCorrectAnswer ? 'ring-4 ring-success ring-offset-2 motion-safe:animate-wiggle' : '',
                                    isRevealedCorrect ? 'ring-4 ring-success ring-offset-2' : '',
                                    isWrongAnswer ? 'opacity-50' : '',
                                    feedback && !isSelected && !isRevealedCorrect ? 'opacity-50' : '',
                                ].join(' ')}
                            >
                                <Icon size={gridLayout.iconSize} className="lg:hidden shrink-0" aria-hidden="true" />
                                <Icon size={32} className="hidden lg:block shrink-0" aria-hidden="true" />
                                <span>{option.optionText}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Desktop-only extra breathing room. */}
                <div className="hidden lg:block h-2" />

                {/* TAP-TO-REVEAL HINT (2026-09-05): shown whenever the
                    student has tapped the hint button, independent of
                    whether they've answered yet — replaces the old
                    auto-after-2-wrong banner tied to feedback state. */}
                {hintRevealed && activeQuestion.hintText && (
                    <div className="flex items-start gap-2 font-sans text-body-md lg:text-lg text-info bg-info-soft rounded-2xl px-4 py-3 font-medium">
                        <Lightbulb size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="flex-1">Hint: {activeQuestion.hintText}</span>
                        <TTSButton text={`Hint: ${activeQuestion.hintText}`} />
                    </div>
                )}

                {error && (
                    <p className="font-sans text-caption text-error text-center" role="alert">
                        {error}
                    </p>
                )}

                {/* CONTINUOUS MODE (2026-09-07): no "Check answer" button
                    anymore — tapping a tile submits immediately (see
                    handleSelectOption). No "Keep going" button either —
                    a plain wrong answer auto-retries the SAME question
                    after a short pause (see the wrong-answer auto-retry
                    effect above). The ONLY manual button left in this
                    whole flow is remediation below — a real fork worth
                    a deliberate choice, not something to auto-skip. */}
                {feedback && !feedback.isCorrect && feedback.remediationActivityId && (
                    <button
                        type="button"
                        onClick={handleGoToRemediation}
                        className="clay-button w-full lg:min-h-[80px] bg-brand hover:bg-brand-hover text-white font-heading text-lg lg:text-2xl uppercase tracking-wide flex items-center justify-center"
                    >
                        Try a related question first
                    </button>
                )}
            </div>

            {/* ── Pause sheet: Resume/Quit. Quit reuses exitToLesson,
                same route + refresh the mastery-screen's "Back to
                missions" button already used. ─────────────────────────── */}
            {showPauseMenu && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
                    onClick={() => setShowPauseMenu(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-2xl bg-surface p-6 pb-6 space-y-3 shadow-modal"
                    >
                        <div className="text-center mb-2">
                            <p className="font-heading text-mission text-ink">{mission.title}</p>
                            {mission.description && (
                                <p className="font-sans text-caption text-text-secondary mt-1">{mission.description}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPauseMenu(false)}
                            className="clay-button w-full bg-brand hover:bg-brand-hover text-white font-heading text-lg uppercase tracking-wide flex items-center justify-center"
                        >
                            Resume
                        </button>
                        <button
                            type="button"
                            onClick={exitToLesson}
                            className="clay-button w-full bg-surface-sunken hover:bg-hairline text-ink font-heading text-lg uppercase tracking-wide border-hairline-strong flex items-center justify-center"
                        >
                            Quit mission
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
