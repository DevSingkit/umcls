'use client'
// One row per short_answer response on an attempt: question text,
// what the student typed, a score input (0 to maxPoints), and an
// optional feedback field. Saves one response at a time.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gradeShortAnswer } from '@/features/quizzes/actions/grade-short-answer'

type Response = {
    id: string
    questionId: string
    questionText: string
    maxPoints: number
    textResponse: string | null
    pointsAwarded: number | null
    isGraded: boolean
    feedback: string | null
}

export function ShortAnswerGradeList({
    attemptId,
    responses,
}: {
    attemptId: string
    responses: Response[]
}) {
    const router = useRouter()
    const [drafts, setDrafts] = useState<Record<string, { points: number; feedback: string }>>(
        Object.fromEntries(
            responses.map((r) => [r.questionId, { points: r.pointsAwarded ?? 0, feedback: r.feedback ?? '' }])
        )
    )
    const [savingId, setSavingId] = useState<string | null>(null)
    const [error, setError] = useState('')

    async function handleSave(questionId: string) {
        setSavingId(questionId)
        setError('')
        const draft = drafts[questionId] ?? { points: 0, feedback: '' }
        const result = await gradeShortAnswer(attemptId, questionId, draft.points, draft.feedback)
        setSavingId(null)

        if (!result.ok) {
            setError(result.error)
            return
        }
        router.refresh()
    }

    return (
        <div className="grid gap-4">
            {responses.map((response) => (
                <div key={response.id} className="bg-surface rounded-md border border-hairline shadow-card p-6">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-body-emphasis text-ink">{response.questionText}</p>
                        {response.isGraded && (
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-info-soft text-info text-caption font-semibold px-3 py-1 shrink-0">
                                Graded
                            </span>
                        )}
                    </div>

                    <p className="text-body-md text-ink-soft bg-surface-sunken rounded-md px-4 py-3 mb-4 whitespace-pre-wrap">
                        {response.textResponse || '(no answer submitted)'}
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="text-label text-ink-soft block mb-1">
                                Score
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={response.maxPoints}
                                    value={drafts[response.questionId]?.points ?? 0}
                                    onChange={(e) =>
                                        setDrafts((prev) => ({
                                            ...prev,
                                            [response.questionId]: {
                                                ...(prev[response.questionId] ?? { points: 0, feedback: '' }),
                                                points: Number(e.target.value),
                                            },
                                        }))
                                    }
                                    className="w-20 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <span className="text-caption text-text-secondary">/ {response.maxPoints}</span>
                            </div>
                        </div>

                        <div className="flex-1 min-w-[200px]">
                            <label className="text-label text-ink-soft block mb-1">
                                Feedback (optional)
                            </label>
                            <input
                                type="text"
                                value={drafts[response.questionId]?.feedback ?? ''}
                                onChange={(e) =>
                                    setDrafts((prev) => ({
                                        ...prev,
                                        [response.questionId]: {
                                            ...(prev[response.questionId] ?? { points: 0, feedback: '' }),
                                            feedback: e.target.value,
                                        },
                                    }))
                                }
                                className="w-full min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                placeholder="Optional note for the student"
                            />
                        </div>

                        <button
                            onClick={() => handleSave(response.questionId)}
                            disabled={savingId === response.questionId}
                            className="h-11 px-5 rounded-md bg-brand hover:bg-brand-hover text-on-ink text-body-md font-semibold transition-colors disabled:opacity-60"
                        >
                            {savingId === response.questionId ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            ))}

            {error && (
                <p className="text-caption text-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}
