import { Skeleton } from '@/components/ui/Skeleton'

export default function TeacherCoursesLoading() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-32 rounded-lg" />
            </div>

            {/* Course modules/lessons list skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
            </div>
        </div>
    )
}
