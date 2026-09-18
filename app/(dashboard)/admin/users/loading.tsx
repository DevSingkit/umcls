import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminUsersLoading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-36 mb-2" />

            {/* Toolbar buttons skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
            </div>

            {/* Filter and search bar skeleton */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-12 flex-1 rounded-md" />
                <Skeleton className="h-12 w-full sm:w-40 rounded-md" />
                <Skeleton className="h-12 w-full sm:w-40 rounded-md" />
            </div>

            {/* User list table/cards skeleton */}
            <div className="rounded-md border border-hairline bg-surface shadow-card divide-y divide-hairline">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <Skeleton className="h-11 w-11 rounded-pill shrink-0" />
                            <div className="space-y-1.5 min-w-0">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-56" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Skeleton className="h-7 w-20 rounded-pill" />
                            <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
