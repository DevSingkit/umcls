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
// ALL logic is byte-identical to the original: handleCheck,
// handleContinueAfterCorrect, handleTryAgain, handleGoToRemediation,
// clearAttemptState, clearForNewActivity, and every piece of state are
// unchanged. The only new state is local UI state (isMuted) and a
// useEffect that plays a tone off `feedback` changing — it does not
// touch handleCheck's body.

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
} from 'lucide-react'
import { submitActivityAttempt } from '@/features/missions/actions/submit-activity-attempt'
import type { MissionPreviewForStudent } from '@/features/missions/actions/get-mission-for-student'

type Feedback = {
    isCorrect: boolean
    remediationActivityId: string | null
    justMastered: boolean
}

// Distinct color + shape per tile position, cycling if a question has
// more than 4 options. Never relies on color alone (§9).
const TILE_STYLES = [
    { icon: Circle, bg: 'bg-brand', ring: 'ring-brand' },
    { icon: Square, bg: 'bg-info', ring: 'ring-info' },
    { icon: Triangle, bg: 'bg-amber', ring: 'ring-amber' },
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

    const [currentIndex, setCurrentIndex] = useState(0)
    const [overrideActivityId, setOverrideActivityId] = useState<string | null>(null)

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
        (overrideActivityId ? activities.find((a) => a.id === overrideActivityId) : null) ?? activities[currentIndex]

    // Plays a tone whenever a fresh feedback result lands, without
    // touching handleCheck's own body.
    useEffect(() => {
        if (feedback && !isMuted) playTone(feedback.isCorrect)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feedback])

    if (!activeActivity) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas p-6">
                <p className="text-body-md text-text-secondary">This mission has no activities yet.</p>
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

        if (result.justMastered) {
            setUnlockedNextMission(Boolean(result.unlockedNextMissionId))
            setMasteredScreen(true)
            return
        }

        setFeedback({
            isCorrect: result.isCorrect,
            remediationActivityId: result.remediationActivityId,
            justMastered: result.justMastered,
        })
    }

    function handleContinueAfterCorrect() {
        if (overrideActivityId) {
            setOverrideActivityId(null)
            clearForNewActivity()
            return
        }
        setCurrentIndex((prev) => (prev + 1) % activities.length)
        clearForNewActivity()
    }

    function handleTryAgain() {
        clearAttemptState()
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
                    <span className="motion-safe:animate-bounce flex h-28 w-28 items-center justify-center rounded-pill bg-surface text-amber shadow-modal">
                        <Star size={56} fill="currentColor" aria-hidden="true" />
                    </span>
                    <div className="flex items-center justify-center gap-2">
                        <Sparkles size={26} className="text-on-ink" aria-hidden="true" />
                        <p className="font-heading text-h1 text-on-ink">Mission mastered!</p>
                        <Sparkles size={26} className="text-on-ink" aria-hidden="true" />
                    </div>
                    <p className="text-body-lg text-on-ink/90">
                        You got {masteryThreshold} in a row on &quot;{mission.title}&quot;. 🎉
                    </p>
                    {unlockedNextMission && (
                        <p className="text-body-emphasis text-brand bg-surface inline-block rounded-pill px-5 py-2 shadow-card">
                            A new mission just unlocked!
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={exitToLesson}
                        className="mt-2 h-14 px-10 rounded-pill bg-surface text-brand font-heading text-h3 shadow-modal transition-transform hover:scale-105"
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
                        className={correctStreak > 0 ? 'text-amber' : 'text-text-muted'}
                        fill={correctStreak > 0 ? 'currentColor' : 'none'}
                        aria-hidden="true"
                    />
                    <span className="text-body-emphasis text-ink">{correctStreak}</span>
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
                    <span className="text-caption font-semibold text-info bg-info-soft rounded-pill px-3 py-1">
                        Related question
                    </span>
                </div>
            )}

            {/* Question area — centered, full-screen game feel */}
            <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6 sm:px-8">
                <div className="w-full max-w-3xl space-y-8">
                    <p className="text-center font-heading text-h1 text-ink">{activeActivity.prompt}</p>

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
                                        'flex min-h-[120px] w-full items-center gap-4 rounded-md p-6 text-left font-heading text-h3 text-on-ink shadow-card transition-opacity',
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
                        <p className="text-body-md text-info bg-info-soft rounded-md px-4 py-3 font-medium">
                            💡 Hint: {hintText}
                        </p>
                    )}

                    {error && (
                        <p className="text-caption text-error text-center" role="alert">
                            {error}
                        </p>
                    )}

                    {!feedback && (
                        <button
                            type="button"
                            onClick={handleCheck}
                            disabled={!selectedOptionId || isSubmitting}
                            className="w-full h-14 rounded-pill bg-brand hover:bg-brand-hover text-on-ink font-heading text-h3 shadow-card disabled:opacity-50 disabled:shadow-none transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isSubmitting ? 'Checking…' : 'Check answer'}
                        </button>
                    )}

                    {feedback?.isCorrect && (
                        <button
                            type="button"
                            onClick={handleContinueAfterCorrect}
                            className="w-full h-14 rounded-pill bg-success hover:opacity-90 text-on-ink font-heading text-h3 shadow-card transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Correct! Continue →
                        </button>
                    )}

                    {feedback && !feedback.isCorrect && feedback.remediationActivityId && (
                        <button
                            type="button"
                            onClick={handleGoToRemediation}
                            className="w-full h-14 rounded-pill bg-brand hover:bg-brand-hover text-on-ink font-heading text-h3 shadow-card transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            Try a related question first
                        </button>
                    )}

                    {feedback && !feedback.isCorrect && !feedback.remediationActivityId && (
                        <button
                            type="button"
                            onClick={handleTryAgain}
                            className="w-full h-14 rounded-pill border-2 border-hairline-strong text-ink font-heading text-h3 hover:bg-surface-sunken transition-all"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
