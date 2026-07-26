'use client'
// Lets the teacher choose how many correct answers are needed to
// pass. Only makes sense once questions exist, since the number
// depends on the real total.

import { useState } from 'react'
import { setPassingScore } from '@/features/quizzes/actions/create-quiz'

export function PassingScoreSetting({
    quizId,
    totalQuestions,
    currentPassingScore,
}: {
    quizId: string
    totalQuestions: number
    currentPassingScore: number
}) {
    const [value, setValue] = useState(currentPassingScore)
    const [saved, setSaved] = useState(false)
    const [isPending, setIsPending] = useState(false)

    async function handleSave() {
        setIsPending(true)
        setSaved(false)
        const result = await setPassingScore(quizId, value)
        setIsPending(false)
        if (result.ok) {
            setSaved(true)
        }
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-8">
            <label htmlFor="passingScoreSetting" className="text-label text-ink-soft block mb-2">
                How many correct answers are needed to pass
            </label>
            <div className="flex flex-wrap items-center gap-3">
                <input
                    id="passingScoreSetting"
                    type="number"
                    min={0}
                    max={totalQuestions}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <span className="text-body-md text-text-secondary">out of {totalQuestions} questions</span>
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="h-11 px-5 rounded-md bg-surface text-ink border-[1.5px] border-hairline-strong hover:bg-surface-sunken text-body-md font-semibold transition-colors disabled:opacity-60"
                >
                    {isPending ? 'Saving…' : 'Save changes'}
                </button>
                {saved && (
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                        Saved
                    </span>
                )}
            </div>
        </div>
    )
}
