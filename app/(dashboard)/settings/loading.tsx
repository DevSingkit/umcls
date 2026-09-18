import { Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
    return (
        <div className="space-y-6 max-w-2xl">
            <Skeleton className="h-10 w-40 mb-8" />

            {/* Profile section card skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-pill shrink-0" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
            </div>

            {/* Change password card skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-4">
                <Skeleton className="h-6 w-44" />
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-32 rounded-md" />
                </div>
            </div>

            {/* Notifications & Accessibility cards skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-6 w-11 rounded-pill" />
                    </div>
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-52" />
                        <Skeleton className="h-6 w-11 rounded-pill" />
                    </div>
                </div>
            </div>
        </div>
    )
}
