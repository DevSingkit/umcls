// features/dashboard/components/MasteredMissions.tsx
//
// Encapsulated Card Architecture: Encapsulated within SectionCard.
// Replay missions the student has mastered, grouped by course.
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { MasteredMissionsByCourse } from '@/features/dashboard/actions/get-mastered-missions'
import { SectionCard } from '@/components/ui/SectionCard'

export function MasteredMissions({ groups }: { groups: MasteredMissionsByCourse[] }) {
    if (groups.length === 0) {
        return null
    }

    const totalMastered = groups.reduce((acc, g) => acc + g.missions.length, 0)

    return (
        <SectionCard
            title="Mastered — replay for fun"
            badge={totalMastered}
            subtitle="Practice anytime to reinforce your learning"
        >
            <div className="space-y-6">
                {groups.map((group) => (
                    <div key={group.courseId}>
                        <p className="text-caption font-semibold text-text-secondary mb-3">{group.courseName}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {group.missions.map((mission) => (
                                <Link
                                    key={mission.missionId}
                                    href={`/student/courses/${group.courseId}/lessons/${mission.lessonId}/missions/${mission.missionId}`}
                                    className="bg-surface rounded-md border border-hairline p-5 block hover:shadow-card hover:border-brand transition-all"
                                >
                                    <p className="font-sans text-body-emphasis text-ink">{mission.missionTitle}</p>
                                    <span className="text-caption font-semibold text-brand bg-brand-soft rounded-pill px-3 py-1 mt-2.5 inline-flex items-center gap-1.5">
                                        <Trophy size={14} aria-hidden="true" />
                                        Replay
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    )
}
