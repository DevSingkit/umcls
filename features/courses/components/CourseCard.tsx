import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'

// Classroom-style course tile. Per latest product direction, the
// colored band is no longer a plain decorative strip on top — it's the
// actual background for the identifying content (teacher avatar,
// subject, section, description), same way real Classroom's banner
// carries its title/section text directly on the color. The white
// body below is now just the footer action.
//
// Avatar is grouped top-left with the subject/section text (not
// bottom-right overlapping the seam, which is real Classroom's own
// placement) — deliberate product choice, called out explicitly.
//
// Color is derived deterministically from the course id so the same
// course always gets the same color across renders/sessions, without
// needing to store a color on the row.
//
// Rotation confirmed 2026-08-31 (replaces 3 invalid tokens —
// bg-amber, bg-role-student, bg-role-admin — that were silent no-ops,
// meaning 3/5 of course cards previously rendered with no band
// background at all).
const BAND_COLORS = [
    'bg-sidebar',          // Deep Raspberry Pink (#8F1349)
    'bg-sidebar-active',   // Bright Raspberry Pink (#C21A5D)
    'bg-brand',            // Institution Green (#128630)
    'bg-gamified-purple',  // Gamified Accent Purple (#8854C0)
    'bg-gamified-blue',    // Gamified Accent Blue (#1CB0F6)
] as const

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
    description?: string | null
    isPublished?: boolean
    teacherName?: string | null
    teacherAvatarUrl?: string | null
    href: string
}

export function CourseCard({
    id,
    title,
    subject,
    description,
    isPublished = true,
    teacherName,
    teacherAvatarUrl,
    href,
}: CourseCardProps) {
    const band = bandColorFor(id)

    return (
        <Link
            href={href}
            className="group block overflow-hidden rounded-md bg-surface shadow-card transition-shadow hover:shadow-card-hover"
        >
            <div className={`${band} px-5 py-4`}>
                <div className="flex items-start gap-3">
                    {teacherName && (
                        <Avatar
                            fullName={teacherName}
                            avatarUrl={teacherAvatarUrl ?? null}
                            size="sm"
                            toneClassName="bg-white/20 text-on-ink"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-h3 text-on-ink leading-tight line-clamp-2">
                                {subject || title}
                            </p>
                            {!isPublished && (
                                <span className="shrink-0 inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-caption font-semibold text-warning">
                                    Draft
                                </span>
                            )}
                        </div>
                        {subject && (
                            <p className="text-caption text-on-ink/80 mt-0.5 line-clamp-1">{title}</p>
                        )}
                        {description && (
                            <p className="text-caption text-on-ink/70 mt-1 line-clamp-2">{description}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="border-t border-hairline px-5 py-3">
                <span className="text-caption text-brand font-semibold group-hover:underline">
                    Open class
                </span>
            </div>
        </Link>
    )
}
