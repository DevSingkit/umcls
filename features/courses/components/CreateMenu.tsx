'use client'
// Single "+ Create" entry point replacing three separate "+ New Lesson /
// + New Quiz / + New Assignment" links. See DESIGN-LMS.md §7.2 and
// UI-UX-REDESIGN-BRIEF.md §2/§4.1 — the biggest single fix for the
// "too many competing buttons" problem.
//
// 2026-08-19: Quiz is now a plain Link, same as Lesson/Assignment,
// pointing at /quizzes/new instead of calling createDraftQuiz. The
// old behavior — inserting an empty draft quiz the instant this was
// clicked, before the teacher entered anything — meant a titled-and-
// empty quiz row existed in the database immediately and showed up in
// the course stream with zero content. The new /quizzes/new page
// collects a title and first question before anything is written to
// the database at all (see create-quiz.ts's createQuizWithFirstQuestion).
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, FileText, HelpCircle, ClipboardList } from 'lucide-react'

export function CreateMenu({ courseId }: { courseId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className="flex h-12 items-center gap-1.5 rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
                + Create
                <ChevronDown size={16} aria-hidden="true" />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-md bg-surface shadow-modal"
                >
                    <Link
                        href={`/teacher/courses/${courseId}/lessons/new`}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="flex h-12 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <FileText size={20} aria-hidden="true" className="text-text-secondary" />
                        Lesson
                    </Link>
                    <Link
                        href={`/teacher/courses/${courseId}/quizzes/new`}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="flex h-12 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <HelpCircle size={20} aria-hidden="true" className="text-text-secondary" />
                        Quiz
                    </Link>
                    <Link
                        href={`/teacher/courses/${courseId}/assignments/new`}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="flex h-12 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <ClipboardList size={20} aria-hidden="true" className="text-text-secondary" />
                        Assignment
                    </Link>
                </div>
            )}
        </div>
    )
}
