import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminCourseActivityLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2 mb-8">
                <Skeleton className="h-10 w-52" />
                <Skeleton className="h-5 w-96 max-w-full" />
            </div>

            {/* Course activity accordion skeletons */}
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-surface rounded-md border border-hairline shadow-card p-5 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-6 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <Skeleton className="h-6 w-20 rounded-pill" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
