// features/dashboard/components/LearningInsightsCard.tsx
//
// Phase 4 (ADAPTIVE-ENGINE-PLAN.md, 2026-08-28): displays the
// activity_mastery-based aggregates from getTeacherDashboardData's new
// `learningInsights` field. Built as a standalone card rather than
// inside NeedsAttentionList.tsx or the dashboard page directly — I
// don't have either of those files' current contents this session, so
// rather than guess at their internals I built this to the same
// established visual conventions used elsewhere (shadow-card,
// rounded-md, brand/amber/error color pairing) and left wiring it into
// the actual dashboard page to be done with that file uploaded fresh.
//
// Color mapping deliberately reuses the app's existing semantic
// meanings, not new ones: brand/success = learning well, amber/warning
// = needs practice (attention but not urgent — same register amber
// already carries elsewhere, e.g. Phase 3.5's "needs_practice" badge),
// error/red = needs support (the most urgent bucket).
//
// DESIGN-LMS 2.1 REDESIGN (2026-08-31): pure visual fix, no logic
// touched. Removed `font-heading` from the section heading — this is
// a Classroom Mode page (teacher dashboard); Fredoka is Mission-Mode-
// only. Falls back to font-document (Roboto) + text-h3 via
// globals.css's base h3 rule once the override is gone, same fix
// applied everywhere else in this track.
import Link from 'next/link'
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { LearningInsights } from '@/features/dashboard/actions/teacher-dashboard'

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
        <div className="flex items-center gap-3">
            <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${colorClass}`}
                aria-hidden="true"
            >
                <Icon size={20} />
            </span>
            <div>
                <p className="text-data-md text-ink">{count}</p>
                <p className="text-caption text-text-secondary">{label}</p>
            </div>
        </div>
    )
}

export function LearningInsightsCard({ insights }: { insights: LearningInsights }) {
    const totalStudents = insights.learningWellCount + insights.needsPracticeCount + insights.needsSupportCount

    if (totalStudents === 0 && !insights.commonDifficulty) {
        // No students have attempted any mission content yet anywhere
        // in this teacher's courses — nothing meaningful to show.
        return null
    }

    return (
        <div className="bg-surface rounded-md shadow-card p-6">
            <h2 className="text-h3 text-ink mb-4">Learning insights</h2>

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
                    className="mt-5 flex items-start gap-3 rounded-md border border-hairline p-4 hover:border-brand transition-colors"
                >
                    <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="min-w-0">
                        <p className="text-caption font-semibold text-text-secondary">
                            Common difficulty this week · {insights.commonDifficulty.courseName} ·{' '}
                            {insights.commonDifficulty.missionTitle}
                        </p>
                        <p className="text-body-emphasis text-ink truncate mt-0.5">
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
    )
}
