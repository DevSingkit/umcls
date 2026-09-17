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
import { cn } from '@/lib/utils'
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
                type="button"
                onClick={() => setIsExpanded(true)}
                className="w-full text-left h-14 min-h-touch px-6 rounded-md bg-surface border border-hairline shadow-card hover:shadow-card-hover text-body-md text-text-secondary transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
                Share something with your class...
            </button>
        )
    }

    return (
        <form
            ref={formRef}
            action={handleSubmit}
            className="w-full min-w-0 rounded-md bg-surface border border-hairline shadow-card-hover p-4 sm:p-5 grid gap-3"
        >
            <textarea
                name="body"
                autoFocus
                required
                rows={3}
                maxLength={5000}
                placeholder="Share something with your class..."
                className="w-full min-w-0 px-4 py-3 rounded-md border-2 border-hairline bg-surface text-body-md text-ink outline-none focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
            {error && (
                <p className="text-caption text-error" role="alert">
                    {error}
                </p>
            )}
            <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
                <button
                    type="button"
                    onClick={() => {
                        formRef.current?.reset()
                        setError(null)
                        setIsExpanded(false)
                    }}
                    className="h-12 min-h-touch px-5 rounded-md text-body-md font-semibold text-text-secondary hover:bg-surface-sunken transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-12 min-h-touch px-5 rounded-md bg-brand hover:bg-brand-hover text-on-ink font-semibold text-body-md transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                    {isPending ? 'Posting…' : 'Post'}
                </button>
            </div>
        </form>
    )
}
