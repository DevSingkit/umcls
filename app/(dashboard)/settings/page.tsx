import { getMySettings } from '@/features/settings/actions/settings'
import { ProfileSection } from '@/features/settings/components/ProfileSection'
import { ChangePasswordForm } from '@/features/settings/components/ChangePasswordForm'
import { NotificationToggles } from '@/features/settings/components/NotificationToggles'
import { TextSizeToggle } from '@/features/settings/components/TextSizeToggle'

// Settings is reachable by any logged-in role — getMySettings() uses
// requireUser, not requireRole, so this page works the same for a
// teacher, student, or admin without needing per-role variants.
export default async function SettingsPage() {
    const settings = await getMySettings()

    return (
        <div>
            <h1 className="font-heading text-h1 text-ink mb-8">Settings</h1>

            <div className="grid gap-6 max-w-2xl">
                <ProfileSection
                    initialFullName={settings.fullName}
                    initialEmail={settings.email}
                    initialAvatarUrl={settings.avatarUrl}
                />
                <ChangePasswordForm />
                <NotificationToggles initial={settings.notifications} />
                <TextSizeToggle initial={settings.textSize} />
            </div>
        </div>
    )
}
