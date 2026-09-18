import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminDashboardLoading() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-9 w-52" />

            {/* Stat metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
            </div>

            {/* Recent activity table skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-7 w-40" />
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}
