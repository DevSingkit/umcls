'use client'
// features/missions/components/ActivityRunner.tsx
//
// v3 — full rebuild to actually implement DESIGN-LMS.md §7.9 (this was
// never actually a full-screen game component before, despite the v2
// comment header claiming it was — v2 was still a plain in-page card
// with a stacked option list). This version is the real thing:
//
//   - Full-viewport takeover (`fixed inset-0 z-[60]`), sidebar/nav
//     chrome is visually covered regardless of AppShell underneath —
//     no changes to AppShell needed.
//   - Top bar: back arrow (exits to the lesson, not app nav) · a real
//     progress bar filling toward masteryThreshold · streak flame
//     counter · sound mute toggle (local component state only, not
//     persisted, per §7.9's explicit note).
//   - Answer options: 2×2 grid of large tiles (1 col on mobile, 2 on
//     sm+), each with BOTH a distinct color and a distinct shape icon
//     (circle/square/triangle/diamond) so no tile relies on color
//     alone — this app's palette only has brand/amber/info as
//     non-reserved colors (red is feedback-only, pink is chrome-only
//     per §2), so a 4th tile reuses brand at a darker shade
//     (`brand-hover`) with a different icon to stay distinguishable.
//   - Feedback: correct tile pops + turns brand green, incorrect tile
//     shakes + turns red, every other tile dims to 40% opacity. A short
//     tone plays on check if sound is on (Web Audio, no asset needed).
//   - Mastery screen: full-screen brand gradient takeover + confetti.
//
// v3's original claim ("ALL logic is byte-identical... only new state
// is local UI state") was true THEN, before Phase 3. It is no longer
// true — flagging clearly rather than leaving a stale comment, per
// ADAPTIVE-ENGINE-PLAN.md's own convention of never silently trusting
// old descriptions.
//
// PHASE 3 REWORK (ADAPTIVE-ENGINE-PLAN.md, ADAPTIVE-ENGINE-LOG.md
// 2026-08-28): confirmed by actually reading this file before Phase 3
// started that there was NO requeue behavior at all — a wrong answer
// just retried the same activity in place (old handleTryAgain), and
// activities cycled in a fixed `currentIndex % activities.length`
// order with no mastery-awareness. Replaced with a real in-session
// queue:
//   - `queue`: ordered activity ids still "in rotation" this session.
//     Seeded from `mission.activities` as already sorted (unmastered
//     first) by get-mission-for-student.ts's Phase 3 change.
//   - `activityStreaks`: local per-activity streak cache, seeded from
//     each activity's `initialCorrectStreak`, updated after every
//     submit from the server's authoritative `activityCorrectStreak`
//     (never advanced optimistically/locally — always the server's
//     number, so this can't drift from activity_mastery).
//   - After ANY resolved attempt on the front-of-queue activity
//     (correct or wrong, remediation excluded — that's still a
//     separate override, untouched from before): if that activity's
//     streak just reached 3, it's dropped from the queue for the rest
//     of this session. Otherwise it's reinserted 1–3 spots deeper in
//     the queue (randomized, confirmed with user) — same treatment for
//     "wrong" and "correct but not yet 3 in a row", since Phase 0's
//     rule is 3 correct IN A ROW specifically for that activity, so a
//     correct-but-incomplete streak still needs to come back around,
//     not just a wrong one.
//   - If the queue empties out before the MISSION itself reports
//     justMastered (possible when a teacher sets mission
//     mastery_threshold higher than 3 — every activity can
//     individually hit its own fixed 3-streak before the mission's own
//     longer streak requirement is satisfied), the queue refills with
//     every activity again rather than leaving the student stuck with
//     nothing to answer. Not explicitly specified in the plan — a
//     reasonable fallback, flagged here and in the log rather than
//     assumed silently.
//   - A small "Let's review again!" banner (Phase 0's exact wording)
//     shows above the prompt whenever the student lands on an activity
//     they've already attempted at least once this session — this is
//     the visible signal that they're seeing a requeued question, not
//     a first attempt.
//
// Remediation (handleGoToRemediation/overrideActivityId) is completely
// unchanged — it's still a temporary detour outside the main queue,
// exactly as before.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Flame,
    Star,
    Sparkles,
    CheckCircle2,
    XCircle,
    Volume2,
    VolumeX,
    Circle,
    Square,
    Triangle,
    Diamond,
    RotateCcw,
    Lightbulb,
} from 'lucide-react'
import { submitActivityAttempt } from '@/features/missions/actions/submit-activity-attempt'
import type { MissionPreviewForStudent } from '@/features/missions/actions/get-mission-for-student'

type Feedback = {
    isCorrect: boolean
    remediationActivityId: string | null
    justMastered: boolean
    // PHASE 3 ADDITIONS: this specific activity's own streak/state
    // after this attempt (from activity_mastery via
    // submitActivityAttempt's new result fields) — used to decide, once
    // the student presses the continue/next button, whether this
    // activity leaves the queue (streak hit 3) or gets reinserted.
    activityCorrectStreak: number
    activityMasteryState: 'new' | 'learning' | 'mastered'
}

// PHASE 3: how many other questions appear before a requeued activity
// comes back around — randomized 1–3 (confirmed with user), inclusive.
function randomRequeueGap(): number {
    return 1 + Math.floor(Math.random() * 3)
}

// PHASE 3: activity-level mastery is fixed at 3-in-a-row (Phase 0's
// locked rule), deliberately NOT the same value as the mission's own
// configurable `masteryThreshold` (which gates the whole mission via a
// separate, teacher-set "N correct anywhere in the mission" counter).
// These are two different thresholds by design — see Phase 0/2 notes.
const ACTIVITY_MASTERY_STREAK_TARGET = 3

// Distinct color + shape per tile position, cycling if a question has
// more than 4 options. Never relies on color alone (§9).
const TILE_STYLES = [
    { icon: Circle, bg: 'bg-brand', ring: 'ring-brand' },
    { icon: Square, bg: 'bg-info', ring: 'ring-info' },
    { icon: Triangle, bg: 'bg-warning', ring: 'ring-warning' },
    { icon: Diamond, bg: 'bg-brand-hover', ring: 'ring-brand-hover' },
]

// Tiny Web Audio beep — no audio asset needed. Ascending tone for
// correct, single low tone for incorrect, per §7.9.
function playTone(isCorrect: boolean) {
    try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        const ctx = new Ctx()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        if (isCorrect) {
            osc.frequency.setValueAtTime(523, ctx.currentTime)
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.1)
        } else {
            osc.frequency.setValueAtTime(180, ctx.currentTime)
        }
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
    } catch {
        // Audio isn't essential — fail silently if the browser blocks it.
    }
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
    const { activities, masteryThreshold } = mission

    // PHASE 3: replaces the old currentIndex cycling. Seeded once from
    // `activities`, which arrives already sorted unmastered-first by
    // get-mission-for-student.ts. Front of the array = activity on
    // screen right now.
    const [queue, setQueue] = useState<string[]>(() => activities.map((a) => a.id))
    const [overrideActivityId, setOverrideActivityId] = useState<string | null>(null)

    // PHASE 3: local cache of each activity's own streak, seeded from
    // initialCorrectStreak (activity_mastery as of page load). Always
    // overwritten from the server's activityCorrectStreak after each
    // submit — never advanced optimistically, so this can't drift from
    // the actual activity_mastery row.
    const [activityStreaks, setActivityStreaks] = useState<Record<string, number>>(() =>
        Object.fromEntries(activities.map((a) => [a.id, a.initialCorrectStreak]))
    )

    // PHASE 3: which activities have already been shown at least once
    // this session — drives the "Let's review again!" banner when the
    // student lands back on one of them.
    const [seenThisSession, setSeenThisSession] = useState<Set<string>>(() => new Set())

    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<Feedback | null>(null)
    const [hintText, setHintText] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [correctStreak, setCorrectStreak] = useState(initialCorrectStreak)
    const [masteredScreen, setMasteredScreen] = useState(false)
    const [unlockedNextMission, setUnlockedNextMission] = useState(false)

    // Local-only UI state, not part of the original logic.
    const [isMuted, setIsMuted] = useState(false)

    const activeActivity =
        (overrideActivityId ? activities.find((a) => a.id === overrideActivityId) : null) ??
        activities.find((a) => a.id === queue[0])

    // PHASE 3: true when the student is seeing this activity again
    // within the same session (not their very first look at it today)
    // — the signal for the "Let's review again!" banner.
    const isReturningActivity =
        !overrideActivityId && !!activeActivity && seenThisSession.has(activeActivity.id)

    // Plays a tone whenever a fresh feedback result lands, without
    // touching handleCheck's own body.
    useEffect(() => {
        if (feedback && !isMuted) playTone(feedback.isCorrect)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedback])

    if (!activeActivity) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas p-6">
                <p className="font-sans text-body-md text-text-secondary">This mission has no activities yet.</p>
            </div>
        )
    }

    function clearAttemptState() {
        setSelectedOptionId(null)
        setFeedback(null)
        setError('')
    }

    function clearForNewActivity() {
        clearAttemptState()
        setHintText(null)
    }

    async function handleCheck() {
        if (!selectedOptionId) return
        setIsSubmitting(true)
        setError('')

        const result = await submitActivityAttempt({
            // Non-null assertion: the early `if (!activeActivity) return`
            // above guarantees this at render time, but TS doesn't carry
            // that narrowing into this separately-declared closure — a
            // known TS limitation, not a real possible-undefined case.
            activityId: activeActivity!.id,
            selectedOptionId,
            hintWasVisible: hintText !== null,
        })

        setIsSubmitting(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        setCorrectStreak(result.correctStreak)
        if (result.hintText) {
            setHintText(result.hintText)
        }

        // PHASE 3: keep the local streak cache in sync with the
        // server's authoritative activity_mastery number, and record
        // that this activity has now been seen this session (so a
        // later requeue shows the "Let's review again!" banner).
        setActivityStreaks((prev) => ({ ...prev, [activeActivity!.id]: result.activityCorrectStreak }))
        setSeenThisSession((prev) => new Set(prev).add(activeActivity!.id))

        if (result.justMastered) {
            setUnlockedNextMission(Boolean(result.unlockedNextMissionId))
            setMasteredScreen(true)
            return
        }

        setFeedback({
            isCorrect: result.isCorrect,
            remediationActivityId: result.remediationActivityId,
            justMastered: result.justMastered,
            activityCorrectStreak: result.activityCorrectStreak,
            activityMasteryState: result.activityMasteryState,
        })
    }

    // PHASE 3: shared by the "Correct! Continue" and "Keep going" (old
    // "Try again") buttons — both cases need the same queue decision:
    // did THIS activity just hit its own 3-in-a-row (activityMastery
    // rules, Phase 0), or does it still need to come back around later?
    // "Wrong" and "correct but streak < 3" are treated identically
    // here on purpose — Phase 0's rule is 3 correct IN A ROW for this
    // specific activity, so a correct answer that doesn't complete
    // that streak still needs another pass, same as a wrong one does.
    function advanceQueue() {
        if (!activeActivity) return
        const finishedId = activeActivity.id
        const streakNow = activityStreaks[finishedId] ?? 0

        setQueue((prevQueue) => {
            const rest = prevQueue.slice(1)

            if (streakNow >= ACTIVITY_MASTERY_STREAK_TARGET) {
                // This activity is done for the session — don't
                // reinsert it. If that was the last one in rotation,
                // refill with everything again rather than leaving an
                // empty queue: the mission itself may not be
                // justMastered yet (teacher-configurable
                // mastery_threshold can be higher than 3), so there
                // must always be something to answer next. See the
                // top-of-file note on this fallback.
                return rest.length > 0 ? rest : activities.map((a) => a.id)
            }

            // Still needs more correct answers on this activity —
            // reinsert 1–3 spots deeper (randomized, per user), clipped
            // to the current queue length so it doesn't overshoot a
            // short queue.
            const insertAt = Math.min(rest.length, randomRequeueGap())
            const next = [...rest]
            next.splice(insertAt, 0, finishedId)
            return next
        })

        clearForNewActivity()
    }

    function handleContinueAfterCorrect() {
        if (overrideActivityId) {
            setOverrideActivityId(null)
            clearForNewActivity()
            return
        }
        advanceQueue()
    }

    // Renamed in spirit, not just in comments: this used to retry the
    // SAME activity in place. Phase 3 replaces that with moving on to
    // the next queued activity and requeuing this one 1–3 questions
    // later, per the plan's Duolingo-style requeue behavior — see
    // top-of-file note. Kept the function name for the button's
    // existing wiring below; only the body changed.
    function handleTryAgain() {
        if (overrideActivityId) {
            // Remediation attempts still retry in place, unchanged —
            // this override path was never part of the main queue.
            clearAttemptState()
            return
        }
        advanceQueue()
    }

    function handleGoToRemediation() {
        if (!feedback?.remediationActivityId) return
        setOverrideActivityId(feedback.remediationActivityId)
        clearForNewActivity()
    }

    function exitToLesson() {
        router.push(`/student/courses/${courseId}/lessons/${lessonId}`)
    }

    const progressPct = Math.min(100, Math.round((correctStreak / masteryThreshold) * 100))

    if (masteredScreen) {
        return (
            <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-b from-brand to-brand-hover">
                <style>{`
                    @keyframes confetti-fall {
                        0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                        100% { transform: translateY(110vh) rotate(360deg); opacity: 0.8; }
                    }
                `}</style>
                <div className="motion-reduce:hidden pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                    {Array.from({ length: 36 }).map((_, i) => (
                        <span
                            key={i}
                            className="absolute top-0 block h-2.5 w-2.5 rounded-sm"
                            style={{
                                left: `${(i * 37) % 100}%`,
                                backgroundColor: i % 3 === 0 ? '#FBEBD6' : i % 3 === 1 ? '#F7F5F0' : '#E1F0E5',
                                animation: `confetti-fall ${2.4 + (i % 5) * 0.3}s linear ${(i % 7) * 0.2}s infinite`,
                            }}
                        />
                    ))}
                </div>

                <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 px-6 py-10 text-center">
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
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-canvas">
            <style>{`
                @keyframes tile-pop { 0% { transform: scale(1); } 50% { transform: scale(1.04); } 100% { transform: scale(1); } }
                @keyframes tile-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
                .tile-pop { animation: tile-pop 0.3s ease-out; }
                .tile-shake { animation: tile-shake 0.35s ease-in-out; }
                @media (prefers-reduced-motion: reduce) {
                    .tile-pop, .tile-shake { animation: none; }
                }
            `}</style>

            {/* Top bar */}
            <div className="flex items-center gap-4 px-4 py-3 sm:px-8 sm:py-4">
                <button
                    type="button"
                    onClick={exitToLesson}
                    aria-label="Exit to lesson"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    <ArrowLeft size={22} aria-hidden="true" />
                </button>

                <div className="min-w-0 flex-1">
                    <div className="h-3 w-full overflow-hidden rounded-pill bg-hairline">
                        <div
                            className="h-full rounded-pill bg-brand transition-[width] duration-300"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <Flame
                        size={22}
                        className={correctStreak > 0 ? 'text-warning' : 'text-text-muted'}
                        fill={correctStreak > 0 ? 'currentColor' : 'none'}
                        aria-hidden="true"
                    />
                    <span className="font-sans text-body-emphasis text-ink">{correctStreak}</span>
                </div>

                <button
                    type="button"
                    onClick={() => setIsMuted((v) => !v)}
                    aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                    aria-pressed={isMuted}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-text-secondary hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    {isMuted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
                </button>
            </div>

            {overrideActivityId && (
                <div className="px-4 sm:px-8">
                    <span className="font-sans text-caption font-semibold text-info bg-info-soft rounded-pill px-3 py-1">
                        Related question
                    </span>
                </div>
            )}

            {/* PHASE 3: shown when this activity has already been seen
                this session — the visible signal that it's a requeued
                question, not the student's first look at it today. */}
            {isReturningActivity && (
                <div className="px-4 sm:px-8">
                    <span className="inline-flex items-center gap-1.5 font-sans text-caption font-semibold text-warning bg-warning-soft rounded-pill px-3 py-1">
                        <RotateCcw size={14} aria-hidden="true" />
                        Let&apos;s review again!
                    </span>
                </div>
            )}

            {/* Question area — centered, full-screen game feel */}
            <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-8">
                <div className="w-full max-w-3xl space-y-8">
                    <p className="text-center font-heading text-mission md:text-[1.75rem] text-ink">{activeActivity.prompt}</p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {activeActivity.options.map((option, i) => {
                            const isSelected = selectedOptionId === option.id
                            const showResult = feedback !== null
                            const isChosenWrong = showResult && isSelected && !feedback.isCorrect
                            const isChosenRight = showResult && isSelected && feedback.isCorrect
                            const shouldDim = showResult && !isSelected
                            const style = TILE_STYLES[i % TILE_STYLES.length]!
                            const TileIcon = style.icon

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={showResult || isSubmitting}
                                    onClick={() => setSelectedOptionId(option.id)}
                                    className={[
                                        'flex min-h-[120px] w-full items-center gap-4 rounded-md p-6 text-left font-sans font-bold text-base text-on-ink shadow-card transition-opacity',
                                        isChosenRight
                                            ? 'bg-success tile-pop'
                                            : isChosenWrong
                                              ? 'bg-error tile-shake'
                                              : style.bg,
                                        isSelected && !showResult ? `ring-4 ring-offset-2 ${style.ring}` : '',
                                        shouldDim ? 'opacity-40' : 'opacity-100',
                                    ].join(' ')}
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-white/20">
                                        {isChosenRight ? (
                                            <CheckCircle2 size={22} aria-hidden="true" />
                                        ) : isChosenWrong ? (
                                            <XCircle size={22} aria-hidden="true" />
                                        ) : (
                                            <TileIcon size={20} aria-hidden="true" />
                                        )}
                                    </span>
                                    <span>{option.optionText}</span>
                                </button>
                            )
                        })}
                    </div>

                    {hintText && (
                        <p className="flex items-start gap-2 font-sans text-body-md text-info bg-info-soft rounded-md px-4 py-3 font-medium">
                            <Lightbulb size={20} className="shrink-0 mt-0.5" aria-hidden="true" />
                            <span>Hint: {hintText}</span>
                        </p>
                    )}

                    {error && (
                        <p className="font-sans text-caption text-error text-center" role="alert">
                            {error}
                        </p>
                    )}

                    {/* DESIGN-LMS 2.1 PASS (2026-08-31): all four CTA states below
                        rebuilt to the §4B.1/§4B.2 tactile 3D button spec — Fredoka
                        uppercase text, rounded-2xl, border-b-4 in a darker shade of
                        each state's own color, active:border-b-0 active:translate-y-1
                        for the press effect. Colors per state, per spec:
                        gamified-green = the named "Primary mission CTA (Check
                        Answer)" color; brand = the feedback-drawer's "CONTINUE"
                        color; error = the feedback-drawer's "GOT IT" (incorrect)
                        color, using the new error.border token added alongside this
                        change since no dark-error token existed before. The
                        remediation offer isn't explicitly named in DESIGN-LMS 2.1 —
                        treated as a brand-colored forward action, same family as
                        Continue, since it's confirmed/user-approved as part of this
                        same tactile-button pass rather than a separate open question. */}
                    {!feedback && (
                        <button
                            type="button"
                            onClick={handleCheck}
                            disabled={!selectedOptionId || isSubmitting}
                            className="w-full h-14 rounded-2xl bg-gamified-green hover:bg-gamified-green-dark text-white font-heading text-lg uppercase tracking-wide shadow-card border-b-4 border-gamified-green-dark active:border-b-0 active:translate-y-1 disabled:opacity-50 disabled:active:translate-y-0 disabled:active:border-b-4 transition-all flex items-center justify-center"
                        >
                            {isSubmitting ? 'Checking…' : 'Check answer'}
                        </button>
                    )}

                    {feedback?.isCorrect && (
                        <button
                            type="button"
                            onClick={handleContinueAfterCorrect}
                            className="w-full h-14 rounded-2xl bg-brand hover:bg-brand-hover text-white font-heading text-lg uppercase tracking-wide shadow-card border-b-4 border-brand-border active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            Correct! Continue →
                        </button>
                    )}

                    {feedback && !feedback.isCorrect && feedback.remediationActivityId && (
                        <button
                            type="button"
                            onClick={handleGoToRemediation}
                            className="w-full h-14 rounded-2xl bg-brand hover:bg-brand-hover text-white font-heading text-lg uppercase tracking-wide shadow-card border-b-4 border-brand-border active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            Try a related question first
                        </button>
                    )}

                    {feedback && !feedback.isCorrect && !feedback.remediationActivityId && (
                        <button
                            type="button"
                            onClick={handleTryAgain}
                            className="w-full h-14 rounded-2xl bg-error hover:opacity-90 text-white font-heading text-lg uppercase tracking-wide shadow-card border-b-4 border-error-border active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
                        >
                            {/* PHASE 3: copy updated from "Try again" —
                                this no longer retries the same question
                                in place, it moves on and requeues this
                                one 1–3 questions later. */}
                            Keep going →
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
