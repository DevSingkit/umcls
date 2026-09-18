import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherCourseOverviewLoading() {
    return (
        <div className="space-y-6">
            {/* Course top banner action bar */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-24 rounded-pill" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-12 w-32 rounded-md" />
                    <Skeleton className="h-12 w-28 rounded-md" />
                    <Skeleton className="h-12 w-12 rounded-md" />
                </div>
            </div>

            {/* Announcement composer skeleton */}
            <Skeleton className="h-20 w-full rounded-md" />

            {/* Stream feed items skeleton */}
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-md border border-hairline bg-surface p-5 shadow-card space-y-3">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-pill shrink-0" />
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    )
}
