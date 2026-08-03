'use client'
// Not verified against TimeLimitSetting.tsx / PassingScoreSetting.tsx's
// actual styling — those files weren't available when this was built
// (2026-08-03), so this follows the closest patterns that were
// available (PostAssignmentButton.tsx, EditAssignmentForm.tsx). Worth a
// visual pass once the real sibling settings components can be compared
// directly.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setQuizDeadline } from '@/features/quizzes/actions/create-quiz'

// Converts a real UTC ISO timestamp into "YYYY-MM-DDTHH:mm" for a
// datetime-local input, using the BROWSER's local timezone — same fix,
// same reasoning, as EditAssignmentForm.tsx's toDatetimeLocalValue
// (2026-08-03). Duplicated rather than imported from a shared util
// since no such util exists yet in this codebase; worth extracting if a
// third caller ever needs it.
function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function QuizDeadlineSetting({
    quizId,
    currentAvailableUntil,
    currentAllowLate,
}: {
    quizId: string
    currentAvailableUntil: string | null
    currentAllowLate: boolean
}) {
    const router = useRouter()
    const [dueAt, setDueAt] = useState(toDatetimeLocalValue(currentAvailableUntil))
    const [allowLate, setAllowLate] = useState(currentAllowLate)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleSave() {
        setError(null)
        // Same local-time-parsing trick as NewAssignmentForm.tsx /
        // EditAssignmentForm.tsx: a Date built from a naive
        // "YYYY-MM-DDTHH:mm" string (no trailing "Z"/offset) is parsed
        // as LOCAL time by the JS engine, so converting to ISO here
        // produces a real, unambiguous UTC instant before it reaches
        // the server — never a naive string into a timestamptz column.
        const dueAtISO = dueAt ? new Date(dueAt).toISOString() : null
        startTransition(async () => {
            const result = await setQuizDeadline(quizId, dueAtISO, allowLate)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.refresh()
        })
    }

    return (
        <div className="bg-surface rounded-md shadow-card p-5">
            <p className="text-body-emphasis text-ink mb-1">Deadline</p>
            <p className="text-caption text-text-secondary mb-4">
                After this time, students can no longer start the quiz — and if late submissions
                aren&apos;t allowed, anyone still mid-attempt is cut off too, the same as the time
                limit running out.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
                <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                               focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                    type="button"
                    onClick={() => setDueAt('')}
                    disabled={!dueAt}
                    className="text-caption font-medium text-text-secondary hover:text-error disabled:opacity-40"
                >
                    Clear
                </button>
            </div>

            <div className="flex items-center gap-3 mt-4">
                <input
                    id={`allowLate-${quizId}`}
                    type="checkbox"
                    checked={allowLate}
                    onChange={(e) => setAllowLate(e.target.checked)}
                    className="h-5 w-5 rounded border-[1.5px] border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                />
                <label htmlFor={`allowLate-${quizId}`} className="text-body-md text-ink">
                    Allow late starts and submissions
                </label>
            </div>

            {error && <p className="text-caption text-error mt-3">{error}</p>}

            <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="h-11 px-6 mt-4 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60"
            >
                {isPending ? 'Saving…' : 'Save deadline'}
            </button>
        </div>
    )
}
