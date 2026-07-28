'use client'
import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updateAssignment } from '@/features/assignments/actions/assignments'
import { uploadMaterial, addMaterialLink, deleteMaterial, listMaterials } from '@/features/materials/actions/materials'
import { PostAssignmentButton } from '@/features/assignments/components/PostAssignmentButton'

type Material = Awaited<ReturnType<typeof listMaterials>>[number]

export function EditAssignmentForm({
    courseId,
    assignmentId,
    initialTitle,
    initialInstructions,
    initialDueAt,
    initialMaxScore,
    initialPassingScore,
    initialIsPublished,
    initialMaterials,
}: {
    courseId: string
    assignmentId: string
    initialTitle: string
    initialInstructions: string
    initialDueAt: string // already formatted for datetime-local input, or ''
    initialMaxScore: number
    initialPassingScore: number
    initialIsPublished: boolean
    initialMaterials: Material[]
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
        <div className="max-w-xl mx-auto pb-16">
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
                        defaultValue={initialDueAt}
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
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

                {error && (
                    <p className="text-caption text-red" role="alert">
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

                {uploadError && <p className="text-caption text-red">{uploadError}</p>}
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
                        className="text-caption font-medium text-red hover:underline shrink-0"
                    >
                        Remove
                    </button>
                </div>
            ))}
        </div>
    )
}
