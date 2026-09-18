import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherDashboardLoading() {
    return (
        <div className="space-y-8">
            <Skeleton className="h-9 w-48" />

            {/* Courses list skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-36" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-36 rounded-xl" />
                    <Skeleton className="h-36 rounded-xl" />
                </div>
            </div>

            {/* Stats section skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
            </div>
        </div>
    )
}
