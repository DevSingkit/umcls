import { Skeleton } from '@/components/ui/Skeleton'

export default function StudentQuizDetailLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                <Skeleton className="h-4 w-16" />
            </div>

            {/* Quiz card overview skeleton */}
            <div className="bg-surface rounded-md border border-hairline shadow-card p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                </div>

                <div className="space-y-2">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                </div>

                {/* Question metadata chips */}
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-24 rounded-pill" />
                    <Skeleton className="h-8 w-28 rounded-pill" />
                </div>

                {/* Start action CTA */}
                <Skeleton className="h-14 w-full sm:w-48 rounded-md" />
            </div>
        </div>
    )
}
