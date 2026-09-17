import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminCoursesLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2 mb-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-96 max-w-full" />
            </div>

            {/* Filter and search bar skeleton */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-12 flex-1 rounded-md" />
                <Skeleton className="h-12 w-full sm:w-44 rounded-md" />
            </div>

            {/* Course cards grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-hairline bg-surface p-5 shadow-card space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-16 rounded-pill shrink-0" />
                        </div>
                        <div className="pt-2 border-t border-hairline flex items-center justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-9 w-24 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
