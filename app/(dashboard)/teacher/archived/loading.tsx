import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherArchivedCoursesLoading() {
    return (
        <div className="space-y-6">
            <div className="space-y-2 mb-8">
                <Skeleton className="h-10 w-56" />
                <Skeleton className="h-5 w-96 max-w-full" />
            </div>

            {/* Archived course cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-md" />
                ))}
            </div>
        </div>
    )
}
