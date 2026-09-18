import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'

export function NotificationBell({ userId }: { userId: string }) {
    const { notifications, unreadCount, markAsRead, clearBadge } = useNotifications(userId)
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

    function handleBellClick() {
        setIsOpen((prev) => {
            const next = !prev
            // Clear the badge only on the transition into "open" — not on
            // every click, and not on close. Individual highlights
            // (is_read) are untouched here; only the badge count resets.
            if (next) clearBadge()
            return next
        })
    }

    async function handleNotificationClick(id: string, link: string | null) {
        await markAsRead(id)
        setIsOpen(false)
        if (link) router.push(link)
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
                aria-expanded={isOpen}
                onClick={handleBellClick}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-white/10 shadow-card transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
                <Bell size={20} className="text-on-ink" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-warning px-1 text-caption font-semibold text-on-ink shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-40 mt-2 max-h-96 w-[calc(100vw-2rem)] max-w-80 overflow-y-auto rounded-md bg-surface shadow-modal border border-hairline animate-fade-in-down">
                    <div className="border-b border-hairline px-4 py-3">
                        <p className="text-body-emphasis text-ink">Notifications</p>
                    </div>
                    {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-body-md text-text-secondary">
                            No notifications right now.
                        </p>
                    ) : (
                        notifications.map((n) => (
                            <button
                                key={n.id}
                                type="button"
                                onClick={() => handleNotificationClick(n.id, n.link)}
                                className={cn(
                                    'block w-full border-b border-hairline px-4 py-3 text-left transition-colors last:border-0 hover:bg-surface-sunken',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset',
                                    !n.is_read && 'bg-brand-soft/60'
                                )}
                            >
                                <p className="text-caption font-semibold text-ink">{n.title}</p>
                                {n.body && <p className="mt-0.5 text-caption text-text-secondary">{n.body}</p>}
                                <p className="mt-1 text-caption text-text-muted">
                                    {new Date(n.created_at).toLocaleString()}
                                </p>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}