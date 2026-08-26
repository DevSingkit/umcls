'use client'
// LOGIC FIX (this pass): removing an attachment used to call
// deleteMaterial immediately on click — a real database delete
// completely disconnected from the "Save changes" button, so a
// teacher had no way to undo a misclick and no single "did my edits
// actually save" moment. Fixed: clicking Remove now only marks a
// material for removal locally (pendingRemovalIds) with an Undo
// option. The actual deleteMaterial calls only fire inside handleSave,
// after updateAssignment succeeds — if the save fails, nothing is
// deleted. This matches the requested behavior: "must have Update
// button to update it, not automatic remove."
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateAssignment } from '@/features/assignments/actions/assignments'
import { uploadMaterial, addMaterialLink, deleteMaterial, listMaterials } from '@/features/materials/actions/materials'
import { PostAssignmentButton } from '@/features/assignments/components/PostAssignmentButton'
import { DateTimePicker } from '@/components/ui/DateTimePicker'

type Material = Awaited<ReturnType<typeof listMaterials>>[number]

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
    initialAllowLate,
    initialIsPublished,
    initialMaterials,
}: {
    courseId: string
    assignmentId: string
    initialTitle: string
    initialInstructions: string
    initialDueAt: string | null
    initialMaxScore: number
    initialAllowLate: boolean
    initialIsPublished: boolean
    initialMaterials: Material[]
}) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const [materials, setMaterials] = useState(initialMaterials)
    // Staged removals — material ids marked for deletion but not yet
    // committed. Cleared/committed only inside handleSave.
    const [pendingRemovalIds, setPendingRemovalIds] = useState<Set<string>>(new Set())
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isUploading, startUploading] = useTransition()
    const fileFormRef = useRef<HTMLFormElement>(null)
    const linkFormRef = useRef<HTMLFormElement>(null)
    const [dueAt, setDueAt] = useState(toDatetimeLocalValue(initialDueAt))

    function handleSave(formData: FormData) {
        setError(null)
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
            // Only now, after the save itself succeeded, actually commit
            // any staged removals. A failed save leaves attachments
            // untouched — nothing was deleted just because Remove was
            // clicked earlier in this session.
            if (pendingRemovalIds.size > 0) {
                await Promise.all(Array.from(pendingRemovalIds).map((id) => deleteMaterial(id)))
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

    // No server call here anymore — purely local staging.
    function handleMarkForRemoval(materialId: string) {
        setPendingRemovalIds((prev) => new Set(prev).add(materialId))
    }

    function handleUndoRemoval(materialId: string) {
        setPendingRemovalIds((prev) => {
            const next = new Set(prev)
            next.delete(materialId)
            return next
        })
    }

    return (
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
                    <div className="flex items-center gap-3 flex-wrap">
                        <DateTimePicker id="dueAt" value={dueAt} onChange={setDueAt} placeholder="No due date" />
                        <button
                            type="button"
                            onClick={() => setDueAt('')}
                            disabled={!dueAt}
                            className="text-caption font-medium text-text-secondary hover:text-error disabled:opacity-40"
                        >
                            Clear
                        </button>
                    </div>
                    <input type="hidden" name="dueAt" value={dueAt} />
                </div>

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

                {pendingRemovalIds.size > 0 && (
                    <p className="text-caption text-amber">
                        {pendingRemovalIds.size} attachment{pendingRemovalIds.size === 1 ? '' : 's'} will be
                        removed when you save.
                    </p>
                )}

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
                <MaterialListWithDelete
                    materials={materials}
                    pendingRemovalIds={pendingRemovalIds}
                    onMarkForRemoval={handleMarkForRemoval}
                    onUndoRemoval={handleUndoRemoval}
                />
            </div>

            <PostAssignmentButton assignmentId={assignmentId} isPublished={initialIsPublished} />
        </div>
    )
}

function MaterialListWithDelete({
    materials,
    pendingRemovalIds,
    onMarkForRemoval,
    onUndoRemoval,
}: {
    materials: Material[]
    pendingRemovalIds: Set<string>
    onMarkForRemoval: (id: string) => void
    onUndoRemoval: (id: string) => void
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
            {materials.map((material) => {
                const isMarked = pendingRemovalIds.has(material.id)
                return (
                    <div
                        key={material.id}
                        className={`bg-surface rounded-md shadow-card p-4 flex items-center justify-between gap-4 ${
                            isMarked ? 'opacity-50' : ''
                        }`}
                    >
                        <span
                            className={`text-body-emphasis truncate ${
                                isMarked ? 'text-text-muted line-through' : 'text-ink'
                            }`}
                        >
                            {material.file_name}
                        </span>
                        {isMarked ? (
                            <button
                                type="button"
                                onClick={() => onUndoRemoval(material.id)}
                                className="h-9 px-4 rounded-md border-[1.5px] border-hairline-strong text-ink text-caption font-medium hover:bg-surface-sunken shrink-0"
                            >
                                Undo
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onMarkForRemoval(material.id)}
                                className="h-9 px-4 rounded-md border-[1.5px] border-red text-red text-caption font-medium hover:bg-red-soft shrink-0"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
