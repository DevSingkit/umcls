'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment } from '@/features/assignments/actions/assignments'

let linkRowKeySeed = 0
function nextLinkRowKey() {
    linkRowKeySeed += 1
    return `link-${linkRowKeySeed}`
}

export function NewAssignmentForm({ courseId }: { courseId: string }) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [dueDate, setDueDate] = useState('')
    const [dueTime, setDueTime] = useState('')
    const [linkRows, setLinkRows] = useState<{ key: string; url: string; label: string }[]>([])
    const [selectedFileNames, setSelectedFileNames] = useState<string[]>([])
    const router = useRouter()

    function addLinkRow() {
        setLinkRows((prev) => [...prev, { key: nextLinkRowKey(), url: '', label: '' }])
    }

    function updateLinkRow(key: string, field: 'url' | 'label', value: string) {
        setLinkRows((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)))
    }

    function removeLinkRow(key: string) {
        setLinkRows((prev) => prev.filter((row) => row.key !== key))
    }

    function handleSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await createAssignment(courseId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.push(`/teacher/courses/${courseId}`)
            router.refresh()
        })
    }

    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        <form action={handleSubmit} className="max-w-2xl grid gap-4 bg-surface rounded-md shadow-card p-8">
            {error && <p className="text-caption text-error">{error}</p>}
            <div>
                <label htmlFor="title" className="text-label text-ink-soft">Title</label>
                <input
                    id="title"
                    name="title"
                    required
                    className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>
            <div>
                <label htmlFor="instructions" className="text-label text-ink-soft">Instructions</label>
                <textarea
                    id="instructions"
                    name="instructions"
                    rows={4}
                    className="mt-1 w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
            </div>
            <div className="pt-2 border-t border-hairline space-y-6">
                <div>
                    <label className="block text-label text-ink-soft mb-1">Attachments (optional)</label>
                    <label
                        htmlFor="files"
                        className="inline-flex h-11 items-center px-5 rounded-md bg-brand text-on-ink font-semibold text-body-md hover:bg-brand-hover cursor-pointer transition-colors"
                    >
                        Choose files
                    </label>
                    <input
                        id="files"
                        name="files"
                        type="file"
                        multiple
                        className="sr-only"
                        onChange={(e) =>
                            setSelectedFileNames(Array.from(e.target.files ?? []).map((f) => f.name))
                        }
                    />
                    <p className="mt-2 text-caption text-text-secondary">
                        PDF, DOC/DOCX, JPEG/PNG, MP3, or MP4 — max 40 MB each
                    </p>
                    {selectedFileNames.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {selectedFileNames.map((name) => (
                                <li key={name} className="text-caption text-ink truncate">
                                    📎 {name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-label text-ink-soft">Links (optional)</label>
                        <button
                            type="button"
                            onClick={addLinkRow}
                            className="text-caption font-semibold text-brand hover:text-brand-hover"
                        >
                            + Add a link
                        </button>
                    </div>
                    {linkRows.length === 0 ? (
                        <p className="text-caption text-text-secondary">
                            No links added yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {linkRows.map((row) => (
                                <div key={row.key} className="flex items-center gap-2">
                                    <input
                                        type="url"
                                        name="linkUrl"
                                        placeholder="https://..."
                                        value={row.url}
                                        onChange={(e) => updateLinkRow(row.key, 'url', e.target.value)}
                                        className="flex-1 h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                    <input
                                        type="text"
                                        name="linkLabel"
                                        placeholder="Label (optional)"
                                        value={row.label}
                                        onChange={(e) => updateLinkRow(row.key, 'label', e.target.value)}
                                        className="w-40 h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Remove link"
                                        onClick={() => removeLinkRow(row.key)}
                                        className="text-text-secondary hover:text-error text-body-md px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-label text-ink-soft">Due date (optional)</label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                    <input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <input
                        id="dueTime"
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>
                <input type="hidden" name="dueAt" value={dueDate ? `${dueDate}T${dueTime || '23:59'}` : ''} />
            </div>
            <div>
                <label htmlFor="gradingComponent" className="text-label text-ink-soft">Grading component</label>
                <select
                    id="gradingComponent"
                    name="gradingComponent"
                    required
                    defaultValue=""
                    className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                >
                    <option value="" disabled>Choose a component…</option>
                    <option value="written_work">Written Work</option>
                    <option value="performance_task">Performance Task</option>
                    <option value="quarterly_assessment">Quarterly Assessment</option>
                </select>
                <p className="mt-1 text-caption text-text-secondary">
                    Determines how much this assignment counts toward the student's DepEd quarterly grade.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="maxScore" className="text-label text-ink-soft">Max score</label>
                    <input
                        id="maxScore"
                        name="maxScore"
                        type="number"
                        min={1}
                        defaultValue={100}
                        required
                        className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>
                <div>
                    <label htmlFor="passingScore" className="text-label text-ink-soft">Passing score</label>
                    <input
                        id="passingScore"
                        name="passingScore"
                        type="number"
                        min={0}
                        defaultValue={60}
                        required
                        className="mt-1 h-11 w-full px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <input
                    id="allowLate"
                    name="allowLate"
                    type="checkbox"
                    className="h-5 w-5 rounded border-[1.5px] border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                />
                <label htmlFor="allowLate" className="text-body-md text-ink">
                    Allow submissions after the due date
                </label>
            </div>
            <p className="-mt-3 text-caption text-text-secondary">
                If off, students can no longer submit or edit their
                submission once the due date passes.
            </p>

            <button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-md bg-brand text-on-ink font-semibold hover:bg-brand-hover disabled:opacity-60 justify-self-start"
            >
                {isPending ? 'Creating…' : 'Create assignment'}
            </button>
        </form>
    )
}