'use client'
import { useState } from 'react'
import { setResultsVisibility, type ResultsVisibility } from '@/features/quizzes/actions/create-quiz'

const OPTIONS: { value: ResultsVisibility; label: string }[] = [
    { value: 'immediately', label: 'Right after submitting' },
    { value: 'after_grading', label: 'Only after grading is complete' },
    { value: 'never', label: "Never — just show pass/fail, no per-question detail" },
]

export function ResultsVisibilitySetting({
    quizId,
    currentVisibility,
}: {
    quizId: string
    currentVisibility: ResultsVisibility
}) {
    const [value, setValue] = useState<ResultsVisibility>(currentVisibility)
    const [isPending, setIsPending] = useState(false)
    const [saved, setSaved] = useState(false)

    async function handleChange(next: ResultsVisibility) {
        setValue(next)
        setSaved(false)
        setIsPending(true)
        const result = await setResultsVisibility(quizId, next)
        setIsPending(false)
        if (result.ok) setSaved(true)
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-6">
            <label htmlFor="resultsVisibilitySetting" className="text-label text-ink-soft block mb-2">
                When can students see which answers were correct
            </label>
            <div className="flex flex-wrap items-center gap-3">
                <select
                    id="resultsVisibilitySetting"
                    value={value}
                    onChange={(e) => handleChange(e.target.value as ResultsVisibility)}
                    disabled={isPending}
                    className="min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong focus:border-brand outline-none text-body-md text-ink disabled:opacity-60"
                >
                    {OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                {isPending && <span className="text-caption text-text-secondary">Saving…</span>}
                {saved && !isPending && (
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft text-brand text-caption font-semibold px-3 py-1">
                        Saved
                    </span>
                )}
            </div>
        </div>
    )
}
