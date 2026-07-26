'use client'
// Single "+ Create" entry point replacing three separate "+ New Lesson /
// + New Quiz / + New Assignment" links. See DESIGN-LMS.md §7.2 and
// UI-UX-REDESIGN-BRIEF.md §2/§4.1 — the biggest single fix for the
// "too many competing buttons" problem.
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, FileText, HelpCircle, ClipboardList } from 'lucide-react'

const OPTIONS = [
    { label: 'Lesson', icon: FileText, path: 'lessons/new' },
    { label: 'Quiz', icon: HelpCircle, path: 'quizzes/new' },
    { label: 'Assignment', icon: ClipboardList, path: 'assignments/new' },
] as const

export function CreateMenu({ courseId }: { courseId: string }) {
    const [isOpen, setIsOpen] = useState(false)
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
                    {OPTIONS.map(({ label, icon: Icon, path }) => (
                        <Link
                            key={label}
                            href={`/teacher/courses/${courseId}/${path}`}
                            role="menuitem"
                            onClick={() => setIsOpen(false)}
                            className="flex h-11 items-center gap-3 px-4 text-body-md text-ink hover:bg-surface-sunken"
                        >
                            <Icon size={20} aria-hidden="true" className="text-text-secondary" />
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
