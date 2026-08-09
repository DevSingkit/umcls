'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
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
        <div ref={containerRef} className="relative lg:fixed lg:right-4 lg:top-4 lg:z-40">
            <button
                aria-label="Notifications"
                onClick={handleBellClick}
                className="relative flex h-11 w-11 items-center justify-center rounded-pill bg-white/10 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:bg-surface"
            >
                <Bell size={20} className="text-on-ink lg:text-ink" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-amber px-1 text-caption font-semibold text-on-ink">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto rounded-md bg-surface shadow-modal">
                    <div className="border-b border-hairline px-4 py-3">
                        <p className="text-body-emphasis text-ink">Notifications</p>
                    </div>
                    {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-caption text-text-secondary">
                            Nothing yet.
                        </p>
                    ) : (
                        notifications.map((n) => (
                            <button
                                key={n.id}
                                onClick={() => handleNotificationClick(n.id, n.link)}
                                className={`block w-full border-b border-hairline px-4 py-3 text-left last:border-0 hover:bg-surface-sunken ${n.is_read ? '' : 'bg-brand-soft/60'
                                    }`}
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