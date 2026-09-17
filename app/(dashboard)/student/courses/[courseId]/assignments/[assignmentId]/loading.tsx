import { Skeleton } from '@/components/ui/Skeleton'

export default function StudentAssignmentDetailLoading() {
    return (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Main column: instructions & materials */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-pill shrink-0" />
                        <Skeleton className="h-10 w-64" />
                    </div>
                    <Skeleton className="h-4 w-52" />
                </div>

                {/* Instructions box */}
                <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-5 w-3/5" />
                </div>

                {/* Attachments */}
                <div className="space-y-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-20 w-full rounded-md" />
                </div>
            </div>

            {/* Sticky side panel: submission upload & private comments */}
            <div className="space-y-4">
                <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-28" />
                        <Skeleton className="h-6 w-20 rounded-pill" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-14 w-full rounded-md" />
                </div>

                <div className="bg-surface rounded-md border border-hairline shadow-card p-6 space-y-3">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </div>
            </div>
        </div>
    )
}
