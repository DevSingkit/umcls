// components/ui/Avatar.tsx
// Single shared avatar display: renders the photo if avatarUrl is
// present, falls back to an initial-letter circle otherwise. Public
// bucket means avatarUrl is always just a plain, directly-usable URL
// — no signing/resolution involved anywhere.

export function Avatar({
    fullName,
    avatarUrl,
    size = 'md',
    toneClassName = 'bg-brand-soft text-brand',
}: {
    fullName: string
    avatarUrl: string | null
    size?: 'sm' | 'md' | 'lg'
    // Lets callers on dark chrome (Sidebar/TopNav, bg-sidebar) pass a
    // different fallback-circle tone than the default brand-soft one,
    // which is meant for light surfaces.
    toneClassName?: string
}) {
    const initial = fullName?.trim()?.charAt(0)?.toUpperCase() || '?'
    const sizeClass = size === 'sm' ? 'h-9 w-9 text-body-emphasis' : size === 'lg' ? 'h-16 w-16 text-h3' : 'h-11 w-11 text-body-emphasis'

    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-pill overflow-hidden ${sizeClass} ${avatarUrl ? '' : toneClassName}`}
            aria-hidden="true"
        >
            {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- public storage URL, plain <img> is simplest here
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
                initial
            )}
        </span>
    )
}
