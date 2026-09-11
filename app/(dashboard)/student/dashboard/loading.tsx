import { Skeleton } from '@/components/ui/Skeleton'

export default function StudentDashboardLoading() {
    return (
        <div>
            {/* Header skeleton */}
            <Skeleton className="h-9 w-44 mb-8" />

            {/* Courses section skeleton */}
            <div className="mb-10 space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-36 rounded-xl" />
                </div>
            </div>

            {/* Content grid skeleton */}
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="order-2 lg:order-1 space-y-4">
                    <Skeleton className="h-7 w-48 mb-4" />
                    <Skeleton className="h-44 rounded-xl" />
                </div>

                <div className="order-1 lg:order-2 space-y-4">
                    <Skeleton className="h-7 w-28 mb-4" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-20 rounded-xl" />
                </div>
            </div>
        </div>
    )
}
