'use client'
// Requires Realtime to be enabled on the `notifications` table in the
// Supabase dashboard (Database > Replication) — a manual step, same
// category as the migration-apply step elsewhere in this project. If
// it isn't enabled, the initial fetch below still works (plain select,
// RLS-scoped to the caller), but new notifications won't appear live —
// only on next page load/refresh.
//
// Two independent read signals here, not one:
//   - is_read: per-notification highlight. Set true only when THAT
//     specific notification is clicked (markAsRead). Never touched by
//     opening the bell.
//   - badgeClearedAt: when the bell was last opened (users.
//     notification_badge_cleared_at). The badge count is "how many
//     notifications arrived after this timestamp" — opening the bell
//     zeroes it for everything currently visible, but a new one
//     arriving afterward counts again immediately, independent of
//     is_read. See migration 078 for the schema and full reasoning.
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export type Notification = {
    id: string
    type: string
    title: string
    body: string | null
    link: string | null
    is_read: boolean
    created_at: string
}

export function useNotifications(userId: string) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [badgeClearedAt, setBadgeClearedAt] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        let isMounted = true

        async function loadInitial() {
            const [{ data: notifs }, { data: profile }] = await Promise.all([
                // notifications_select (DATABASE.md) already restricts this to
                // the caller's own rows — user_id filter here is belt-and-
                // suspenders, same reasoning as AUTH_NOTES.md.
                supabase
                    .from('notifications')
                    .select('id, type, title, body, link, is_read, created_at')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false })
                    .limit(30),
                supabase.from('users').select('notification_badge_cleared_at').eq('id', userId).single(),
            ])

            if (isMounted) {
                setNotifications(notifs ?? [])
                setBadgeClearedAt(profile?.notification_badge_cleared_at ?? null)
                setIsLoading(false)
            }
        }

        loadInitial()

        // Remove any existing channel with this name first. In dev, React
        // Strict Mode mounts effects twice; without this, the second mount
        // tries to call .on() on a channel the first mount already called
        // .subscribe() on, which throws "cannot add postgres_changes
        // callbacks after subscribe()". Two components both calling this
        // hook for the same userId at the same time hit the same failure —
        // this guard covers both cases, not just Strict Mode.
        const existing = supabase.getChannels().find((c) => c.topic === `realtime:notifications:${userId}`)
        if (existing) {
            supabase.removeChannel(existing)
        }

        const channel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    setNotifications((prev) => [payload.new as Notification, ...prev])
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [userId])

    // Per-notification highlight only — never affects the badge.
    const markAsRead = useCallback(
        async (notificationId: string) => {
            const supabase = createClient()
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
            )
            // notifications_update (DATABASE.md) restricts this to the
            // caller's own row — no need to also filter by userId here,
            // but harmless to include for clarity.
            await supabase
                .from('notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('id', notificationId)
                .eq('user_id', userId)
        },
        [userId]
    )

    // Called when the bell is opened. Clears the badge for everything
    // currently visible by advancing badgeClearedAt to now — does NOT
    // touch is_read on any notification, so highlights are untouched.
    const clearBadge = useCallback(async () => {
        const supabase = createClient()
        const now = new Date().toISOString()
        setBadgeClearedAt(now)
        await supabase.from('users').update({ notification_badge_cleared_at: now }).eq('id', userId)
    }, [userId])

    const unreadCount = useMemo(() => {
        if (!badgeClearedAt) return notifications.length
        const clearedTime = new Date(badgeClearedAt).getTime()
        return notifications.filter((n) => new Date(n.created_at).getTime() > clearedTime).length
    }, [notifications, badgeClearedAt])

    return { notifications, unreadCount, isLoading, markAsRead, clearBadge }
}
