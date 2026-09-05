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
// UI COPY RULE (confirmed by user, same rule submit-question-
// attempt.ts's header documents): "streak" language is reserved for
// QUESTION-level feedback only ("2 in a row!"). Activity-level
// progress renders as "X/Y Questions Mastered" and must never say
// streak, even though the underlying DB column is still named
// correct_streak (that's a storage detail, not a UI word choice).
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
import { submitQuestionAttempt } from '@/features/missions/actions/submit-question-attempt'
import type { MissionPreviewForStudent, ActivityPreviewForStudent, QuestionPreviewForStudent } from '@/features/missions/actions/get-mission-for-student'

const MISSION_MASTERY_STREAK_TARGET_FALLBACK = 3 // only used if masteryThreshold is ever missing
const QUESTION_MASTERY_STREAK_TARGET = 3

// Same 4-color/4-shape tile system as before — color AND shape carry
// meaning together (not color alone), still cycling through the same
// four brand-safe tokens. `amber` fixed to `warning` in the earlier
// design pass; unchanged here.
const TILE_STYLES = [
    { icon: Circle, bg: 'bg-brand', ring: 'ring-brand' },
    { icon: Square, bg: 'bg-info', ring: 'ring-info' },
    { icon: Triangle, bg: 'bg-warning', ring: 'ring-warning' },
    { icon: Diamond, bg: 'bg-brand-hover', ring: 'ring-brand-hover' },
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

    const [queue, setQueue] = useState<QueueItem[]>(() => flattenQueue(mission.activities))
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Feedback | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [correctStreak, setCorrectStreak] = useState(initialCorrectStreak)
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
    // Per-ACTIVITY rollup cache — same idea, seeded from each
    // activity's masteredQuestionCount/totalQuestionCount, kept fresh
    // locally so the "X/Y Questions Mastered" indicator updates
    // immediately after each submit.
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
        if (feedback) return
        setSelectedOptionId(optionId)
    }

    async function handleCheck() {
        if (!activeQuestion || !activeActivity || !selectedOptionId) return
        setIsSubmitting(true)
        setError(null)

        const result = await submitQuestionAttempt({
            activityId: activeActivity.id,
            questionId: activeQuestion.id,
            selectedOptionId,
            hintWasVisible: hintRevealed,
        })

        setIsSubmitting(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        questionStreaksRef.current[activeQuestion.id] = result.questionCorrectStreak
        setActivityRollups((prev) => ({
            ...prev,
            [activeActivity.id]: {
                masteredCount: result.activityMasteredQuestionCount,
                totalCount: result.activityTotalQuestionCount,
            },
        }))
        markSeen(activeQuestion.id)
        setCorrectStreak(result.correctStreak)

        if (result.unlockedNextMissionId) setUnlockedNextMission(true)

        if (result.justMastered) {
            setShowMastered(true)
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
        const nowMastered = (questionStreaksRef.current[finishedQuestionId] ?? 0) >= QUESTION_MASTERY_STREAK_TARGET

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

    function handleTryAgain() {
        advanceQueue()
    }

    function exitToLesson() {
        router.push(`/student/courses/${courseId}/lessons/${lessonId}`)
        router.refresh()
    }

    // AUTO-ADVANCE (2026-09-05): on a correct answer, move to the next
    // question automatically after a short delay instead of waiting on
    // a manual "Continue" tap — removed per explicit request. Cleared
    // on unmount/dependency change so a Pause-tap or Quit mid-delay
    // can't fire a stale advance after the component's gone. Wrong
    // answers are NOT auto-advanced — the Try again/remediation choice
    // stays manual, since that's a real branching decision (detour
    // into a remediation activity or not), not just "move on".
    // Reset the hint reveal per question — a hint tapped open on
    // question A must not still be showing when the queue moves to
    // question B.
    useEffect(() => {
        setHintRevealed(false)
    }, [activeQuestion?.id])

    useEffect(() => {
        if (!feedback?.isCorrect) return
        const timer = setTimeout(() => {
            handleContinueAfterCorrect()
        }, 3000)
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
                <span className="motion-safe:animate-bounce flex h-28 w-28 items-center justify-center rounded-pill bg-surface text-warning shadow-modal">
                    <Star size={56} fill="currentColor" aria-hidden="true" />
                </span>
                <div className="flex items-center justify-center gap-2">
                    <Sparkles size={26} className="text-on-ink" aria-hidden="true" />
                    <p className="font-heading text-h1 text-on-ink">Mission mastered!</p>
                    <Sparkles size={26} className="text-on-ink" aria-hidden="true" />
                </div>
                <p className="font-sans text-body-lg text-on-ink/90">
                    You got {masteryThreshold} in a row on &quot;{mission.title}&quot;.
                </p>
                {unlockedNextMission && (
                    <p className="font-sans text-body-emphasis text-brand bg-surface inline-block rounded-pill px-5 py-2 shadow-card">
                        A new mission just unlocked!
                    </p>
                )}
                <button
                    type="button"
                    onClick={exitToLesson}
                    className="mt-2 h-14 px-10 rounded-2xl bg-surface text-brand font-heading text-lg uppercase tracking-wide border-b-4 border-hairline-strong shadow-modal transition-all active:border-b-0 active:translate-y-1 hover:scale-105"
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

                {(activeRollup && activeRollup.totalCount > 1) || overrideActivityId || (isReturningQuestion && !overrideActivityId) ? (
                    <div className="flex flex-wrap items-center gap-2">
                        {activeRollup && activeRollup.totalCount > 1 && (
                            <span className="font-sans text-caption font-semibold text-text-secondary bg-surface-sunken rounded-pill px-3 py-1">
                                {activeRollup.masteredCount}/{activeRollup.totalCount} Questions Mastered
                            </span>
                        )}
                        {overrideActivityId && (
                            <span className="font-sans text-caption font-semibold text-info bg-info-soft rounded-pill px-3 py-1">
                                Related question
                            </span>
                        )}
                        {isReturningQuestion && !overrideActivityId && (
                            <span className="inline-flex items-center gap-1.5 font-sans text-caption font-semibold text-warning bg-warning-soft rounded-pill px-3 py-1">
                                <RotateCcw size={14} aria-hidden="true" />
                                Let&apos;s review again!
                            </span>
                        )}
                    </div>
                ) : null}
            </div>

            {/* ── Question: floats centered in whatever space is left
                above the answer block, same "middle of screen" feel
                as before. Larger + roomier on desktop only. ────────── */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-4 max-w-2xl lg:max-w-4xl mx-auto w-full">
                <p className="text-center font-heading text-mission md:text-[1.75rem] lg:text-4xl text-ink">
                    {activeQuestion.prompt}
                </p>
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
                                disabled={Boolean(feedback)}
                                onClick={() => handleSelectOption(option.id)}
                                className={[
                                    `flex ${gridLayout.tileMinH} lg:min-h-[140px] w-full items-center gap-3 lg:gap-4 rounded-md ${gridLayout.padding} lg:p-6 text-left font-sans font-bold ${gridLayout.textSize} lg:text-xl text-on-ink shadow-card transition-opacity`,
                                    style.bg,
                                    spanFull ? 'col-span-2' : '',
                                    isSelected ? `ring-4 ${style.ring} ring-offset-2` : '',
                                    isCorrectAnswer ? 'ring-4 ring-success ring-offset-2' : '',
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

                {/* Desktop-only extra breathing room before the Check
                    button — mobile keeps its existing space-y-4 gap. */}
                <div className="hidden lg:block h-2" />

                {/* AUTO-ADVANCE CELEBRATION (2026-09-05): replaces the old
                    manual "Correct! Continue ->" button — the useEffect
                    above already advances the queue after 3s, this is
                    just the visual filler so it doesn't look like nothing
                    is happening while that timer runs. */}
                {feedback?.isCorrect && (
                    <div className="flex flex-col items-center gap-2 py-2">
                        <div className="flex items-center gap-2 text-success animate-bounce">
                            <Sparkles size={24} aria-hidden="true" />
                            <span className="font-heading text-lg lg:text-2xl uppercase tracking-wide">Nice job!</span>
                            <Sparkles size={24} aria-hidden="true" />
                        </div>
                        <p className="font-sans text-body-emphasis text-success">
                            {feedback.questionCorrectStreak} in a row!
                        </p>
                    </div>
                )}

                {/* TAP-TO-REVEAL HINT (2026-09-05): shown whenever the
                    student has tapped the hint button, independent of
                    whether they've answered yet — replaces the old
                    auto-after-2-wrong banner tied to feedback state. */}
                {hintRevealed && activeQuestion.hintText && (
                    <p className="flex items-start gap-2 font-sans text-body-md lg:text-lg text-info bg-info-soft rounded-md px-4 py-3 font-medium">
                        <Lightbulb size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <span>Hint: {activeQuestion.hintText}</span>
                    </p>
                )}

                {error && (
                    <p className="font-sans text-caption text-error text-center" role="alert">
                        {error}
                    </p>
                )}

                {!feedback && (
                    <button
                        type="button"
                        onClick={handleCheck}
                        disabled={!selectedOptionId || isSubmitting}
                        className="w-full h-14 lg:h-20 rounded-2xl bg-gamified-green hover:bg-gamified-green-dark text-white font-heading text-lg lg:text-2xl uppercase tracking-wide shadow-card border-b-4 lg:border-b-8 border-gamified-green-dark active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 transition-all flex items-center justify-center"
                    >
                        {isSubmitting ? 'Checking…' : 'Check answer'}
                    </button>
                )}

                {feedback && !feedback.isCorrect && feedback.remediationActivityId && (
                    <button
                        type="button"
                        onClick={handleGoToRemediation}
                        className="w-full h-14 lg:h-20 rounded-2xl bg-brand hover:bg-brand-hover text-white font-heading text-lg lg:text-2xl uppercase tracking-wide shadow-card border-b-4 lg:border-b-8 border-brand-border active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                    >
                        Try a related question first
                    </button>
                )}

                {feedback && !feedback.isCorrect && !feedback.remediationActivityId && (
                    <button
                        type="button"
                        onClick={handleTryAgain}
                        className="w-full h-14 lg:h-20 rounded-2xl bg-error hover:opacity-90 text-white font-heading text-lg lg:text-2xl uppercase tracking-wide shadow-card border-b-4 lg:border-b-8 border-error-border active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                    >
                        Keep going →
                    </button>
                )}
            </div>

            {/* ── Pause sheet: Resume/Quit. Quit reuses exitToLesson,
                same route + refresh the mastery-screen's "Back to
                missions" button already used. ─────────────────────────── */}
            {showPauseMenu && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
                    onClick={() => setShowPauseMenu(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md rounded-t-2xl bg-surface p-6 pb-8 space-y-3 animate-drawer-up"
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
                            className="w-full h-14 rounded-2xl bg-brand hover:bg-brand-hover text-white font-heading text-lg uppercase tracking-wide shadow-card border-b-4 border-brand-border active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            Resume
                        </button>
                        <button
                            type="button"
                            onClick={exitToLesson}
                            className="w-full h-14 rounded-2xl bg-surface-sunken hover:bg-hairline text-ink font-heading text-lg uppercase tracking-wide border-b-4 border-hairline-strong active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            Quit mission
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
