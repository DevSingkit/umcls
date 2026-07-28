'use client'
// Single "+ Create" entry point replacing three separate "+ New Lesson /
// + New Quiz / + New Assignment" links. See DESIGN-LMS.md §7.2 and
// UI-UX-REDESIGN-BRIEF.md §2/§4.1 — the biggest single fix for the
// "too many competing buttons" problem.
//
// Quiz is a button, not a plain Link like Lesson/Assignment — clicking
// it creates a draft quiz ("Untitled quiz") immediately via
// createDraftQuiz and navigates straight to its edit page, skipping the
// old title-first /quizzes/new step. The title is just an editable
// field on the edit page now, same as lessons/assignments.
import { useRef, useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileText, HelpCircle, ClipboardList } from 'lucide-react'
import { createDraftQuiz } from '@/features/quizzes/actions/create-quiz'

export function CreateMenu({ courseId }: { courseId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function handleCreateQuiz() {
        setError(null)
        startTransition(async () => {
            const result = await createDraftQuiz(courseId)
            if (!result.ok) {
                setError(result.error)
                return
            }
            setIsOpen(false)
            router.push(`/teacher/courses/${courseId}/quizzes/${result.quizId}/edit`)
        })
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className="flex h-11 items-center gap-1.5 rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
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
                        className="flex h-11 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <FileText size={20} aria-hidden="true" className="text-text-secondary" />
                        Lesson
                    </Link>
                    <button
                        role="menuitem"
                        onClick={handleCreateQuiz}
                        disabled={isPending}
                        className="flex h-11 w-full items-center gap-3 px-4 text-left text-body-md text-ink hover:bg-surface-sunken disabled:opacity-60"
                    >
                        <HelpCircle size={20} aria-hidden="true" className="text-text-secondary" />
                        {isPending ? 'Creating…' : 'Quiz'}
                    </button>
                    <Link
                        href={`/teacher/courses/${courseId}/assignments/new`}
                        role="menuitem"
                        onClick={() => setIsOpen(false)}
                        className="flex h-11 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                    >
                        <ClipboardList size={20} aria-hidden="true" className="text-text-secondary" />
                        Assignment
                    </Link>
                </div>
            )}

            {error && (
                <p className="absolute right-0 top-full mt-1 w-52 text-caption text-error" role="alert">
                    {error}
                </p>
            )}
        </div>
    )
}