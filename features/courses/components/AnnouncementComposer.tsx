'use client'
// features/courses/components/AnnouncementComposer.tsx
//
// Phase 3.8: inline "Share something with your class..." composer,
// Classroom-style — confirmed with user (chose inline composer over a
// full new page, unlike lesson/quiz/assignment). Sits above
// TeacherCourseStream in the teacher's course page. Collapsed by
// default to a single click-to-expand input, matching Classroom's own
// actual pattern (a one-line prompt that grows into a full compose box
// on focus/click) rather than always showing a full textarea taking up
// space above the stream.
//
// DESIGN-LMS 2.1 REDESIGN (2026-09-06): pure visual fix, no logic
// touched — postAnnouncement call, useTransition/router.refresh flow,
// and expand/collapse state unchanged. The expanded textarea used
// `border-[1.5px] border-hairline-strong`, a one-off pattern that
// didn't match the standard form-input convention used everywhere
// else (InquiryForm, New Course form): `border-2 border-hairline`.
// Aligned to that standard.

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { postAnnouncement } from '@/features/courses/actions/announcements'

export function AnnouncementComposer({ courseId }: { courseId: string }) {
    const router = useRouter()
    const [isExpanded, setIsExpanded] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const formRef = useRef<HTMLFormElement>(null)

    function handleSubmit(formData: FormData) {
        setError(null)
        startTransition(async () => {
            const result = await postAnnouncement(courseId, formData)
            if (!result.ok) {
                setError(result.error)
                return
            }
            formRef.current?.reset()
            setIsExpanded(false)
            router.refresh()
        })
    }

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-left h-14 px-6 rounded-md bg-surface shadow-card hover:shadow-card-hover text-body-md text-text-secondary transition-all"
            >
                Share something with your class...
            </button>
        )
    }

    return (
        <form
            ref={formRef}
            action={handleSubmit}
            className="rounded-md bg-surface shadow-card-hover p-5 grid gap-3"
        >
            <textarea
                name="body"
                autoFocus
                required
                rows={3}
                maxLength={5000}
                placeholder="Share something with your class..."
                className="w-full px-4 py-3 rounded-md border-2 border-hairline focus:border-brand outline-none text-body-md text-ink focus:ring-2 focus:ring-brand/30"
            />
            {error && (
                <p className="text-caption text-error" role="alert">
                    {error}
                </p>
            )}
            <div className="flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => {
                        formRef.current?.reset()
                        setError(null)
                        setIsExpanded(false)
                    }}
                    className="h-12 px-6 rounded-md text-body-md font-semibold text-text-secondary hover:bg-surface-sunken transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-12 px-6 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60"
                >
                    {isPending ? 'Posting…' : 'Post'}
                </button>
            </div>
        </form>
    )
}
