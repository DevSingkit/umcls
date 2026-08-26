// features/missions/components/MissionPath.tsx
//
// v3 — bigger, bolder "game hub" treatment to match the rebuilt
// full-screen ActivityRunner. This screen itself is NOT full-screen
// (it's a selection/map screen, not gameplay — same relationship
// Duolingo's own map has to its lesson screens: the map keeps normal
// chrome, the lesson itself takes over the viewport). Structure and
// all access logic are UNCHANGED from the original: same props, same
// vertical-timeline layout, same rule that a locked mission renders as
// a plain div (never a Link/<a>) — Day 4's server-side re-checks
// remain the actual enforcement, this is still just what the UI offers.
//
// What changed, purely visual, on top of the v2 pass:
//   - Bigger glyph badges (16 instead of 14) and bigger card padding —
//     reads as a game map, not a compact settings list.
//   - Current/unlocked node's card gets a soft brand-tinted background
//     instead of plain white, so the "next thing to play" reads as the
//     obvious focal point even before the pulse ring is noticed.
//   - Mastered nodes get a subtle amber-soft card tint too, so glancing
//     down the path shows a visible trail of "cleared" stops.

import Link from 'next/link'
import { Star, Play, Lock } from 'lucide-react'
import type { MissionForStudent } from '@/features/missions/actions/get-mission-for-student'

function StatusGlyph({
    status,
    isCurrent,
}: {
    status: MissionForStudent['status']
    isCurrent: boolean
}) {
    if (status === 'mastered') {
        return (
            <span className="relative flex items-center justify-center w-16 h-16 rounded-pill bg-amber text-on-ink shrink-0 shadow-card-hover">
                <Star size={28} fill="currentColor" aria-hidden="true" />
            </span>
        )
    }

    if (status === 'unlocked') {
        return (
            <span className="relative flex items-center justify-center shrink-0">
                {isCurrent && (
                    <span className="motion-safe:animate-ping absolute inset-0 rounded-pill bg-brand opacity-40" aria-hidden="true" />
                )}
                <span
                    className={`relative flex items-center justify-center w-16 h-16 rounded-pill border-[3px] border-brand bg-surface text-brand shadow-card-hover ${
                        isCurrent ? 'scale-110' : ''
                    }`}
                >
                    <Play size={26} fill="currentColor" aria-hidden="true" />
                </span>
            </span>
        )
    }

    return (
        <span className="flex items-center justify-center w-16 h-16 rounded-pill bg-surface-sunken text-text-muted shrink-0">
            <Lock size={22} aria-hidden="true" />
        </span>
    )
}

export function MissionPath({
    missions,
    courseId,
    lessonId,
}: {
    missions: MissionForStudent[]
    courseId: string
    lessonId: string
}) {
    if (missions.length === 0) {
        return <p className="text-body-md text-text-secondary">No missions yet for this lesson.</p>
    }

    // The first "unlocked" mission in order is the one the student
    // would actually tap next — that's the node that gets the pulse +
    // "Start here" treatment. Anything past it is still locked;
    // anything before it is already mastered.
    const currentMissionId = missions.find((m) => m.status === 'unlocked')?.id

    return (
        <ol className="relative space-y-4">
            {missions.map((mission, index) => {
                const isLast = index === missions.length - 1
                const isLocked = mission.status === 'locked'
                const isCurrent = mission.id === currentMissionId
                const isMastered = mission.status === 'mastered'
                // Segment below THIS node is "progress" colored only if
                // this node is already mastered — i.e. the path between
                // two completed nodes, or between the last mastered node
                // and the current one, should read as traveled ground.
                const lineIsProgress = isMastered

                // Day 4 built the route this points to:
                // app/(dashboard)/student/courses/[courseId]/lessons/[lessonId]/missions/[missionId]/page.tsx
                const href = `/student/courses/${courseId}/lessons/${lessonId}/missions/${mission.id}`

                const content = (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center shrink-0">
                            <StatusGlyph status={mission.status} isCurrent={isCurrent} />
                            {!isLast && (
                                <span
                                    className={`w-1 flex-1 min-h-[24px] mt-1 rounded-pill ${
                                        lineIsProgress ? 'bg-brand' : 'bg-hairline'
                                    }`}
                                />
                            )}
                        </div>
                        <div
                            className={`flex-1 rounded-md border p-5 transition-all ${
                                isLocked
                                    ? 'bg-surface-sunken border-hairline'
                                    : isCurrent
                                      ? 'bg-brand-soft border-[1.5px] border-brand shadow-card-hover'
                                      : isMastered
                                        ? 'bg-amber-soft border-hairline shadow-card'
                                        : 'bg-surface border-hairline shadow-card hover:border-brand'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p
                                    className={
                                        isCurrent
                                            ? 'font-heading text-h3 text-ink'
                                            : `text-body-emphasis ${isLocked ? 'text-text-muted' : 'text-ink'}`
                                    }
                                >
                                    {mission.title}
                                </p>
                                {isMastered && (
                                    <span className="shrink-0 text-caption font-semibold text-amber bg-surface rounded-pill px-3 py-1 shadow-card">
                                        Mastered
                                    </span>
                                )}
                                {isCurrent && (
                                    <span className="motion-safe:animate-pulse shrink-0 text-caption font-semibold text-on-ink bg-brand rounded-pill px-3 py-1">
                                        Start here
                                    </span>
                                )}
                            </div>
                            {mission.description && !isLocked && (
                                <p className="text-caption text-text-secondary mt-1">{mission.description}</p>
                            )}
                            {mission.status === 'unlocked' && mission.correctStreak > 0 && (
                                <p className="text-caption text-text-secondary mt-1">
                                    {mission.correctStreak} / {mission.masteryThreshold} correct in a row
                                </p>
                            )}
                            {isLocked && (
                                <p className="text-caption text-text-muted mt-1">Complete the mission above to unlock</p>
                            )}
                        </div>
                    </div>
                )

                return (
                    <li key={mission.id}>
                        {isLocked ? content : <Link href={href}>{content}</Link>}
                    </li>
                )
            })}
        </ol>
    )
}
