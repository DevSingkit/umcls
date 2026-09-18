import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherAssignmentDetailLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-28 rounded-pill" />
                </div>
                <Skeleton className="h-4 w-72" />
            </div>

            {/* Instructions skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
            </div>

            {/* Submissions list header & rows skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="bg-surface rounded-md border border-hairline shadow-card divide-y divide-hairline">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 gap-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-pill shrink-0" />
                                <div className="space-y-1">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-6 w-20 rounded-pill" />
                                <Skeleton className="h-9 w-16 rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
