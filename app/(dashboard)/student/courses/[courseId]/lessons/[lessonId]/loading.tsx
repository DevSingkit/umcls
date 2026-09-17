import { Skeleton } from '@/components/ui/Skeleton'

export default function StudentLessonDetailLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-10 rounded-pill" />
            </div>

            {/* Lesson Reader card */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-4/6" />
            </div>

            {/* Missions path map skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <div className="bg-surface rounded-md border border-hairline shadow-card p-6 flex justify-around items-center">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-20 w-20 rounded-full" />
                </div>
            </div>

            {/* Materials list skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-20 w-full rounded-md" />
            </div>
        </div>
    )
}
