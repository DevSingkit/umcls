import { getMySettings } from '@/features/settings/actions/settings'
import { ProfileSection } from '@/features/settings/components/ProfileSection'
import { ChangePasswordForm } from '@/features/settings/components/ChangePasswordForm'
import { NotificationToggles } from '@/features/settings/components/NotificationToggles'
import { AccessibilitySettings } from '@/features/settings/components/AccessibilitySettings'

export default async function SettingsPage() {
    const settings = await getMySettings()

    return (
        <div>
            <h1 className="text-h1 text-ink mb-8">Settings</h1>

            <div className="grid gap-6 max-w-2xl">
                <ProfileSection
                    initialFullName={settings.fullName}
                    initialEmail={settings.email}
                    initialAvatarUrl={settings.avatarUrl}
                />
                <ChangePasswordForm />
                <NotificationToggles initial={settings.notifications} />
                <AccessibilitySettings
                    initialTextSize={settings.textSize}
                    initialHighContrast={settings.highContrast}
                    initialReducedMotion={settings.reducedMotion}
                />
            </div>
        </div>
    )
}
