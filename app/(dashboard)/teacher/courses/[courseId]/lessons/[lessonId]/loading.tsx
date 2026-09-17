import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherLessonDetailLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-11 w-24 rounded-md" />
            </div>

            {/* Lesson content body skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-5/6" />
                <Skeleton className="h-5 w-4/6" />
            </div>

            {/* Materials & Missions sections skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Skeleton className="h-20 rounded-md" />
                    <Skeleton className="h-20 rounded-md" />
                </div>
            </div>

            {/* Comments thread skeleton */}
            <div className="space-y-3 pt-4 border-t border-hairline">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-14 w-full rounded-md" />
            </div>
        </div>
    )
}
