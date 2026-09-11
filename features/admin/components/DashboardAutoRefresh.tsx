'use client'
// Refreshes the admin dashboard every 60 seconds so the numbers stay
// current without the admin needing to know to reload the page.
// Uses Next's router.refresh(), which re-runs the server component
// and re-fetches fresh data, rather than a full page reload.
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function DashboardAutoRefresh() {
    const router = useRouter()

    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh()
        }, 60_000)
        return () => clearInterval(interval)
    }, [router])

    return null
}
