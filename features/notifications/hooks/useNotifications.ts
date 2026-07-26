'use client'
// Requires Realtime to be enabled on the `notifications` table in the
// Supabase dashboard (Database > Replication) — a manual step, same
// category as the migration-apply step elsewhere in this project. If
// it isn't enabled, the initial fetch below still works (plain select,
// RLS-scoped to the caller), but new notifications won't appear live —
// only on next page load/refresh.
import { useEffect, useState, useCallback } from 'react'
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
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const supabase = createClient()
        let isMounted = true

        async function loadInitial() {
            // notifications_select (DATABASE.md) already restricts this to
            // the caller's own rows — user_id filter here is belt-and-
            // suspenders, same reasoning as AUTH_NOTES.md.
            const { data } = await supabase
                .from('notifications')
                .select('id, type, title, body, link, is_read, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(30)

            if (isMounted) {
                setNotifications(data ?? [])
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

    const unreadCount = notifications.filter((n) => !n.is_read).length

    return { notifications, unreadCount, isLoading, markAsRead }
}
