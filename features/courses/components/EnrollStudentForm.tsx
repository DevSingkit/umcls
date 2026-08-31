'use client'
// Button that reveals the enroll form in a dropdown panel, rather than
// an always-visible section. Meant to sit near the top of the course
// page (next to CreateMenu/CourseMenu) so it's reachable without
// scrolling past a long lesson stream.

import { useActionState, useEffect, useRef, useState } from 'react'
import { enrollStudentIntoOwnCourse, type EnrollResult } from '@/features/courses/actions/enroll-student'

const initialState: EnrollResult = { ok: false, error: '' }

async function enrollAction(_prevState: EnrollResult, formData: FormData) {
    return enrollStudentIntoOwnCourse(formData)
}

export function EnrollStudentForm({
    courseId,
    students,
}: {
    courseId: string
    students: { id: string; full_name: string; email: string }[]
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [state, formAction, isPending] = useActionState(enrollAction, initialState)
    const panelRef = useRef<HTMLDivElement>(null)

    // Close the panel on successful enroll, so re-opening it shows a
    // clean form instead of the previous "enrolled successfully" state.
    useEffect(() => {
        if (state.ok) {
            const timeout = setTimeout(() => setIsOpen(false), 1200)
            return () => clearTimeout(timeout)
        }
    }, [state.ok])

    // Close on outside click.
    useEffect(() => {
        if (!isOpen) return
        function handleClick(e: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [isOpen])

    return (
        <div className="relative" ref={panelRef}>
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-expanded={isOpen}
                className="inline-flex h-12 items-center gap-2 px-5 rounded-md border-[1.5px] border-hairline-strong bg-surface text-ink font-medium text-body-md
                           hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path
                        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                    />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.75" />
                    <path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
                Add a student
            </button>

            {isOpen && (
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-hairline bg-surface p-5 shadow-card">
                    <form action={formAction} className="space-y-4">
                        <input type="hidden" name="courseId" value={courseId} />

                        <div>
                            <label htmlFor="studentId" className="text-label text-text-secondary block mb-2">
                                Student
                            </label>
                            <select
                                id="studentId"
                                name="studentId"
                                required
                                className="w-full h-11 px-4 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                                <option value="">Choose a student</option>
                                {students.map((student) => (
                                    <option key={student.id} value={student.id}>
                                        {student.full_name} ({student.email})
                                    </option>
                                ))}
                            </select>
                            {students.length === 0 && (
                                <p className="mt-2 text-caption text-text-secondary">
                                    All active students are already enrolled in this class.
                                </p>
                            )}
                        </div>

                        {!state.ok && state.error && (
                            <p className="text-caption text-error" role="alert">
                                {state.error}
                            </p>
                        )}

                        {state.ok && (
                            <p className="text-caption text-success" role="status">
                                Student enrolled successfully.
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isPending || students.length === 0}
                            className="w-full h-12 rounded-md bg-brand text-on-ink font-medium hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
                        >
                            {isPending ? 'Enrolling…' : 'Enroll student'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
