import Link from 'next/link'

// Classroom-style course tile: colored header band + title, subject
// shown as a small label if present. Color is derived deterministically
// from the course id so the same course always gets the same color
// across renders/sessions, without needing to store a color on the row.
const BAND_COLORS = ['bg-brand', 'bg-info', 'bg-amber', 'bg-role-student', 'bg-role-admin'] as const

function bandColorFor(id: string) {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = (hash * 31 + id.charCodeAt(i)) >>> 0
    }
    return BAND_COLORS[hash % BAND_COLORS.length]
}

interface CourseCardProps {
    id: string
    title: string
    subject?: string | null
    href: string
}

export function CourseCard({ id, title, subject, href }: CourseCardProps) {
    const band = bandColorFor(id)

    return (
        <Link
            href={href}
            className="group block overflow-hidden rounded-md bg-surface shadow-card transition-shadow hover:shadow-card-hover"
        >
            <div className={`h-20 ${band} px-5 py-4 flex flex-col justify-end`}>
                {subject && (
                    <span className="text-caption font-semibold text-on-ink/80 mb-1">
                        {subject}
                    </span>
                )}
                <span className="text-body-emphasis text-on-ink leading-tight line-clamp-2">
                    {title}
                </span>
            </div>
            <div className="px-5 py-3">
                <span className="text-caption text-brand font-semibold group-hover:underline">
                    Open course
                </span>
            </div>
        </Link>
    )
}