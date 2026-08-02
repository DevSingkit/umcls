'use client'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateAssignment } from '@/features/assignments/actions/assignments'
import { uploadMaterial, addMaterialLink, deleteMaterial, listMaterials } from '@/features/materials/actions/materials'
import { PostAssignmentButton } from '@/features/assignments/components/PostAssignmentButton'

type Material = Awaited<ReturnType<typeof listMaterials>>[number]

// BUG FIX (2026-08-03): converts a real UTC ISO timestamp (from the
// database) into the "YYYY-MM-DDTHH:mm" format a datetime-local input
// needs, using the BROWSER's actual local timezone — not a naive string
// slice, which was the previous approach and silently mislabeled UTC
// wall-clock digits as if they were already local time. Uses the local
// getters (getFullYear/getMonth/etc, not getUTCFullYear/etc) precisely
// because those are what return values already adjusted to the
// environment's local timezone.
function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditAssignmentForm({
    courseId,
    assignmentId,
    initialTitle,
    initialInstructions,
    initialDueAt,
    initialMaxScore,
    initialPassingScore,
    initialAllowLate,
    initialIsPublished,
    initialMaterials,
    initialGradingComponent,
}: {
    courseId: string
    assignmentId: string
    initialTitle: string
    initialInstructions: string
    initialDueAt: string | null // raw ISO timestamp from the database, or null — NOT pre-formatted, see toDatetimeLocalValue above
    initialMaxScore: number
    initialPassingScore: number
    initialAllowLate: boolean
    initialIsPublished: boolean
    initialMaterials: Material[]
    initialGradingComponent: 'written_work' | 'performance_task' | 'quarterly_assessment'
}) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [materials, setMaterials] = useState(initialMaterials)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isUploading, startUploading] = useTransition()
    const fileFormRef = useRef<HTMLFormElement>(null)
    const linkFormRef = useRef<HTMLFormElement>(null)

    function handleSave(formData: FormData) {
        setError(null)
        // BUG FIX (2026-08-03): the datetime-local input gives back a
        // naive "YYYY-MM-DDTHH:mm" string with no timezone marker. Sent
        // as-is, that string would land in a `timestamptz` column and
        // get interpreted using the database's session timezone (UTC),
        // not the teacher's actual local time — the exact bug fixed in
        // NewAssignmentForm.tsx. Same fix here: `new Date(rawString)`
        // (no trailing "Z"/offset) is parsed as LOCAL time by the JS
        // engine, so converting it to ISO here produces a real,
        // unambiguous UTC instant before the form data ever reaches the
        // server action.
        const rawDueAt = formData.get('dueAt')
        if (typeof rawDueAt === 'string' && rawDueAt) {
            formData.set('dueAt', new Date(rawDueAt).toISOString())
        }
        startTransition(async () => {
            const result = await updateAssignment(formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            router.push(`/teacher/courses/${courseId}/assignments/${assignmentId}`)
        })
    }

    async function refreshMaterials() {
        const all = await listMaterials(courseId, { type: 'assignment', assignmentId })
        setMaterials(all.filter((m) => m.assignment_id === assignmentId))
    }

    function handleFileUpload(formData: FormData) {
        setUploadError(null)
        startUploading(async () => {
            const result = await uploadMaterial(courseId, { type: 'assignment', assignmentId }, formData)
            if (!result.ok) {
                setUploadError(result.error)
                return
            }
            fileFormRef.current?.reset()
            await refreshMaterials()
        })
    }

    function handleLinkAdd(formData: FormData) {
        setUploadError(null)
        startUploading(async () => {
            const result = await addMaterialLink(courseId, { type: 'assignment', assignmentId }, formData)
            if (!result.ok) {
                setUploadError(result.error)
                return
            }
            linkFormRef.current?.reset()
            await refreshMaterials()
        })
    }

    async function handleDeleteMaterial(materialId: string) {
        await deleteMaterial(materialId)
        await refreshMaterials()
    }

    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        <div className="max-w-2xl mx-auto pb-16">
            <h1 className="font-heading text-h1 text-ink mb-8">Edit assignment</h1>

            <form action={handleSave} className="bg-surface rounded-md shadow-card p-8 space-y-6 mb-8">
                <input type="hidden" name="assignmentId" value={assignmentId} />

                <div>
                    <label htmlFor="title" className="block text-label text-ink mb-2">
                        Title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        defaultValue={initialTitle}
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="instructions" className="block text-label text-ink mb-2">
                        Instructions
                    </label>
                    <textarea
                        id="instructions"
                        name="instructions"
                        rows={6}
                        defaultValue={initialInstructions}
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="dueAt" className="block text-label text-ink mb-2">
                        Due date (optional)
                    </label>
                    <input
                        id="dueAt"
                        name="dueAt"
                        type="datetime-local"
                        defaultValue={toDatetimeLocalValue(initialDueAt)}
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="gradingComponent" className="block text-label text-ink mb-2">
                        Grading component
                    </label>
                    <select
                        id="gradingComponent"
                        name="gradingComponent"
                        required
                        defaultValue={initialGradingComponent}
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    >
                        <option value="written_work">Written Work</option>
                        <option value="performance_task">Performance Task</option>
                        <option value="quarterly_assessment">Quarterly Assessment</option>
                    </select>
                    <p className="mt-2 text-caption text-text-secondary">
                        Determines how much this assignment counts toward the student&apos;s DepEd quarterly grade.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="maxScore" className="block text-label text-ink mb-2">
                            Max score
                        </label>
                        <input
                            id="maxScore"
                            name="maxScore"
                            type="number"
                            min={1}
                            required
                            defaultValue={initialMaxScore}
                            className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>
                    <div>
                        <label htmlFor="passingScore" className="block text-label text-ink mb-2">
                            Passing score
                        </label>
                        <input
                            id="passingScore"
                            name="passingScore"
                            type="number"
                            min={0}
                            required
                            defaultValue={initialPassingScore}
                            className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                       focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        id="allowLate"
                        name="allowLate"
                        type="checkbox"
                        defaultChecked={initialAllowLate}
                        className="h-5 w-5 rounded border-[1.5px] border-hairline-strong text-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <label htmlFor="allowLate" className="text-body-md text-ink">
                        Allow submissions after the due date
                    </label>
                </div>
                <p className="-mt-4 text-caption text-text-secondary">
                    If off, students can no longer submit or edit their
                    submission once the due date passes.
                </p>

                {error && (
                    <p className="text-caption text-error" role="alert">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-md bg-brand text-on-ink font-semibold text-body-md
                               hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                    {isPending ? 'Saving…' : 'Save changes'}
                </button>
            </form>

            <h2 className="font-heading text-h3 text-ink mb-4">Attachments</h2>

            <div className="bg-surface rounded-md shadow-card p-6 space-y-4 mb-4">
                <form ref={fileFormRef} action={handleFileUpload} className="flex items-center gap-3 flex-wrap">
                    <input
                        type="file"
                        name="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
                        required
                        className="text-caption text-text-secondary flex-1 min-w-[200px]"
                    />
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="h-11 px-6 rounded-md border-[1.5px] border-hairline-strong text-ink font-semibold hover:bg-surface-sunken disabled:opacity-60"
                    >
                        {isUploading ? 'Uploading…' : 'Upload file'}
                    </button>
                </form>

                <form ref={linkFormRef} action={handleLinkAdd} className="flex items-center gap-3 flex-wrap">
                    <input
                        type="text"
                        name="label"
                        placeholder="Label (optional)"
                        className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink flex-1 min-w-[140px]
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <input
                        type="url"
                        name="url"
                        placeholder="https://..."
                        required
                        className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink flex-1 min-w-[200px]
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <button
                        type="submit"
                        disabled={isUploading}
                        className="h-11 px-6 rounded-md border-[1.5px] border-hairline-strong text-ink font-semibold hover:bg-surface-sunken disabled:opacity-60"
                    >
                        {isUploading ? 'Adding…' : 'Add link'}
                    </button>
                </form>

                {uploadError && <p className="text-caption text-error">{uploadError}</p>}
            </div>

            <div className="mb-8">
                <MaterialListWithDelete materials={materials} onDelete={handleDeleteMaterial} />
            </div>

            <PostAssignmentButton assignmentId={assignmentId} isPublished={initialIsPublished} />
        </div>
    )
}

// Mirrors EditLessonForm's MaterialListWithDelete — local state needs
// its own refresh after delete, since listMaterials/deleteMaterial
// don't trigger a router.refresh() the page would otherwise pick up.
function MaterialListWithDelete({
    materials,
    onDelete,
}: {
    materials: Material[]
    onDelete: (id: string) => void
}) {
    if (materials.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-8 text-center">
                <p className="text-body-md text-text-secondary">No attachments added yet.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-2">
            {materials.map((material) => (
                <div
                    key={material.id}
                    className="bg-surface rounded-md shadow-card p-4 flex items-center justify-between gap-4"
                >
                    <span className="text-body-emphasis text-ink truncate">{material.file_name}</span>
                    <button
                        onClick={() => onDelete(material.id)}
                        className="text-caption font-medium text-error hover:underline shrink-0"
                    >
                        Remove
                    </button>
                </div>
            ))}
        </div>
    )
}
