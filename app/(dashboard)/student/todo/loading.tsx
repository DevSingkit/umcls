import { Skeleton } from '@/components/ui/Skeleton'

export default function StudentTodoLoading() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-40" />

            {/* Filter tabs skeleton */}
            <div className="flex gap-4 border-b border-ink/10 pb-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
            </div>

            {/* Todo items list skeleton */}
            <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
            </div>
        </div>
    )
}
