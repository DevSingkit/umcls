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
        <div className="bg-white rounded-hero shadow-card-lift p-6 mb-8">
            <label htmlFor="passingScoreSetting" className="text-label-md uppercase tracking-wide text-graphite block mb-2">
                How many correct answers are needed to pass
            </label>
            <div className="flex items-center gap-3">
                <input
                    id="passingScoreSetting"
                    type="number"
                    min={0}
                    max={totalQuestions}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-24 h-11 px-4 rounded-button border border-hairline focus:border-ink focus:border-[1.5px] outline-none"
                />
                <span className="text-body-md text-graphite">out of {totalQuestions} questions</span>
                <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="h-11 px-5 rounded-button border border-hairline text-caption-md font-medium disabled:opacity-60"
                >
                    {isPending ? 'Saving…' : 'Save'}
                </button>
                {saved && <span className="text-caption-md text-success">Saved</span>}
            </div>
        </div>
    )
}