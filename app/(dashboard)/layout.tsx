// Wraps every page under (dashboard), meaning admin, teacher, student,
// and coming-soon.
//
// See lib/auth/AUTH_NOTES.md and tasks.md PH0-006.
//
// G4: requireUser() only returns {id, fullName, role} — it never
// carried avatar_url, so this layout needs its own lightweight fetch
// for that one column rather than assuming it's already on `user`.
// Deliberately NOT reusing getMySettings() here — that also fetches
// notification_preferences, which this layout has no use for; a
// single-column select is cheaper for something that runs on every
// dashboard page load.
import type { ReactNode } from 'react'
import { requireUser } from '@/lib/auth/get-current-user'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    // Confirms someone is logged in. Sends them to login if not.
    const user = await requireUser()

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('users')
        .select('avatar_url')
        .eq('id', user.id)
        .single()

    return (
        <AppShell
            user={{
                id: user.id,
                fullName: user.fullName,
                role: user.role,
                avatarUrl: (profile?.avatar_url as string | null) ?? null,
            }}
        >
            {children}
        </AppShell>
    )
}
