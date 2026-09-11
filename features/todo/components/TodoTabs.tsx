'use client'
// features/todo/components/TodoTabs.tsx
// Assigned/Missing/Done tabs, matching real Google Classroom's actual
// To-do page structure. Assigned and Missing are both derived from
// the same not-yet-submitted item list (student_todo_items) — the
// only difference between them is whether dueAt has passed, computed
// here rather than as two separate queries, since it's just a date
// comparison on data already fetched together. Done comes from a
// genuinely separate query (getMyDoneItems) — see todo-items.ts's
// header comment for why that can't be derived from the same source.
import { useState } from 'react'
import { TodoList } from './TodoList'
import { DoneList } from './DoneList'
import type { TodoItem, DoneItem } from '@/features/todo/queries/todo-items'

type Tab = 'assigned' | 'missing' | 'done'

export function TodoTabs({
    todoItems,
    doneItems,
    courseNameById,
}: {
    todoItems: TodoItem[]
    doneItems: DoneItem[]
    courseNameById: Map<string, string>
}) {
    const [tab, setTab] = useState<Tab>('assigned')

    const now = Date.now()
    const assigned = todoItems.filter((i) => !i.dueAt || new Date(i.dueAt).getTime() >= now)
    const missing = todoItems.filter((i) => i.dueAt && new Date(i.dueAt).getTime() < now)

    const tabs: { id: Tab; label: string; count: number }[] = [
        { id: 'assigned', label: 'Assigned', count: assigned.length },
        { id: 'missing', label: 'Missing', count: missing.length },
        { id: 'done', label: 'Done', count: doneItems.length },
    ]

    return (
        <div>
            <div role="tablist" aria-label="To-do status" className="flex gap-1 mb-6 border-b border-hairline">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-3 text-body-md font-semibold border-b-2 -mb-px transition-colors ${
                            tab === t.id
                                ? 'border-brand text-brand'
                                : 'border-transparent text-text-secondary hover:text-ink'
                        }`}
                    >
                        {t.label}
                        {t.count > 0 && <span className="ml-2 text-caption text-text-muted">{t.count}</span>}
                    </button>
                ))}
            </div>

            {tab === 'assigned' && <TodoList items={assigned} courseNameById={courseNameById} />}
            {tab === 'missing' && <TodoList items={missing} courseNameById={courseNameById} />}
            {tab === 'done' && <DoneList items={doneItems} courseNameById={courseNameById} />}
        </div>
    )
}
