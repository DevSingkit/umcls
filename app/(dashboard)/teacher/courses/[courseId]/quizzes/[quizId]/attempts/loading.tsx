import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherQuizAttemptsLoading() {
    return (
        <div className="max-w-2xl space-y-6">
            <Skeleton className="h-10 w-40 mb-8" />

            {/* Attempts list skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card divide-y divide-hairline">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 gap-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-pill shrink-0" />
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-36" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-6 w-16 rounded-pill" />
                            <Skeleton className="h-9 w-20 rounded-md" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
