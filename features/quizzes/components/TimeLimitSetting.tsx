'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock } from 'lucide-react'
import { setTimeLimit } from '@/features/quizzes/actions/create-quiz'

export function TimeLimitSetting({
    quizId,
    currentTimeLimitMinutes,
}: {
    quizId: string
    currentTimeLimitMinutes: number | null
}) {
    const router = useRouter()
    const [enabled, setEnabled] = useState(currentTimeLimitMinutes !== null)
    const [minutes, setMinutes] = useState(currentTimeLimitMinutes?.toString() ?? '')
    const [isPending, startTransition] = useTransition()

    const isDirty =
        enabled !== (currentTimeLimitMinutes !== null) ||
        minutes !== (currentTimeLimitMinutes?.toString() ?? '')

    function handleSave() {
        const parsed = enabled ? parseInt(minutes, 10) : null
        if (enabled && (Number.isNaN(parsed as number) || (parsed as number) < 1)) {
            return
        }
        startTransition(async () => {
            await setTimeLimit(quizId, parsed)
            router.refresh()
        })
    }

    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 mb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-pill bg-info-soft flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4 text-info" />
                    </span>
                    <div>
                        <p className="text-body-emphasis text-ink">Time limit</p>
                        <p className="text-caption text-text-secondary">
                            {enabled
                                ? currentTimeLimitMinutes
                                    ? `Currently ${currentTimeLimitMinutes} min`
                                    : 'Set a duration below'
                                : 'No timer — students can take as long as needed'}
                        </p>
                    </div>
                </div>

                <span
                    className={`shrink-0 rounded-pill px-3 py-1 text-caption font-semibold ${
                        enabled ? 'bg-info-soft text-info' : 'bg-surface-sunken text-text-muted'
                    }`}
                >
                    {enabled ? 'Timed' : 'Untimed'}
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-body-md text-ink cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                        className="h-4 w-4 accent-brand"
                    />
                    Enable timer
                </label>

                {enabled && (
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={1}
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            placeholder="Minutes"
                            className="w-24 min-h-[44px] px-4 text-body-md text-ink bg-surface rounded-md border-[1.5px] border-hairline-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                        <span className="text-caption text-text-secondary">minutes</span>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={isPending || !isDirty}
                    className="ml-auto h-11 px-5 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                >
                    {isPending ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    )
}
