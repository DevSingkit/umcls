'use client'
// Lets a student answer each question, then submit. When they submit,
// this sends the answers to gradeQuizSubmission, which is the only
// place the real answer key exists. This component never sees which
// option is correct, only the pass or fail result after grading.
//
// Supports four question types: multiple_choice_single and true_false
// (pick one option), checklist (pick one or more options), and
// short_answer (type a text response, graded manually by the teacher).
//
// On mount, this now calls startQuizAttempt first, before showing any
// questions. That call creates (or resumes) the quiz_attempts row and
// returns started_at + time_limit_minutes, which drives the countdown
// below. See start-quiz-attempt.ts for why the attempt has to start
// here rather than at final submission.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { gradeQuizSubmission } from '@/features/quizzes/actions/grade-quiz-submission'
import { startQuizAttempt } from '@/features/quizzes/actions/start-quiz-attempt'
import { saveQuizAnswer } from '@/features/quizzes/actions/save-quiz-answer'

type Question = {
    id: string
    question_text: string
    question_type: string
    options: { id: string; option_text: string }[]
}

type Quiz = {
    id: string
    title: string
    description: string | null
    course_id: string
    passing_score: number
    shuffle_questions: boolean
    shuffle_options: boolean
    questions: Question[]
}

// Deterministic seeded RNG (mulberry32) so the same seed always
// produces the same shuffle order. Seeding on attempt_id — stable for
// the life of an attempt — means a page refresh reshuffles nothing,
// per the batch requirement ("seeded per attempt, not per render").
function seedFromString(seed: string): number {
    let h = 1779033703 ^ seed.length
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
        h = (h << 13) | (h >>> 19)
    }
    return h >>> 0
}

function mulberry32(seed: number) {
    let t = seed
    return function () {
        t += 0x6d2b79f5
        let r = Math.imul(t ^ (t >>> 15), 1 | t)
        r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
}

function seededShuffle<T>(items: T[], seedString: string): T[] {
    const rng = mulberry32(seedFromString(seedString))
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        const temp = result[i]!
        result[i] = result[j]!
        result[j] = temp
    }
    return result
}

// One answer per question. For single-pick questions, selectedOptionIds
// holds one id. For checklist, it can hold several. For short answer,
// selectedOptionIds stays empty and textResponse holds what they typed.
type Answer = {
    selectedOptionIds: string[]
    textResponse: string
}

export function TakeQuizForm({ quiz, courseId }: { quiz: Quiz; courseId: string }) {
    const router = useRouter()
    const [answers, setAnswers] = useState<Record<string, Answer>>({})
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Attempt-start state. isStarting covers the brief moment before
    // startQuizAttempt resolves — the form doesn't render until we know
    // whether the student is actually allowed to be here right now.
    const [isStarting, setIsStarting] = useState(true)
    const [startError, setStartError] = useState('')
    const [attemptId, setAttemptId] = useState<string | null>(null)
    const [deadline, setDeadline] = useState<number | null>(null) // epoch ms, or null if no time limit
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
    // Timer hitting zero locks the quiz (no more editing) but does NOT
    // submit it automatically — the student must still click Submit
    // themselves, even with time already up.
    const [isLocked, setIsLocked] = useState(false)
    // Shuffled once, right after attemptId is known — same order every
    // re-render and every refresh, since it's seeded from attemptId.
    const [displayQuestions, setDisplayQuestions] = useState<Question[]>(quiz.questions)

    // Guards against double-submission — both the auto-submit-on-expiry
    // path and a manual click could otherwise fire at the same time.
    const hasSubmittedRef = useRef(false)

    // Autosave status, shown next to the submit button so a student on a
    // spotty connection can see their answers are actually being saved,
    // not just held in the tab. 'idle' before the first answer, 'saving'
    // while a request is in flight, 'saved' once it resolves, 'error' if
    // it failed (silently retried on the next change — not shown as a
    // blocking error, since a save failure shouldn't stop the student
    // from continuing to answer).
    const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    // One debounce timer per question, so typing in a short-answer box
    // doesn't fire a save on every keystroke, but selecting an MCQ
    // option (a single discrete action) can save right away.
    const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    useEffect(() => {
        let cancelled = false
        async function start() {
            const result = await startQuizAttempt(quiz.id)
            if (cancelled) return
            if (!result.ok) {
                setStartError(result.error)
                setIsStarting(false)
                return
            }
            setAttemptId(result.attemptId)
            if (result.timeLimitMinutes) {
                const startedAtMs = new Date(result.startedAt).getTime()
                setDeadline(startedAtMs + result.timeLimitMinutes * 60_000)
            }

            let orderedQuestions = quiz.questions
            if (quiz.shuffle_questions) {
                orderedQuestions = seededShuffle(orderedQuestions, `${result.attemptId}-questions`)
            }
            if (quiz.shuffle_options) {
                orderedQuestions = orderedQuestions.map((q) => ({
                    ...q,
                    options: seededShuffle(q.options, `${result.attemptId}-${q.id}-options`),
                }))
            }
            setDisplayQuestions(orderedQuestions)

            // Pre-fill the form from anything already autosaved for a
            // resumed attempt, so reconnecting doesn't lose progress.
            if (result.savedAnswers.length > 0) {
                setAnswers((prev) => {
                    const next = { ...prev }
                    for (const saved of result.savedAnswers) {
                        next[saved.questionId] = {
                            selectedOptionIds: saved.selectedOptionIds,
                            textResponse: saved.textResponse,
                        }
                    }
                    return next
                })
            }

            setIsStarting(false)
        }
        start()
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quiz.id])

    // Fires the actual save. Debounced per-question by the callers below
    // so rapid changes (e.g. typing) don't spam the server. Failures are
    // swallowed on purpose — final submission is the source of truth, and
    // a student shouldn't be blocked by a transient autosave error.
    function scheduleAutosave(
        questionId: string,
        questionType: string,
        selectedOptionIds: string[],
        textResponse: string,
        delayMs: number
    ) {
        if (!attemptId || isLocked) return

        if (saveTimers.current[questionId]) {
            clearTimeout(saveTimers.current[questionId])
        }

        saveTimers.current[questionId] = setTimeout(async () => {
            setAutosaveStatus('saving')
            const result = await saveQuizAnswer({
                attemptId,
                questionId,
                questionType,
                selectedOptionIds,
                textResponse,
            })
            setAutosaveStatus(result.ok ? 'saved' : 'error')
        }, delayMs)
    }

    // Countdown tick. Recomputes remaining time every second from the
    // fixed deadline (not from a decrementing counter), so a slow tab or
    // a background throttle can't drift it — it's always "deadline minus
    // now," same value the server will check.
    useEffect(() => {
        if (deadline === null) return

        function tick() {
            const secondsLeft = Math.round((deadline! - Date.now()) / 1000)
            setRemainingSeconds(secondsLeft)
            if (secondsLeft <= 0) {
                setIsLocked(true)
            }
        }

        tick()
        const interval = setInterval(tick, 1000)
        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deadline])

    function selectSingleAnswer(questionId: string, optionId: string, questionType: string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { selectedOptionIds: [optionId], textResponse: '' },
        }))
        // A single click is a complete, deliberate answer — save almost
        // immediately, no need to wait for more input.
        scheduleAutosave(questionId, questionType, [optionId], '', 300)
    }

    function toggleChecklistAnswer(questionId: string, optionId: string) {
        setAnswers((prev) => {
            const current = prev[questionId]?.selectedOptionIds ?? []
            const isSelected = current.includes(optionId)
            const next = isSelected
                ? current.filter((id) => id !== optionId)
                : [...current, optionId]
            scheduleAutosave(questionId, 'checklist', next, '', 500)
            return {
                ...prev,
                [questionId]: { selectedOptionIds: next, textResponse: '' },
            }
        })
    }

    function setTextAnswer(questionId: string, text: string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { selectedOptionIds: [], textResponse: text },
        }))
        // Debounced longer than the discrete-choice types, since this
        // fires on every keystroke — matches the ~1s "pause in typing"
        // feel rather than saving mid-word.
        scheduleAutosave(questionId, 'short_answer', [], text, 1000)
    }

    function isAnswered(question: Question) {
        const answer = answers[question.id]
        if (!answer) return false
        if (question.question_type === 'short_answer') {
            return answer.textResponse.trim().length > 0
        }
        return answer.selectedOptionIds.length > 0
    }

    // Once locked (time expired), the "answer every question" check is
    // skipped — the student can no longer fix anything, so blocking
    // submission on missing answers would leave them stuck. Submission
    // still requires an explicit click either way; nothing here submits
    // automatically.
    async function handleSubmit() {
        if (hasSubmittedRef.current || !attemptId) return

        if (!isLocked) {
            const unanswered = displayQuestions.filter((q) => !isAnswered(q))
            if (unanswered.length > 0) {
                setError('Please answer every question before submitting.')
                return
            }
        }

        hasSubmittedRef.current = true
        setIsSubmitting(true)
        setError('')

        const studentAnswers = displayQuestions.map((q) => ({
            questionId: q.id,
            selectedOptionIds: answers[q.id]?.selectedOptionIds ?? [],
            textResponse: answers[q.id]?.textResponse ?? '',
        }))

        try {
            const result = await gradeQuizSubmission(quiz.id, attemptId, studentAnswers)
            router.push(`/student/courses/${courseId}/quizzes/${quiz.id}/results?attempt=${result.attemptId}`)
        } catch {
            hasSubmittedRef.current = false
            setError('Could not submit the quiz. Please try again.')
            setIsSubmitting(false)
        }
    }

    if (isStarting) {
        return (
            <div className="max-w-2xl">
                <p className="text-body-md text-text-secondary">Loading quiz…</p>
            </div>
        )
    }

    if (startError) {
        return (
            <div className="max-w-2xl">
                <p className="text-body-emphasis text-error">{startError}</p>
            </div>
        )
    }

    const isTimeLow = remainingSeconds !== null && remainingSeconds <= 60
    const formattedTime =
        remainingSeconds !== null
            ? `${Math.floor(Math.max(remainingSeconds, 0) / 60)}:${String(Math.max(remainingSeconds, 0) % 60).padStart(2, '0')}`
            : null

    return (
        <div className="max-w-2xl">
            <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="font-heading text-h1 text-ink">{quiz.title}</h1>
                {formattedTime && (
                    <span
                        className={`text-body-emphasis whitespace-nowrap ${isTimeLow ? 'text-error' : 'text-ink'}`}
                        role="timer"
                        aria-live="polite"
                    >
                        {formattedTime}
                    </span>
                )}
            </div>
            {quiz.description && (
                <p className="text-body-md text-text-secondary mb-8">{quiz.description}</p>
            )}

            <div className="grid gap-4 mb-8">
                {displayQuestions.map((question, index) => (
                    <div key={question.id} className="bg-surface rounded-md shadow-card p-6">
                        <p className="text-caption text-text-secondary mb-2">Question {index + 1}</p>
                        <p className="text-body-emphasis text-ink mb-4">{question.question_text}</p>

                        {question.question_type === 'short_answer' ? (
                            <textarea
                                value={answers[question.id]?.textResponse ?? ''}
                                onChange={(e) => setTextAnswer(question.id, e.target.value)}
                                placeholder="Type your answer here"
                                disabled={isLocked}
                                className="w-full rounded-md border-[1.5px] border-hairline-strong px-4 py-3 text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60"
                                rows={3}
                            />
                        ) : question.question_type === 'checklist' ? (
                            <div className="grid gap-2">
                                {question.options.map((option) => (
                                    <label
                                        key={option.id}
                                        className="flex items-center gap-3 rounded-md border-[1.5px] border-hairline-strong px-4 py-3 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(answers[question.id]?.selectedOptionIds ?? []).includes(option.id)}
                                            onChange={() => toggleChecklistAnswer(question.id, option.id)}
                                            disabled={isLocked}
                                            className="h-5 w-5 accent-brand"
                                        />
                                        <span className="text-body-md text-ink">{option.option_text}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {question.options.map((option) => (
                                    <label
                                        key={option.id}
                                        className="flex items-center gap-3 rounded-md border-[1.5px] border-hairline-strong px-4 py-3 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${question.id}`}
                                            checked={(answers[question.id]?.selectedOptionIds ?? [])[0] === option.id}
                                            onChange={() => selectSingleAnswer(question.id, option.id, question.question_type)}
                                            disabled={isLocked}
                                            className="h-5 w-5 accent-brand"
                                        />
                                        <span className="text-body-md text-ink">{option.option_text}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <p className="text-caption text-error mb-4" role="alert">
                    {error}
                </p>
            )}

            {isLocked && (
                <p className="text-caption text-error mb-3">
                    Time's up — you can no longer change your answers. Click below to submit.
                </p>
            )}

            <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-caption text-text-secondary" aria-live="polite">
                    {autosaveStatus === 'saving' && 'Saving…'}
                    {autosaveStatus === 'saved' && 'All answers saved'}
                    {autosaveStatus === 'error' && "Couldn't save — will retry on your next answer"}
                </span>
            </div>

            <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="w-full h-11 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
            >
                {isSubmitting ? 'Submitting…' : 'Submit quiz'}
            </button>
        </div>
    )
}