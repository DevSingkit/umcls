'use client'
// Lets the teacher choose which DepEd Matatag component this quiz
// counts toward — Written Work, Performance Task, or Quarterly
// Assessment (migration 057). Same save/saved-badge shell as
// PassingScoreSetting, just a fixed three-option dropdown instead of a
// free-typed number, since this isn't a value the teacher computes —
// it's one of exactly three categories.

import { useState } from 'react'
import { setGradingComponent, type GradingComponent } from '@/features/quizzes/actions/create-quiz'

const COMPONENT_LABEL: Record<GradingComponent, string> = {
    written_work: 'Written Work',
    performance_task: 'Performance Task',
    quarterly_assessment: 'Quarterly Assessment',
}

export function GradingComponentSetting({
    quizId,
    currentGradingComponent,
}: {
    quizId: string
    currentGradingComponent: GradingComponent
}) {
    const [value, setValue] = useState<GradingComponent>(currentGradingComponent)
    const [saved, setSaved] = useState(false)
    const [isPending, setIsPending] = useState(false)

    async function handleSave() {
        setIsPending(true)
        setSaved(false)
        const result = await setGradingComponent(quizId, value)
        setIsPending(false)
        if (result.ok) {
            setSaved(true)
        }
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-8">
            <label htmlFor="gradingComponentSetting" className="text-label text-ink-soft block mb-2">
                Grading component
            </label>
            <div className="flex flex-wrap items-center gap-3">
                <select
                    id="gradingComponentSetting"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value as GradingComponent)
                        setSaved(false)
                    }}
                    className="h-11 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                    {(Object.keys(COMPONENT_LABEL) as GradingComponent[]).map((key) => (
                        <option key={key} value={key}>
                            {COMPONENT_LABEL[key]}
                        </option>
                    ))}
                </select>
                <span className="text-body-md text-text-secondary">
                    Counts toward this quiz&apos;s DepEd grading weight
                </span>
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
