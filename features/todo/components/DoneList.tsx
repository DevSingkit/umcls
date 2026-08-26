// features/todo/components/DoneList.tsx
// Done tab: matches real Classroom exactly — shows "Turned in" for a
// submitted-but-ungraded item, the actual score once graded. Never
// shows a due date (irrelevant once turned in) or a completion
// checkmark-only state (Classroom always shows either "Turned in" or
// a score, never just a generic "done" label).
import Link from 'next/link'
import { ClipboardList, HelpCircle } from 'lucide-react'
import type { DoneItem } from '@/features/todo/queries/todo-items'

const ITEM_LABEL: Record<DoneItem['itemType'], string> = {
    assignment: 'Assignment',
    quiz: 'Quiz',
}

const ITEM_ICON: Record<DoneItem['itemType'], typeof ClipboardList> = {
    assignment: ClipboardList,
    quiz: HelpCircle,
}

const ITEM_ICON_BG: Record<DoneItem['itemType'], string> = {
    assignment: 'bg-amber-soft text-amber',
    quiz: 'bg-info-soft text-info',
}

function hrefFor(item: DoneItem) {
    return item.itemType === 'assignment'
        ? `/student/courses/${item.courseId}/assignments/${item.id}`
        : `/student/courses/${item.courseId}/quizzes/${item.id}/results`
}

export function DoneList({ items, courseNameById }: { items: DoneItem[]; courseNameById?: Map<string, string> }) {
    if (items.length === 0) {
        return (
            <div className="bg-surface rounded-md shadow-card p-6 text-center">
                <p className="text-body-md text-text-secondary">Nothing turned in yet.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-3">
            {items.map((item) => {
                const courseName = courseNameById?.get(item.courseId)
                const Icon = ITEM_ICON[item.itemType]

                return (
                    <Link
                        key={`${item.itemType}-${item.id}`}
                        href={hrefFor(item)}
                        className="flex items-start gap-4 rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                    >
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${ITEM_ICON_BG[item.itemType]}`}
                            aria-hidden="true"
                        >
                            <Icon size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-caption text-text-secondary mb-1">
                                {courseName ? `${courseName} · ${ITEM_LABEL[item.itemType]}` : ITEM_LABEL[item.itemType]}
                            </p>
                            <span className="block truncate text-body-emphasis text-ink">{item.title}</span>
                        </div>

                        <div className="shrink-0">
                            {item.status === 'graded' ? (
                                <span className="inline-flex items-center rounded-pill bg-info-soft text-info text-caption font-semibold px-3 py-1 whitespace-nowrap">
                                    {item.score}/{item.maxScore}
                                </span>
                            ) : (
                                <span className="text-caption text-text-secondary whitespace-nowrap">Turned in</span>
                            )}
                        </div>
                    </Link>
                )
            })}
        </div>
    )
}
