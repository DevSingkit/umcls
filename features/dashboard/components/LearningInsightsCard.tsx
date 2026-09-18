// features/dashboard/components/LearningInsightsCard.tsx
//
// Encapsulated Card Architecture: Integrated into SectionCard with
// structured metrics and difficulty summary.
import Link from 'next/link'
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { LearningInsights } from '@/features/dashboard/actions/teacher-dashboard'
import { SectionCard } from '@/components/ui/SectionCard'

function InsightStat({
    count,
    label,
    icon: Icon,
    colorClass,
}: {
    count: number
    label: string
    icon: typeof CheckCircle2
    colorClass: string
}) {
    return (
        <div className="flex items-center gap-3.5 p-4 rounded-md bg-surface-sunken/30 border border-hairline/60">
            <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${colorClass}`}
                aria-hidden="true"
            >
                <Icon size={20} />
            </span>
            <div>
                <p className="font-sans text-data-md font-bold text-ink">{count}</p>
                <p className="font-sans text-caption text-text-secondary">{label}</p>
            </div>
        </div>
    )
}

export function LearningInsightsCard({ insights }: { insights: LearningInsights }) {
    const totalStudents = insights.learningWellCount + insights.needsPracticeCount + insights.needsSupportCount

    if (totalStudents === 0 && !insights.commonDifficulty) {
        return null
    }

    return (
        <SectionCard
            title="Learning insights"
            subtitle="Student progress metrics across all your active courses"
        >
            <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                    <InsightStat
                        count={insights.learningWellCount}
                        label="Learning well"
                        icon={CheckCircle2}
                        colorClass="bg-success-soft text-success"
                    />
                    <InsightStat
                        count={insights.needsPracticeCount}
                        label="Need more practice"
                        icon={AlertCircle}
                        colorClass="bg-warning-soft text-warning"
                    />
                    <InsightStat
                        count={insights.needsSupportCount}
                        label="Need support"
                        icon={AlertTriangle}
                        colorClass="bg-error-soft text-error"
                    />
                </div>

                {insights.commonDifficulty && (
                    <Link
                        href={insights.commonDifficulty.href}
                        className="flex items-start gap-3.5 rounded-md border border-hairline bg-surface p-4 hover:border-brand hover:shadow-sm transition-all"
                    >
                        <AlertTriangle size={20} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <p className="text-caption font-semibold text-text-secondary">
                                Common difficulty this week: {insights.commonDifficulty.courseName}
                                {insights.commonDifficulty.courseSubject && (
                                    <> · {insights.commonDifficulty.courseSubject}</>
                                )}{' '}
                                · {insights.commonDifficulty.missionTitle}
                            </p>
                            <p className="font-sans text-body-emphasis text-ink truncate mt-0.5">
                                {insights.commonDifficulty.prompt}
                            </p>
                            <p className="text-caption text-text-secondary mt-0.5">
                                Missed {insights.commonDifficulty.wrongCountThisWeek} time
                                {insights.commonDifficulty.wrongCountThisWeek === 1 ? '' : 's'} this week
                            </p>
                        </div>
                    </Link>
                )}
            </div>
        </SectionCard>
    )
}
