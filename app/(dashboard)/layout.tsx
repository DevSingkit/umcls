// This file was missing. It wraps every page under (dashboard),
// meaning admin, teacher, student, and coming-soon. Without it, those
// pages had no layout to render through, which is why they showed 404
// even though the page files existed.
//
// See lib/auth/AUTH_NOTES.md and tasks.md PH0-006.
import type { ReactNode } from 'react'
import { requireUser } from '@/lib/auth/get-current-user'
import { AppShell } from '@/components/layout/AppShell'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    // Confirms someone is logged in. Sends them to login if not.
    const user = await requireUser()

    return (
        <AppShell user={{ id: user.id, fullName: user.fullName, role: user.role }}>
            {children}
        </AppShell>
    )
}