import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminAuditLogsLoading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-44 mb-8" />

            {/* Filter toolbar skeleton */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-12 w-full sm:w-48 rounded-md" />
                <Skeleton className="h-12 w-full sm:w-48 rounded-md" />
                <Skeleton className="h-12 flex-1 rounded-md" />
            </div>

            {/* Logs table skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card divide-y divide-hairline">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-20 rounded-pill" />
                            </div>
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Skeleton className="h-4 w-28 shrink-0" />
                    </div>
                ))}
            </div>
        </div>
    )
}
