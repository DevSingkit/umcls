'use client'
// features/missions/components/NewMissionForm.tsx
//
// UX REBUILD (2026-09-02): the previous version had a two-column
// desktop layout (form controls + a separate "Student Preview" panel
// showing tactile tiles), with a "stage one activity, click Add
// activity to mission, repeat" intermediate step before one final
// Create Mission click. User feedback after actually using it: the
// split-preview layout read as confusing (screenshot showed how
// cramped/disconnected it looked once real content was typed in), the
// extra staging click was an unwanted extra step, and this app is
// mobile-first — a wide two-column layout was never the right target
// shape to begin with.
//
// What changed, confirmed explicitly with the user before rebuilding:
//   1. NO separate preview panel anywhere. The question builder's
//      OWN answer options are now real tactile tiles (same TILE_STYLES
//      colors/icons as ActivityRunner.tsx's actual gameplay tiles) —
//      the authoring UI IS the student-facing look, not a preview of
//      it running alongside a plainer form.
//   2. Marking the correct answer: tapping the TILE ITSELF marks it
//      correct (green ring + check badge appears on that tile) — no
//      separate bullet/radio control at all, confirmed explicitly.
//   3. NO "Add activity to mission" staging step. Multiple activities
//      are built inline, stacked as sections on one continuous page —
//      "Add another activity" appends a new activity section below the
//      current ones. Everything (mission details + every activity's
//      every question) is collected in local state and sent together
//      in ONE call when "Create mission" is clicked — nothing is
//      staged/submitted per-activity anymore.
//   4. Mobile-first single column, confirmed to stay single-column even
//      on desktop (not a wider two-column layout) — centered, generous
//      spacing, no side panel competing for width.
//
// True/false questions keep two tiles (True / False) using the same
// tactile tile treatment — tapping either marks it correct, same
// interaction as multiple choice, just a fixed two-option set.
//
// Server contract UNCHANGED: still calls createMissionWithFirstActivity
// once, with the same 'activities' JSON array shape
// (activities[].questions[].{prompt,questionType,options,
// correctAnswer,hintText}) — only the CLIENT UI/interaction model
// changed, not what gets sent to the server.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Lightbulb, Plus, Check, Circle, Square, Triangle, Diamond, Target } from 'lucide-react'
import { createMissionWithFirstActivity } from '@/features/missions/actions/create-mission'

type QuestionType = 'multiple_choice_single' | 'true_false'

// Same 4-color/4-shape tile system as ActivityRunner.tsx's real
// gameplay tiles — copied here directly (not imported, since that
// component doesn't export it) so the authoring tiles are visually
// identical to what a student actually sees, not an approximation.
const TILE_STYLES = [
    { icon: Circle, bg: 'bg-brand', border: 'border-brand-border' },
    { icon: Square, bg: 'bg-info', border: 'border-gamified-pink-dark' },
    { icon: Triangle, bg: 'bg-warning', border: 'border-[#C47A30]' },
    { icon: Diamond, bg: 'bg-brand-hover', border: 'border-brand-border' },
]

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

function makeEmptyActivity() {
    return {
        key: nextKey('activity'),
        questions: [makeEmptyQuestion()],
    }
}

type ActivityDraft = ReturnType<typeof makeEmptyActivity>

export function NewMissionForm({ courseId, lessonId }: { courseId: string; lessonId: string }) {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    // Every activity being built, inline, on this one page — no
    // separate staging list. Each activity has its own array of
    // question drafts.
    const [activities, setActivities] = useState<ActivityDraft[]>([makeEmptyActivity()])

    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    const [masteryThreshold, setMasteryThreshold] = useState(3)
    const [revealCorrectAnswer, setRevealCorrectAnswer] = useState(true)
    const [shuffleOptions, setShuffleOptions] = useState(false)
    const [publishNow, setPublishNow] = useState(false)

    function updateQuestion(activityKey: string, questionKey: string, patch: Partial<QuestionDraft>) {
        setActivities((prev) =>
            prev.map((a) =>
                a.key !== activityKey
                    ? a
                    : { ...a, questions: a.questions.map((q) => (q.key === questionKey ? { ...q, ...patch } : q)) }
            )
        )
    }

    function addQuestionBlock(activityKey: string) {
        setActivities((prev) =>
            prev.map((a) => (a.key === activityKey ? { ...a, questions: [...a.questions, makeEmptyQuestion()] } : a))
        )
    }

    function removeQuestionBlock(activityKey: string, questionKey: string) {
        setActivities((prev) =>
            prev.map((a) =>
                a.key === activityKey && a.questions.length > 1
                    ? { ...a, questions: a.questions.filter((q) => q.key !== questionKey) }
                    : a
            )
        )
    }

    function updateOptionText(activityKey: string, questionKey: string, optionKey: string, text: string) {
        setActivities((prev) =>
            prev.map((a) =>
                a.key !== activityKey
                    ? a
                    : {
                          ...a,
                          questions: a.questions.map((q) =>
                              q.key === questionKey
                                  ? { ...q, options: q.options.map((o) => (o.key === optionKey ? { ...o, text } : o)) }
                                  : q
                          ),
                      }
            )
        )
    }

    function addOptionRow(activityKey: string, questionKey: string) {
        setActivities((prev) =>
            prev.map((a) =>
                a.key !== activityKey
                    ? a
                    : {
                          ...a,
                          questions: a.questions.map((q) =>
                              q.key === questionKey ? { ...q, options: [...q.options, makeEmptyOption()] } : q
                          ),
                      }
            )
        )
    }

    function removeOptionRow(activityKey: string, questionKey: string, optionKey: string) {
        setActivities((prev) =>
            prev.map((a) => {
                if (a.key !== activityKey) return a
                return {
                    ...a,
                    questions: a.questions.map((q) => {
                        if (q.key !== questionKey) return q
                        const removedIndex = q.options.findIndex((o) => o.key === optionKey)
                        const nextOptions = q.options.filter((o) => o.key !== optionKey)
                        let nextCorrectIndex = q.correctIndex
                        if (nextCorrectIndex !== null) {
                            if (removedIndex === nextCorrectIndex) nextCorrectIndex = null
                            else if (removedIndex < nextCorrectIndex) nextCorrectIndex = nextCorrectIndex - 1
                        }
                        return { ...q, options: nextOptions, correctIndex: nextCorrectIndex }
                    }),
                }
            })
        )
    }

    function addActivity() {
        setActivities((prev) => [...prev, makeEmptyActivity()])
    }

    function removeActivity(activityKey: string) {
        setActivities((prev) => (prev.length > 1 ? prev.filter((a) => a.key !== activityKey) : prev))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (title.trim().length < 2) {
            setError('Give this mission a name (at least 2 characters).')
            return
        }

        if (!Number.isInteger(masteryThreshold) || masteryThreshold < 1) {
            setError('Mastery threshold must be at least 1.')
            return
        }

        // Validate every activity's every question before building the
        // payload — same "never write an empty mission" principle as
        // before, now checked across the whole inline page at once
        // instead of per-staged-activity.
        for (const [aIndex, activity] of activities.entries()) {
            for (const [qIndex, q] of activity.questions.entries()) {
                if (!q.prompt.trim()) {
                    setError(`Activity ${aIndex + 1}, question ${qIndex + 1}: enter a prompt.`)
                    return
                }
                if (q.questionType === 'multiple_choice_single') {
                    const filled = q.options.map((o) => o.text.trim()).filter(Boolean)
                    if (filled.length < 2) {
                        setError(`Activity ${aIndex + 1}, question ${qIndex + 1}: add at least two answer options.`)
                        return
                    }
                    if (q.correctIndex === null || !q.options[q.correctIndex]?.text.trim()) {
                        setError(`Activity ${aIndex + 1}, question ${qIndex + 1}: tap a tile to mark the correct answer.`)
                        return
                    }
                }
            }
        }

        // Same payload shape create-mission.ts's createMissionSchema
        // expects — built here in one pass across every activity/
        // question instead of accumulated via a staging step.
        const activitiesPayload = activities.map((activity) => ({
            questions: activity.questions.map((q) => {
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
            }),
        }))

        const formData = new FormData()
        formData.set('lessonId', lessonId)
        formData.set('title', title.trim())
        if (description.trim()) formData.set('description', description.trim())
        formData.set('masteryThreshold', String(masteryThreshold))
        formData.set('revealCorrectAnswer', String(revealCorrectAnswer))
        formData.set('shuffleOptions', String(shuffleOptions))
        formData.set('publish', String(publishNow))
        formData.set('activities', JSON.stringify(activitiesPayload))

        setIsPending(true)
        const result = await createMissionWithFirstActivity(formData)
        setIsPending(false)

        if (!result.ok) {
            setError(result.error)
            return
        }

        if (publishNow) {
            router.push(`/teacher/courses/${courseId}/lessons/${lessonId}`)
        } else {
            router.push(`/teacher/courses/${courseId}/lessons/${lessonId}/missions/${result.missionId}/edit`)
        }
    }

    const totalQuestionCount = activities.reduce((sum, a) => sum + a.questions.length, 0)

    return (
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-6 py-4 sm:max-w-lg sm:py-8">
            <div className="space-y-5 clay-card p-5 sm:p-6">
                <div>
                    <label htmlFor="newMissionTitle" className="text-label text-ink-soft block mb-2">
                        Mission name <span className="text-error">(required)</span>
                    </label>
                    <input
                        id="newMissionTitle"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            if (error) setError('')
                        }}
                        placeholder="e.g. Fractions: Adding & Subtracting"
                        aria-required="true"
                        className="clay-well w-full min-h-touch px-4 text-body-emphasis text-ink rounded-2xl border-[1.5px] border-hairline-strong focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="newMissionDescription" className="text-label text-ink-soft block mb-2">
                        Description (optional)
                    </label>
                    <textarea
                        id="newMissionDescription"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What will students practice in this mission?"
                        className="clay-well w-full px-5 py-3 rounded-2xl border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="newMissionMasteryThreshold" className="text-label text-ink-soft block mb-2">
                        Correct in a row to master this mission
                    </label>
                    <div className="flex items-center gap-2">
                        <Target size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
                        <input
                            id="newMissionMasteryThreshold"
                            type="number"
                            min={1}
                            value={masteryThreshold}
                            onChange={(e) => setMasteryThreshold(Number(e.target.value))}
                            className="clay-well w-24 min-h-touch px-4 text-body-md text-ink rounded-2xl border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="newMissionRevealCorrectAnswer" className="flex items-start gap-3 cursor-pointer">
                        <input
                            id="newMissionRevealCorrectAnswer"
                            type="checkbox"
                            checked={revealCorrectAnswer}
                            onChange={(e) => setRevealCorrectAnswer(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                        />
                        <span>
                            <span className="text-label text-ink-soft block">
                                Show the correct answer after a wrong attempt
                            </span>
                            <span className="text-caption text-text-secondary">
                                When off, students only see whether they were right or wrong — not what the
                                correct answer was.
                            </span>
                        </span>
                    </label>
                </div>

                <div>
                    <label htmlFor="newMissionShuffleOptions" className="flex items-start gap-3 cursor-pointer">
                        <input
                            id="newMissionShuffleOptions"
                            type="checkbox"
                            checked={shuffleOptions}
                            onChange={(e) => setShuffleOptions(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                        />
                        <span>
                            <span className="text-label text-ink-soft block">
                                Shuffle answer order for each student
                            </span>
                            <span className="text-caption text-text-secondary">
                                When off, options always appear in the order you added them.
                            </span>
                        </span>
                    </label>
                </div>
            </div>

            {/* ── Activities, stacked inline — no staging step ─────────── */}
            {activities.map((activity, aIndex) => (
                <div key={activity.key} className="space-y-4 clay-card p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-label text-ink-soft">Activity {aIndex + 1}</p>
                        {activities.length > 1 && (
                            <button
                                type="button"
                                aria-label={`Remove activity ${aIndex + 1}`}
                                onClick={() => removeActivity(activity.key)}
                                className="text-text-secondary hover:text-error p-1 rounded-md transition-colors"
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>

                    {activity.questions.map((q, qIndex) => (
                        <div key={q.key} className="space-y-4 rounded-2xl border border-hairline p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-caption font-semibold text-text-secondary">Question {qIndex + 1}</p>
                                {activity.questions.length > 1 && (
                                    <button
                                        type="button"
                                        aria-label={`Remove question ${qIndex + 1}`}
                                        onClick={() => removeQuestionBlock(activity.key, q.key)}
                                        className="text-text-secondary hover:text-error p-1 rounded-md transition-colors"
                                    >
                                        <X size={16} aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor={`qtype-${q.key}`}
                                    className="text-label text-ink-soft block mb-2"
                                >
                                    Question type
                                </label>
                                <select
                                    id={`qtype-${q.key}`}
                                    value={q.questionType}
                                    onChange={(e) =>
                                        updateQuestion(activity.key, q.key, { questionType: e.target.value as QuestionType })
                                    }
                                    className="clay-well w-full min-h-touch px-4 rounded-2xl border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
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
                                onChange={(e) => updateQuestion(activity.key, q.key, { prompt: e.target.value })}
                                className="clay-well w-full px-5 py-3 rounded-2xl border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                placeholder="Type the question prompt here"
                            />

                            {/* ── Tactile answer tiles — this IS the
                                 student-facing look, no separate preview.
                                 Tapping a tile marks it correct. ────────── */}
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
                                                    onClick={() => updateQuestion(activity.key, q.key, { correctIndex: optIndex })}
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
                                                    onChange={(e) =>
                                                        updateOptionText(activity.key, q.key, option.key, e.target.value)
                                                    }
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
                                                        onClick={() => removeOptionRow(activity.key, q.key, option.key)}
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
                                        onClick={() => addOptionRow(activity.key, q.key)}
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
                                                onClick={() => updateQuestion(activity.key, q.key, { correctTf: label })}
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
                                    <span className="inline-flex items-center gap-1.5">
                                        <Lightbulb size={14} aria-hidden="true" />
                                        Hint (optional — shown after 2 wrong attempts)
                                    </span>
                                </label>
                                <textarea
                                    id={`hint-${q.key}`}
                                    rows={2}
                                    value={q.hintText}
                                    onChange={(e) => updateQuestion(activity.key, q.key, { hintText: e.target.value })}
                                    placeholder="A nudge in the right direction, not the answer itself"
                                    className="clay-well w-full px-5 py-3 rounded-2xl border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() => addQuestionBlock(activity.key)}
                        className="flex items-center justify-center gap-2 w-full h-11 rounded-md border-2 border-dashed border-hairline-strong text-caption font-semibold text-text-secondary hover:border-brand hover:text-brand transition-colors"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Add another question to this activity
                    </button>
                </div>
            ))}

            <button
                type="button"
                onClick={addActivity}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-md border-2 border-dashed border-brand text-body-md font-semibold text-brand hover:bg-brand-soft transition-colors"
            >
                <Plus size={18} aria-hidden="true" />
                Add another activity
            </button>

            {/* ── Publish + submit ─────────────────────────────────────── */}
            <div className="space-y-5 clay-card p-5 sm:p-6">
                <label className="flex items-center gap-2 text-body-md text-ink cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={publishNow}
                        onChange={(e) => setPublishNow(e.target.checked)}
                        className="h-4 w-4 accent-brand"
                    />
                    Post immediately — students can see it as soon as it&apos;s created
                </label>

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
                    {isPending
                        ? 'Creating…'
                        : publishNow
                          ? `Create & Post mission (${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}, ${totalQuestionCount} ${totalQuestionCount === 1 ? 'question' : 'questions'})`
                          : `Create mission (${activities.length} ${activities.length === 1 ? 'activity' : 'activities'}, ${totalQuestionCount} ${totalQuestionCount === 1 ? 'question' : 'questions'})`}
                </button>
            </div>
        </form>
    )
}
