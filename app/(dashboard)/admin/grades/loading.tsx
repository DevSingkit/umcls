import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminGradesLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2 mb-8">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-5 w-80 max-w-full" />
            </div>

            {/* Course picker list skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card divide-y divide-hairline mb-8">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 sm:p-5">
                        <Skeleton className="h-11 w-11 rounded-md shrink-0" />
                        <div className="space-y-1.5 flex-1 min-w-0">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Gradebook table skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <div className="bg-surface rounded-md border border-hairline shadow-card p-4 space-y-3">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}
