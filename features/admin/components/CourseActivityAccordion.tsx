'use client'
// Client component: needs local expand/collapse state, so this can't
// stay a server component like the rest of the admin read-only pages.
// Course cards, click to expand in place and reveal that course's
// lessons/quizzes/assignments underneath — same visual language as
// the People page's course-card list, but expanding rather than
// picker-then-table-below.

import { useState } from 'react'
import { FileText, ClipboardList, HelpCircle, BookOpen, ChevronDown } from 'lucide-react'
import type { AdminCourseActivityGroup, AdminActivityItem } from '@/features/admin/actions/course-activity'

// Icon/color mapping copied verbatim from TeacherCourseStream.tsx
// (DESIGN-LMS.md §8.7a) rather than re-derived — same
// 'lesson' | 'quiz' | 'assignment' union, same keys.
const TYPE_LABEL: Record<AdminActivityItem['type'], string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment',
}

const TYPE_ICON: Record<AdminActivityItem['type'], typeof FileText> = {
    lesson: FileText,
    quiz: HelpCircle,
    assignment: ClipboardList,
}

const TYPE_ICON_BG: Record<AdminActivityItem['type'], string> = {
    lesson: 'bg-brand-soft text-brand',
    quiz: 'bg-info-soft text-info',
    assignment: 'bg-amber-soft text-amber',
}

export function CourseActivityAccordion({ courses }: { courses: AdminCourseActivityGroup[] }) {
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null)

    if (courses.length === 0) {
        return (
            <div className="rounded-md bg-surface p-10 text-center shadow-card">
                <p className="text-body-md text-ink-soft">No courses yet.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {courses.map((course) => {
                const isExpanded = expandedCourseId === course.courseId

                return (
                    <div
                        key={course.courseId}
                        className={`rounded-md shadow-card overflow-hidden ${
                            isExpanded ? 'bg-brand-soft border border-brand' : 'bg-surface'
                        }`}
                    >
                        <button
                            type="button"
                            onClick={() => setExpandedCourseId(isExpanded ? null : course.courseId)}
                            className="flex w-full items-center gap-4 p-4 text-left"
                            aria-expanded={isExpanded}
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                                <BookOpen size={20} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-body-emphasis text-ink">{course.courseTitle}</p>
                                <p className="text-caption text-text-secondary">
                                    {course.subject ? `${course.subject} · ` : ''}
                                    {course.teacherName} · {course.items.length} item
                                    {course.items.length === 1 ? '' : 's'}
                                </p>
                            </div>
                            <ChevronDown
                                size={20}
                                className={`shrink-0 text-text-secondary transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                }`}
                                aria-hidden="true"
                            />
                        </button>

                        {isExpanded && (
                            <div className="border-t border-brand-soft bg-surface px-4 pb-4">
                                {course.items.length === 0 ? (
                                    <p className="py-4 text-body-md text-text-secondary">
                                        No lessons, quizzes, or assignments in this course yet.
                                    </p>
                                ) : (
                                    <ul className="flex flex-col gap-3 pt-4">
                                        {course.items.map((item) => {
                                            const Icon = TYPE_ICON[item.type]

                                            return (
                                                <li
                                                    key={`${item.type}-${item.id}`}
                                                    className="flex items-start gap-4 rounded-md bg-surface-sunken p-3"
                                                >
                                                    <div
                                                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${TYPE_ICON_BG[item.type]}`}
                                                        aria-hidden="true"
                                                    >
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-caption font-semibold text-text-secondary">
                                                            {TYPE_LABEL[item.type]}
                                                        </p>
                                                        <p className="truncate text-body-md text-ink">{item.title}</p>
                                                        {item.type === 'assignment' && item.dueAt && (
                                                            <p className="text-caption text-text-secondary">
                                                                Due {new Date(item.dueAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                        <p className="text-caption text-text-secondary">
                                                            Updated {new Date(item.updatedAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    {!item.isPublished && (
                                                        <span className="shrink-0 inline-flex items-center rounded-pill bg-amber-soft text-amber text-caption font-semibold px-3 py-1 whitespace-nowrap">
                                                            Not posted
                                                        </span>
                                                    )}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
