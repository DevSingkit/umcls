'use client'
// features/missions/components/AddActivityForm.tsx
//
// Mirrors features/quizzes/components/AddQuestionForm.tsx: add one
// activity at a time, options as individual rows, correct answer
// marked by clicking its bullet rather than retyping it below.
//
// Differences from AddQuestionForm.tsx:
// - No checklist or short_answer types — see create-mission.ts's
//   header for why short_answer is excluded for now.
// - Has a hint field (activities have hint_text; questions don't).
// - No "reset attempts" confirm step after adding to an already-live
//   mission. AddQuestionForm.tsx's equivalent calls resetQuizAttempts
//   (a migration-062 RPC) — no equivalent RPC exists yet for
//   mission_progress/attempt_events (which is service-role-only per
//   HANDOFF.md's Day-1 note), so that parity gap is deferred to
//   whenever Day 4 builds the mastery-loop write path. For now, adding
//   an activity to a published mission just saves silently; students
//   already partway through won't be prompted to retake anything.
//
// REMEDIATION FIX (2026-08-30, continued conversation): addActivity's
// own schema already accepted remediatesActivityId (see that action's
// comment — this was anticipated but never actually wired up on the
// UI side), same gap fixed in ActivityCard.tsx alongside this. New
// existingActivities prop lets a teacher point a NEW activity at an
// already-existing one in the same mission — meaningful once the
// mission already has at least one other activity, per addActivity's
// own original reasoning.
//
// DESIGN-LMS 2.1 REDESIGN (2026-08-31): pure visual pass, no logic
// touched — every state variable, validation branch, and the
// handleSubmit body below are byte-for-byte identical to before this
// pass. Two changes only:
//   1. The ✕ remove-option glyph (a raw unicode character, not an SVG
//      icon) replaced with lucide-react's X, per §1.3's zero-emoji/
//      icon-only rule — this glyph isn't technically an emoji but is
//      the same class of "non-SVG icon" the rule exists to prevent.
//   2. A new live preview panel added alongside the form. User's
//      explicit direction: form CONTROLS stay Classroom Mode (clarity/
//      focus for a CRUD task); Mission Mode tactile styling (rounded-
//      2xl, border-b-4, Fredoka) is reserved strictly for this preview
//      panel, so teachers can verify the student-facing look without
//      the editing UI itself turning into a game. Preview scope per
//      user: live question prompt in student font, tactile 3D option
//      tiles with the correct one visibly marked FOR THE TEACHER ONLY
//      (a real ActivityRunner never marks the correct answer before
//      submission — this preview intentionally breaks that parity
//      since its whole purpose is letting the teacher check their own
//      work), the hint if present, and existing activities are shown
//      as a small reference list so a remediation target is visible
//      before it's picked in the dropdown below.
//
//      Preview only renders once there's a real prompt to show —
//      an empty preview panel isn't useful and just adds visual noise
//      to a form that's otherwise been kept intentionally lean.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lightbulb, Eye } from 'lucide-react'
import { addActivity } from '@/features/missions/actions/create-activity'

type ActivityType = 'multiple_choice_single' | 'true_false'

// Minimal shape needed to list siblings in the picker — deliberately
// not importing ActivityCard's fuller Activity type, since this form
// only needs id + prompt, not the whole activity_options/hint shape.
type ExistingActivity = {
    id: string
    prompt: string
}

let optionKeySeed = 0
function nextOptionKey() {
    optionKeySeed += 1
    return `option-${optionKeySeed}`
}

function makeEmptyOption() {
    return { key: nextOptionKey(), text: '' }
}

export function AddActivityForm({
    missionId,
    existingActivities = [],
}: {
    missionId: string
    // Every activity already in this mission — the "new" activity
    // being created here doesn't exist yet, so there's no self-
    // exclusion needed the way ActivityCard.tsx's edit picker has.
    // Defaults to [] so existing callers that haven't been updated to
    // pass this yet don't break — the picker just won't offer any
    // options until they do.
    existingActivities?: ExistingActivity[]
}) {
    const router = useRouter()
    const [activityType, setActivityType] = useState<ActivityType>('multiple_choice_single')
    const [prompt, setPrompt] = useState('')
    const [options, setOptions] = useState([makeEmptyOption(), makeEmptyOption()])
    const [correctIndex, setCorrectIndex] = useState<number | null>(null)
    const [correctTf, setCorrectTf] = useState<'True' | 'False'>('True')
    const [hintText, setHintText] = useState('')
    const [remediatesActivityId, setRemediatesActivityId] = useState('')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    function updateOptionText(key: string, text: string) {
        setOptions((prev) => prev.map((o) => (o.key === key ? { ...o, text } : o)))
    }

    function addOptionRow() {
        setOptions((prev) => [...prev, makeEmptyOption()])
    }

    function removeOptionRow(key: string) {
        setOptions((prev) => {
            const removedIndex = prev.findIndex((o) => o.key === key)
            const next = prev.filter((o) => o.key !== key)
            if (correctIndex !== null) {
                if (removedIndex === correctIndex) setCorrectIndex(null)
                else if (removedIndex < correctIndex) setCorrectIndex(correctIndex - 1)
            }
            return next
        })
    }

    function resetForm() {
        setPrompt('')
        setOptions([makeEmptyOption(), makeEmptyOption()])
        setCorrectIndex(null)
        setCorrectTf('True')
        setHintText('')
        setRemediatesActivityId('')
        setActivityType('multiple_choice_single')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (activityType === 'multiple_choice_single') {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            if (filledOptions.length < 2) {
                setError('Add at least two answer options.')
                return
            }
            if (correctIndex === null || !options[correctIndex]?.text.trim()) {
                setError('Click the bullet next to the correct answer.')
                return
            }
        }

        const formData = new FormData()
        formData.set('missionId', missionId)
        formData.set('prompt', prompt)
        formData.set('activityType', activityType)
        if (hintText.trim()) formData.set('hintText', hintText.trim())
        if (remediatesActivityId) formData.set('remediatesActivityId', remediatesActivityId)

        if (activityType === 'true_false') {
            formData.set('correctAnswer', correctTf)
        } else {
            const filledOptions = options.map((o) => o.text.trim()).filter(Boolean)
            const correctOption = correctIndex !== null ? options[correctIndex] : undefined
            formData.set('options', filledOptions.join(','))
            formData.set('correctAnswer', correctOption?.text.trim() ?? '')
        }

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

    const trimmedPrompt = prompt.trim()
    const showPreview = trimmedPrompt.length > 0

    return (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* ── Classroom Mode form controls — unchanged behavior ───────── */}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 bg-surface rounded-md border border-hairline shadow-card p-6">
                <div>
                    <label htmlFor="addActivityType" className="text-label text-ink-soft block mb-2">
                        Activity type
                    </label>
                    <select
                        id="addActivityType"
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as ActivityType)}
                        className="w-full h-11 px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    >
                        <option value="multiple_choice_single">Multiple choice</option>
                        <option value="true_false">True / False</option>
                    </select>
                </div>

                <textarea
                    aria-label="Activity prompt"
                    rows={2}
                    required
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    placeholder="Type the activity prompt here"
                />

                {activityType === 'multiple_choice_single' && (
                    <div className="space-y-2">
                        <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                        {options.map((option, index) => (
                            <div key={option.key} className="flex items-center gap-3">
                                <button
                                    type="button"
                                    aria-label={`Mark option ${index + 1} as correct`}
                                    onClick={() => setCorrectIndex(index)}
                                    className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${correctIndex === index
                                            ? 'border-brand bg-brand text-on-ink'
                                            : 'border-hairline-strong hover:border-brand'
                                        }`}
                                >
                                    {correctIndex === index && (
                                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                                <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) => updateOptionText(option.key, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        aria-label={`Remove option ${index + 1}`}
                                        onClick={() => removeOptionRow(option.key)}
                                        className="text-text-secondary hover:text-error p-2 rounded-md transition-colors"
                                    >
                                        <X size={18} aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addOptionRow}
                            className="text-caption font-semibold text-text-secondary hover:text-ink pl-8"
                        >
                            + Add option
                        </button>
                    </div>
                )}

                {activityType === 'true_false' && (
                    <div className="space-y-2">
                        <p className="text-caption text-text-secondary">Click the bullet to mark the correct answer</p>
                        {(['True', 'False'] as const).map((label) => (
                            <div key={label} className="flex items-center gap-3">
                                <button
                                    type="button"
                                    aria-label={`Mark ${label} as correct`}
                                    onClick={() => setCorrectTf(label)}
                                    className={`flex items-center justify-center w-5 h-5 rounded-pill border-2 shrink-0 transition-colors ${correctTf === label
                                            ? 'border-brand bg-brand text-on-ink'
                                            : 'border-hairline-strong hover:border-brand'
                                        }`}
                                >
                                    {correctTf === label && (
                                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                            <path
                                                fillRule="evenodd"
                                                d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    )}
                                </button>
                                <span className="text-body-md text-ink">{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <label htmlFor="addActivityHint" className="text-label text-ink-soft block mb-2">
                        Hint (optional — shown after 2 wrong attempts)
                    </label>
                    <textarea
                        id="addActivityHint"
                        rows={2}
                        value={hintText}
                        onChange={(e) => setHintText(e.target.value)}
                        placeholder="A nudge in the right direction, not the answer itself"
                        className="w-full px-5 py-3 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                {existingActivities.length > 0 && (
                    <div>
                        <label htmlFor="addActivityRemediation" className="text-label text-ink-soft block mb-2">
                            Remediation (optional — shown after repeated wrong answers)
                        </label>
                        <select
                            id="addActivityRemediation"
                            value={remediatesActivityId}
                            onChange={(e) => setRemediatesActivityId(e.target.value)}
                            className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink"
                        >
                            <option value="">None</option>
                            {existingActivities.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.prompt.length > 70 ? `${a.prompt.slice(0, 70)}…` : a.prompt}
                                </option>
                            ))}
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
                    className="w-full h-11 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                >
                    {isPending ? 'Adding…' : 'Add activity'}
                </button>
            </form>

            {/* ── Mission Mode live preview — student-facing look only ───── */}
            <div className="lg:sticky lg:top-6">
                <div className="flex items-center gap-2 mb-3 text-text-secondary">
                    <Eye size={16} aria-hidden="true" />
                    <p className="text-caption font-semibold uppercase tracking-wide">
                        Student preview
                    </p>
                </div>

                {!showPreview ? (
                    <div className="rounded-2xl border-2 border-dashed border-hairline-strong p-8 text-center">
                        <p className="font-sans text-caption text-text-muted">
                            Start typing a prompt to see how this activity will look to students.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl bg-surface-sunken border-2 border-hairline p-6">
                        <p className="font-heading text-mission md:text-[1.75rem] text-ink mb-5">
                            {trimmedPrompt}
                        </p>

                        {activityType === 'multiple_choice_single' && (
                            <div className="space-y-3">
                                {options
                                    .map((option, index) => ({ option, index }))
                                    .filter(({ option }) => option.text.trim().length > 0)
                                    .map(({ option, index }) => {
                                        const isCorrect = correctIndex === index
                                        return (
                                            <div
                                                key={option.key}
                                                className={`w-full min-h-[60px] p-4 rounded-2xl border-2 border-b-4 flex items-center justify-between text-left ${
                                                    isCorrect
                                                        ? 'bg-success-soft border-success border-b-success'
                                                        : 'bg-surface border-hairline border-b-hairline-strong'
                                                }`}
                                            >
                                                <span className="font-sans font-bold text-base text-ink">
                                                    {option.text}
                                                </span>
                                                {isCorrect && (
                                                    <span className="shrink-0 font-sans text-caption font-semibold text-success">
                                                        Correct answer
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                {options.every((o) => !o.text.trim()) && (
                                    <p className="font-sans text-caption text-text-muted">
                                        Add answer options to preview them here.
                                    </p>
                                )}
                            </div>
                        )}

                        {activityType === 'true_false' && (
                            <div className="space-y-3">
                                {(['True', 'False'] as const).map((label) => {
                                    const isCorrect = correctTf === label
                                    return (
                                        <div
                                            key={label}
                                            className={`w-full min-h-[60px] p-4 rounded-2xl border-2 border-b-4 flex items-center justify-between text-left ${
                                                isCorrect
                                                    ? 'bg-success-soft border-success border-b-success'
                                                    : 'bg-surface border-hairline border-b-hairline-strong'
                                            }`}
                                        >
                                            <span className="font-sans font-bold text-base text-ink">{label}</span>
                                            {isCorrect && (
                                                <span className="shrink-0 font-sans text-caption font-semibold text-success">
                                                    Correct answer
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {hintText.trim() && (
                            <div className="mt-5 flex items-start gap-2 rounded-md bg-warning-soft p-3">
                                <Lightbulb size={16} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                                <p className="font-sans text-caption text-ink-soft">{hintText.trim()}</p>
                            </div>
                        )}

                        <p className="font-sans text-caption text-text-muted mt-5">
                            The correct answer is marked here for your reference only — students never
                            see this until after they submit.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
