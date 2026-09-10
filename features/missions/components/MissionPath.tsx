// features/missions/components/MissionPath.tsx
//
// K-5 REDESIGN: Winding trail layout with alternating horizontal offsets
// and tactile 3D clay sphere nodes. Replaces the flat vertical timeline
// with a game-map feel that reads as a real adventure path.
//
// What changed from v3:
//   - Winding offsets: nodes alternate ml-0 → ml-8 → ml-16 → ml-8 (cycle of 4)
//   - StatusGlyph refactored into 3D clay spheres using .mission-sphere utility
//   - Mastered: gold gradient sphere + Star icon
//   - Unlocked/current: green gradient sphere + Play icon + pulse-ring animation
//   - Locked: gray gradient sphere + Lock icon
//   - pop-in staggered entrance animation
//   - Cards upgraded to clay-card with TTS buttons
//
// Structure, access logic, and Link/div rule UNCHANGED from original.

'use client'

import Link from 'next/link'
import { Star, Play, Lock } from 'lucide-react'
import type { MissionForStudent } from '@/features/missions/actions/get-mission-for-student'
import { TTSButton } from '@/components/ui/TTSButton'

// Winding trail offsets — cycle every 4 nodes
const TRAIL_OFFSETS = ['ml-0', 'ml-8', 'ml-16', 'ml-8']

function StatusGlyph({
    status,
    isCurrent,
    index,
}: {
    status: MissionForStudent['status']
    isCurrent: boolean
    index: number
}) {
    // Staggered pop-in animation delay
    const delay = `${index * 100}ms`

    if (status === 'mastered') {
        return (
            <span
                className="mission-sphere mission-sphere-gold motion-safe:animate-pop-in"
                style={{ animationDelay: delay }}
            >
                <Star size={32} fill="currentColor" className="text-on-ink" aria-hidden="true" />
            </span>
        )
    }

    if (status === 'unlocked') {
        return (
            <span className="relative flex items-center justify-center shrink-0">
                {isCurrent && (
                    <span
                        className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring mission-sphere-green opacity-40"
                        aria-hidden="true"
                    />
                )}
                <span
                    className={`mission-sphere mission-sphere-green motion-safe:animate-pop-in ${
                        isCurrent ? 'scale-110' : ''
                    }`}
                    style={{ animationDelay: delay }}
                >
                    <Play size={30} fill="currentColor" className="text-on-ink" aria-hidden="true" />
                </span>
            </span>
        )
    }

    return (
        <span
            className="mission-sphere mission-sphere-gray motion-safe:animate-pop-in"
            style={{ animationDelay: delay }}
        >
            <Lock size={24} className="text-on-ink/70" aria-hidden="true" />
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
        return <p className="font-sans text-body-md text-text-secondary">No missions yet for this lesson.</p>
    }

    const currentMissionId = missions.find((m) => m.status === 'unlocked')?.id

    return (
        <ol className="relative space-y-6 py-4">
            {missions.map((mission, index) => {
                const isLast = index === missions.length - 1
                const isLocked = mission.status === 'locked'
                const isCurrent = mission.id === currentMissionId
                const isMastered = mission.status === 'mastered'
                const lineIsProgress = isMastered
                const offsetClass = TRAIL_OFFSETS[index % TRAIL_OFFSETS.length]

                const href = `/student/courses/${courseId}/lessons/${lessonId}/missions/${mission.id}`

                const content = (
                    <div className={`flex items-center gap-4 transition-all ${offsetClass}`}>
                        <div className="flex flex-col items-center shrink-0">
                            <StatusGlyph status={mission.status} isCurrent={isCurrent} index={index} />
                            {!isLast && (
                                <span
                                    className={`w-1.5 flex-1 min-h-[32px] mt-2 rounded-pill ${
                                        lineIsProgress ? 'bg-brand' : 'bg-hairline'
                                    }`}
                                />
                            )}
                        </div>
                        <div
                            className={`flex-1 rounded-2xl p-5 transition-all ${
                                isLocked
                                    ? 'clay-well border border-hairline'
                                    : isCurrent
                                      ? 'clay-card border-[2px] border-brand shadow-card-hover'
                                      : isMastered
                                        ? 'clay-card bg-warning-soft'
                                        : 'clay-card hover:shadow-card-hover'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p
                                    className={
                                        isCurrent
                                            ? 'font-heading text-[1.25rem] md:text-[1.5rem] font-semibold text-ink'
                                            : `font-sans text-body-emphasis ${isLocked ? 'text-text-muted' : 'text-ink'}`
                                    }
                                >
                                    {mission.title}
                                </p>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {!isLocked && <TTSButton text={mission.title} />}
                                    {isMastered && (
                                        <span className="font-sans text-caption font-semibold text-warning bg-surface rounded-pill px-3 py-1 shadow-card">
                                            Mastered
                                        </span>
                                    )}
                                    {isCurrent && (
                                        <span className="motion-safe:animate-pulse shrink-0 font-sans text-caption font-semibold text-on-ink bg-brand rounded-pill px-3 py-1">
                                            Start here
                                        </span>
                                    )}
                                </div>
                            </div>
                            {mission.description && !isLocked && (
                                <p className="font-sans text-caption text-text-secondary mt-1">{mission.description}</p>
                            )}
                            {mission.status === 'unlocked' && mission.correctStreak > 0 && (
                                <p className="font-sans text-caption text-text-secondary mt-1">
                                    {mission.correctStreak} / {mission.masteryThreshold} correct in a row
                                </p>
                            )}
                            {isLocked && (
                                <p className="font-sans text-caption text-text-muted mt-1">Complete the mission above to unlock</p>
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
