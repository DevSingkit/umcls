'use client'
// features/missions/components/AddActivityForm.tsx
//
// MIGRATION 094 REWRITE (2026-09-01): an activity is now a CONTAINER
// holding multiple questions, each with its own options — this form
// previously built ONE flat prompt/options/correctAnswer set and sent
// it directly as `formData.set('prompt', ...)` etc., which never
// matched addActivity's already-rewritten contract (a JSON `questions`
// array). That mismatch meant this form could not actually create a
// working activity against the current schema at all — this is a real
// functional fix, not a style pass.
//
// Each question block below is independently typed-into/validated,
// mirroring the exact per-question shape addActivity's
// questionInputSchema expects: { prompt, questionType, options
// (comma-joined string, multiple_choice_single only), correctAnswer,
// hintText }. The activity-level field (remediatesActivityId) is
// unchanged — remediation still applies to the whole activity
// container, not to an individual question.
//
// PHASE A VISUAL-ONLY PASS (2026-09-04): this form was missed in the
// earlier tactile-tile rebuild that already covered NewMissionForm.tsx
// and ActivityCard.tsx — it still used a plain bordered-circle "click
// to mark correct" bullet for options, and still carried the full
// lg:grid-cols-2 "Student preview" side panel. Both removed here to
// match those two files exactly: options (and true/false) now render
// as the same tactile tiles (tap tile = mark correct, colored bg,
// check badge), and the layout collapses to single-column mobile-first
// with no preview column. No business logic touched — questions state,
// handlers, validation, and questionsPayload construction are all
// byte-for-byte identical to before.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lightbulb, Plus, Check, Circle, Square, Triangle, Diamond } from 'lucide-react'
import { addActivity } from '@/features/missions/actions/create-activity'

type QuestionType = 'multiple_choice_single' | 'true_false'

// Same 4-color/4-shape tile system as ActivityRunner.tsx's real gameplay
// tiles, NewMissionForm.tsx's builder, and ActivityCard.tsx's editor —
// copied here directly (not imported, since none of those files export
// it) so this form's tiles are visually identical to all three.
const TILE_STYLES = [
    { icon: Circle, bg: 'bg-brand', border: 'border-brand-border' },
    { icon: Square, bg: 'bg-info', border: 'border-gamified-pink-dark' },
    { icon: Triangle, bg: 'bg-warning', border: 'border-[#C47A30]' },
    { icon: Diamond, bg: 'bg-brand-hover', border: 'border-brand-border' },
]

type ExistingActivity = {
    id: string
    // Activities have no prompt of their own anymore — the real shape
    // getMissionForTeacher returns nests questions underneath. Same
    // fix as ActivityCard.tsx's labelForActivity; missed here
    // originally, causing a runtime crash on any mission with an
    // existing activity.
    questions: { prompt: string }[]
}

let keySeed = 0
function nextKey(prefix: string) {
    keySeed += 1
    return `${prefix}-${keySeed}`
}

function makeEmptyOption() {
    return { key: nextKey('option'), text: '' }
}

function makeEmptyQuestion() {
    return {
        key: nextKey('question'),
        questionType: 'multiple_choice_single' as QuestionType,
        prompt: '',
        options: [makeEmptyOption(), makeEmptyOption()],
        correctIndex: null as number | null,
        correctTf: 'True' as 'True' | 'False',
        hintText: '',
    }
}

type QuestionDraft = ReturnType<typeof makeEmptyQuestion>

export function AddActivityForm({
    missionId,
    existingActivities = [],
}: {
    missionId: string
    existingActivities?: ExistingActivity[]
}) {
    const router = useRouter()
    const [questions, setQuestions] = useState<QuestionDraft[]>([makeEmptyQuestion()])
    const [remediatesActivityId, setRemediatesActivityId] = useState('')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    function updateQuestion(key: string, patch: Partial<QuestionDraft>) {
        setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
    }

    function addQuestionBlock() {
        setQuestions((prev) => [...prev, makeEmptyQuestion()])
    }

    function removeQuestionBlock(key: string) {
        setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.key !== key) : prev))
    }

    function updateOptionText(questionKey: string, optionKey: string, text: string) {
        setQuestions((prev) =>
            prev.map((q) =>
                q.key === questionKey
                    ? { ...q, options: q.options.map((o) => (o.key === optionKey ? { ...o, text } : o)) }
                    : q
            )
        )
    }

    function addOptionRow(questionKey: string) {
        setQuestions((prev) =>
            prev.map((q) => (q.key === questionKey ? { ...q, options: [...q.options, makeEmptyOption()] } : q))
        )
    }

    function removeOptionRow(questionKey: string, optionKey: string) {
        setQuestions((prev) =>
            prev.map((q) => {
                if (q.key !== questionKey) return q
                const removedIndex = q.options.findIndex((o) => o.key === optionKey)
                const nextOptions = q.options.filter((o) => o.key !== optionKey)
                let nextCorrectIndex = q.correctIndex
                if (nextCorrectIndex !== null) {
                    if (removedIndex === nextCorrectIndex) nextCorrectIndex = null
                    else if (removedIndex < nextCorrectIndex) nextCorrectIndex = nextCorrectIndex - 1
                }
                return { ...q, options: nextOptions, correctIndex: nextCorrectIndex }
            })
        )
    }

    function resetForm() {
        setQuestions([makeEmptyQuestion()])
        setRemediatesActivityId('')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        for (const q of questions) {
            if (!q.prompt.trim()) {
                setError('Every question needs a prompt.')
                return
            }
            if (q.questionType === 'multiple_choice_single') {
                const filled = q.options.map((o) => o.text.trim()).filter(Boolean)
                if (filled.length < 2) {
                    setError('Each multiple choice question needs at least two answer options.')
                    return
                }
                if (q.correctIndex === null || !q.options[q.correctIndex]?.text.trim()) {
                    setError('Click the bullet next to each question\u2019s correct answer.')
                    return
                }
            }
        }

        // Matches addActivity's questionInputSchema exactly: prompt,
        // questionType, options (comma-joined, MC only), correctAnswer,
        // hintText. Sent as one JSON array under the `questions` field,
        // same convention create-activity.ts's own header documents.
        const questionsPayload = questions.map((q) => {
            if (q.questionType === 'true_false') {
                return {
                    prompt: q.prompt.trim(),
                    questionType: q.questionType,
                    correctAnswer: q.correctTf,
                    hintText: q.hintText.trim() || undefined,
                }
            }
            const filledOptions = q.options.map((o) => o.text.trim()).filter(Boolean)
            const correctOption = q.correctIndex !== null ? q.options[q.correctIndex] : undefined
            return {
                prompt: q.prompt.trim(),
                questionType: q.questionType,
                options: filledOptions.join(','),
                correctAnswer: correctOption?.text.trim() ?? '',
                hintText: q.hintText.trim() || undefined,
            }
        })

        const formData = new FormData()
        formData.set('missionId', missionId)
        formData.set('questions', JSON.stringify(questionsPayload))
        if (remediatesActivityId) formData.set('remediatesActivityId', remediatesActivityId)

        setIsPending(true)
        const result = await addActivity(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        resetForm()
        router.refresh()
    }

    return (
        <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-md sm:max-w-lg space-y-6 clay-card p-5 sm:p-6"
        >
                {questions.map((q, qIndex) => (
                    <div
                        key={q.key}
                        className="space-y-4 rounded-2xl border border-hairline p-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-label text-ink-soft">Question {qIndex + 1}</p>
                            {questions.length > 1 && (
                                <button
                                    type="button"
                                    aria-label={`Remove question ${qIndex + 1}`}
                                    onClick={() => removeQuestionBlock(q.key)}
                                    className="text-text-secondary hover:text-error p-1 rounded-md transition-colors"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            )}
                        </div>

                        <div>
                            <label htmlFor={`questionType-${q.key}`} className="text-label text-ink-soft block mb-2">
                                Question type
                            </label>
                            <select
                                id={`questionType-${q.key}`}
                                value={q.questionType}
                                onChange={(e) => updateQuestion(q.key, { questionType: e.target.value as QuestionType })}
                                className="clay-well w-full min-h-touch px-4 rounded-2xl border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                            >
                                <option value="multiple_choice_single">Multiple choice</option>
                                <option value="true_false">True / False</option>
                            </select>
                        </div>

                        <textarea
                            aria-label={`Question ${qIndex + 1} prompt`}
                            rows={2}
                            required
                            value={q.prompt}
                            onChange={(e) => updateQuestion(q.key, { prompt: e.target.value })}
                            className="clay-well w-full px-5 py-3 rounded-2xl border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                            placeholder="Type the question prompt here"
                        />

                        {q.questionType === 'multiple_choice_single' && (
                            <div className="space-y-3">
                                <p className="text-caption text-text-secondary">
                                    Tap a tile to mark it as the correct answer
                                </p>
                                {q.options.map((option, optIndex) => {
                                    const style = TILE_STYLES[optIndex % TILE_STYLES.length] ?? TILE_STYLES[0]!
                                    const Icon = style.icon
                                    const isCorrect = q.correctIndex === optIndex
                                    return (
                                        <div
                                            key={option.key}
                                            className={`relative flex min-h-touch w-full items-center gap-3 rounded-2xl p-4 text-on-ink shadow-clay-button border-b-[6px] transition-all active:border-b-0 active:translate-y-1 active:shadow-none ${style.bg} ${style.border} ${
                                                isCorrect ? 'ring-4 ring-success ring-offset-2' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                aria-label={`Mark option ${optIndex + 1} as correct`}
                                                onClick={() => updateQuestion(q.key, { correctIndex: optIndex })}
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-white/20"
                                            >
                                                {isCorrect ? (
                                                    <Check size={20} aria-hidden="true" />
                                                ) : (
                                                    <Icon size={18} aria-hidden="true" />
                                                )}
                                            </button>
                                            <input
                                                type="text"
                                                value={option.text}
                                                onChange={(e) => updateOptionText(q.key, option.key, e.target.value)}
                                                placeholder={`Option ${optIndex + 1}`}
                                                className="min-w-0 flex-1 bg-transparent font-sans font-bold text-base text-on-ink placeholder:text-on-ink/60 outline-none"
                                            />
                                            {isCorrect && (
                                                <span className="shrink-0 rounded-pill bg-white/20 px-2.5 py-1 text-caption">
                                                    Correct
                                                </span>
                                            )}
                                            {q.options.length > 2 && (
                                                <button
                                                    type="button"
                                                    aria-label={`Remove option ${optIndex + 1}`}
                                                    onClick={() => removeOptionRow(q.key, option.key)}
                                                    className="shrink-0 text-on-ink/70 hover:text-on-ink p-1 rounded-md"
                                                >
                                                    <X size={16} aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                                <button
                                    type="button"
                                    onClick={() => addOptionRow(q.key)}
                                    className="text-caption font-semibold text-text-secondary hover:text-ink pl-2"
                                >
                                    + Add option
                                </button>
                            </div>
                        )}

                        {q.questionType === 'true_false' && (
                            <div className="space-y-3">
                                <p className="text-caption text-text-secondary">
                                    Tap a tile to mark it as the correct answer
                                </p>
                                {(['True', 'False'] as const).map((label, i) => {
                                    const style = TILE_STYLES[i % TILE_STYLES.length] ?? TILE_STYLES[0]!
                                    const Icon = style.icon
                                    const isCorrect = q.correctTf === label
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => updateQuestion(q.key, { correctTf: label })}
                                            className={`flex min-h-touch w-full items-center gap-3 rounded-2xl p-4 text-left text-on-ink shadow-clay-button border-b-[6px] transition-all active:border-b-0 active:translate-y-1 active:shadow-none ${style.bg} ${style.border} ${
                                                isCorrect ? 'ring-4 ring-success ring-offset-2' : ''
                                            }`}
                                        >
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-white/20">
                                                {isCorrect ? (
                                                    <Check size={20} aria-hidden="true" />
                                                ) : (
                                                    <Icon size={18} aria-hidden="true" />
                                                )}
                                            </span>
                                            <span className="font-sans font-bold text-base">{label}</span>
                                            {isCorrect && (
                                                <span className="ml-auto shrink-0 rounded-pill bg-white/20 px-2.5 py-1 text-caption">
                                                    Correct
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        <div>
                            <label htmlFor={`hint-${q.key}`} className="text-label text-ink-soft block mb-2">
                                Hint (optional — shown after 2 wrong attempts)
                            </label>
                            <textarea
                                id={`hint-${q.key}`}
                                rows={2}
                                value={q.hintText}
                                onChange={(e) => updateQuestion(q.key, { hintText: e.target.value })}
                                placeholder="A nudge in the right direction, not the answer itself"
                                className="clay-well w-full px-5 py-3 rounded-2xl border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                            />
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addQuestionBlock}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-md border-2 border-dashed border-hairline text-caption font-semibold text-brand hover:border-brand hover:bg-brand-soft transition-colors"
                >
                    <Plus size={16} aria-hidden="true" />
                    Add another question to this activity
                </button>

                {existingActivities.length > 0 && (
                    <div>
                        <label htmlFor="addActivityRemediation" className="text-label text-ink-soft block mb-2">
                            Remediation (optional — shown after repeated wrong answers)
                        </label>
                        <select
                            id="addActivityRemediation"
                            value={remediatesActivityId}
                            onChange={(e) => setRemediatesActivityId(e.target.value)}
                            className="clay-well w-full min-h-touch px-4 rounded-2xl border-2 border-hairline focus:border-brand outline-none text-body-md text-ink"
                        >
                            <option value="">None</option>
                            {existingActivities.map((a) => {
                                const label = a.questions[0]?.prompt ?? '(no questions)'
                                return (
                                    <option key={a.id} value={a.id}>
                                        {label.length > 70 ? `${label.slice(0, 70)}…` : label}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                )}

                {error && (
                    <p className="text-caption text-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="clay-button w-full bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md disabled:opacity-60"
                >
                    {isPending ? 'Adding…' : 'Add activity'}
                </button>
            </form>
    )
}
