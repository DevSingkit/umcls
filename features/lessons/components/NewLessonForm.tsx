'use client'
import { useActionState, useState } from 'react'
import { createLesson, type CreateLessonResult } from '@/features/lessons/actions/lessons'

const initialState: CreateLessonResult = { ok: false, error: '' }

async function createLessonAction(_prevState: CreateLessonResult, formData: FormData) {
    return createLesson(formData)
}

export function NewLessonForm({ courseId }: { courseId: string }) {
    const [state, formAction, isPending] = useActionState(createLessonAction, initialState)
    // One row to start; teacher can add more. Each row just needs a
    // unique key for React — the actual values live in the DOM inputs
    // and are read via formData.getAll on submit.
    const [linkRowIds, setLinkRowIds] = useState<number[]>([0])

    function addLinkRow() {
        setLinkRowIds((rows) => [...rows, rows.length ? Math.max(...rows) + 1 : 0])
    }

    function removeLinkRow(id: number) {
        setLinkRowIds((rows) => rows.filter((r) => r !== id))
    }

    return (
        // max-w-2xl is the shared single-form-card width, DESIGN-LMS.md §7.8.
        <div className="max-w-2xl mx-auto pb-16">
            <h1 className="font-heading text-h1 text-ink mb-2">
                Create a new lesson
            </h1>
            <p className="text-body-md text-text-secondary mb-8">
                Fill in the lesson and attach any files or links now — everything is saved together
                in one step. Materials can&apos;t be added later, so add everything you need here.
            </p>

            <form action={formAction} className="bg-surface rounded-md shadow-card p-8 space-y-8">
                <input type="hidden" name="courseId" value={courseId} />

                <div>
                    <label htmlFor="title" className="block text-label text-ink mb-2">
                        Lesson title
                    </label>
                    <input
                        id="title"
                        name="title"
                        type="text"
                        required
                        placeholder="e.g. Cell structure"
                        className="w-full min-h-[44px] px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="content" className="block text-label text-ink mb-2">
                        Lesson content
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        rows={10}
                        required
                        placeholder="Write the lesson here"
                        className="w-full px-4 py-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink leading-relaxed
                                   focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                </div>

                <div>
                    <label htmlFor="files" className="block text-label text-ink mb-2">
                        Files (optional)
                    </label>
                    <input
                        id="files"
                        name="files"
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.mp4"
                        className="w-full text-body-md text-text-secondary"
                    />
                    <p className="text-caption text-text-secondary mt-2">
                        PDF, DOC/DOCX, JPEG/PNG, MP3, MP4 — max 40 MB each. Select multiple files at once if needed.
                    </p>
                </div>

                <div>
                    <label className="block text-label text-ink mb-2">
                        Links (optional)
                    </label>
                    <p className="text-caption text-text-secondary mb-3">
                        YouTube, Google Drive, or any other link.
                    </p>
                    <div className="space-y-3">
                        {linkRowIds.map((id) => (
                            <div key={id} className="flex gap-3 flex-wrap items-center">
                                <input
                                    type="text"
                                    name="linkLabel"
                                    placeholder="Label (optional)"
                                    className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink
                                               focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                <input
                                    type="url"
                                    name="linkUrl"
                                    placeholder="https://..."
                                    className="h-11 px-4 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink flex-1 min-w-[200px]
                                               focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                                />
                                {linkRowIds.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeLinkRow(id)}
                                        className="text-caption text-error font-medium hover:underline"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addLinkRow}
                        className="mt-3 text-caption text-brand font-semibold hover:underline"
                    >
                        + Add another link
                    </button>
                </div>

                {!state.ok && state.error && (
                    <p className="text-caption text-error" role="alert">
                        {state.error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-11 rounded-md bg-brand text-on-ink font-semibold text-body-md
                               hover:bg-brand-hover disabled:opacity-60 transition-colors"
                >
                    {isPending ? 'Creating lesson…' : 'Create lesson'}
                </button>
            </form>
        </div>
    )
}
