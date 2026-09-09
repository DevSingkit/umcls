import Link from 'next/link'
import { Plus, Gamepad2 } from 'lucide-react'
import type { TeacherStreamItem, TeacherStreamContentItem } from '@/features/courses/actions/get-teacher-course-stream'
import { StreamItemMenu } from '@/features/courses/components/StreamItemMenu'
import { AnnouncementCard } from '@/features/courses/components/AnnouncementCard'
import { MaterialList } from '@/features/materials/components/MaterialList'
import { LessonStreamComments } from '@/features/lessons/components/LessonStreamComments'
import { Avatar } from '@/components/ui/Avatar'
import { getCurrentUser } from '@/lib/auth/get-current-user'

const TYPE_LABEL: Record<TeacherStreamContentItem['type'], string> = {
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment',
}

function itemHref(courseId: string, item: TeacherStreamContentItem) {
    switch (item.type) {
        case 'lesson':
            return `/teacher/courses/${courseId}/lessons/${item.id}`
        case 'quiz':
            return `/teacher/courses/${courseId}/quizzes/${item.id}/edit`
        case 'assignment':
            return `/teacher/courses/${courseId}/assignments/${item.id}`
    }
}

// Separate from itemHref (which the title links to — a view/detail
// page for lessons and assignments). This is what the ⋮ menu's Edit
// item links to — a dedicated edit form, distinct from the view page.
function editHref(courseId: string, item: TeacherStreamContentItem) {
    switch (item.type) {
        case 'lesson':
            return `/teacher/courses/${courseId}/lessons/${item.id}/edit`
        case 'quiz':
            return `/teacher/courses/${courseId}/quizzes/${item.id}/edit`
        case 'assignment':
            return `/teacher/courses/${courseId}/assignments/${item.id}/edit`
    }
}

// DESIGN-LMS 2.1 pass (2026-09-06): removed literal "+" glyph prefix
// from the empty-state "Create Lesson" CTA, replaced with lucide-react's
// Plus icon (already imported for the empty-state badge above it) for
// consistent SVG iconography per §1.3. Bumped from h-12 to h-14 to
// match the app-wide h-14 primary-CTA standard used elsewhere in this
// cluster.
export async function TeacherCourseStream({
    courseId,
    items,
}: {
    courseId: string
    items: TeacherStreamItem[]
}) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-md bg-surface p-10 text-center shadow-card">
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                    <Plus size={28} className="text-brand" aria-hidden="true" />
                </div>
                <p className="text-body-md text-ink-soft">
                    No lessons, quizzes, or assignments here yet.
                </p>
                <Link
                    href={`/teacher/courses/${courseId}/lessons/new`}
                    className="flex h-14 items-center gap-2 rounded-md bg-brand px-6 text-body-md font-semibold text-on-ink hover:bg-brand-hover"
                >
                    <Plus size={18} aria-hidden="true" />
                    Create Lesson
                </Link>
            </div>
        )
    }

    const user = await getCurrentUser()

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-3">
                {items.map((item) => {
                    if (item.type === 'announcement') {
                        return (
                            <li key={`announcement-${item.id}`}>
                                <AnnouncementCard
                                    announcement={item}
                                    currentUserId={user?.id ?? ''}
                                    isTeacher={true}
                                />
                            </li>
                        )
                    }

                    return (
                        <li
                            key={`${item.type}-${item.id}`}
                            className="rounded-md bg-surface p-4 shadow-card hover:shadow-card-hover"
                        >
                            <div className="flex items-start gap-4">
                                <Avatar fullName={item.authorName} avatarUrl={item.authorAvatarUrl} size="md" />

                                <div className="min-w-0 flex-1">
                                    <p className="text-body-emphasis text-ink truncate">{item.authorName}</p>
                                    <p className="text-caption font-semibold text-text-secondary">
                                        {TYPE_LABEL[item.type]} ·{' '}
                                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </p>
                                    <Link
                                        href={itemHref(courseId, item)}
                                        className="block truncate text-body-md font-semibold text-ink hover:underline mt-1"
                                    >
                                        {item.title}
                                    </Link>
                                    {item.type === 'assignment' && item.dueAt && (
                                        <p className="text-caption text-text-secondary">
                                            Due {new Date(item.dueAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                    {!!item.ungradedCount && item.ungradedCount > 0 && (
                                        <span className="inline-flex items-center rounded-pill bg-info-soft text-info text-caption font-semibold px-3 py-1 whitespace-nowrap">
                                            {item.ungradedCount} to grade
                                        </span>
                                    )}
                                    {item.type !== 'lesson' && !item.isPublished && (
                                        <span className="inline-flex items-center rounded-pill bg-warning-soft text-warning text-caption font-semibold px-3 py-1 whitespace-nowrap">
                                            Not posted
                                        </span>
                                    )}
                                    <StreamItemMenu
                                        type={item.type}
                                        itemId={item.id}
                                        itemTitle={item.title}
                                        editHref={editHref(courseId, item)}
                                    />
                                </div>
                            </div>

                            {/* Lesson-only inline preview — description +
                                attachments, same as the student side, so a
                                teacher can review a lesson's content without
                                leaving the stream. Quizzes/assignments have
                                no equivalent "body" to preview this way. */}
                            {item.type === 'lesson' && item.description && (
                                <p className="text-body-md text-ink-soft whitespace-pre-wrap mt-3 pl-[60px]">
                                    {item.description}
                                </p>
                            )}
                            {item.type === 'lesson' && item.materials && item.materials.length > 0 && (
                                <div className="mt-3 pl-[60px]">
                                    <MaterialList materials={item.materials} />
                                </div>
                            )}
                            {item.type === 'lesson' && (
                                <div className="mt-3 pl-[60px] flex items-center justify-between gap-3 rounded-md bg-surface-sunken px-4 py-3">
                                    <p className="flex items-center gap-2 text-caption font-semibold text-text-secondary">
                                        <Gamepad2 size={16} aria-hidden="true" />
                                        {(item.missionsCount ?? 0) === 0
                                            ? 'No missions yet'
                                            : `${item.missionsCount} mission${item.missionsCount === 1 ? '' : 's'} · ${item.publishedMissionsCount} published`}
                                    </p>
                                    <Link
                                        href={`/teacher/courses/${courseId}/lessons/${item.id}/missions/new`}
                                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover transition-colors"
                                    >
                                        <Plus size={14} aria-hidden="true" />
                                        Add mission
                                    </Link>
                                </div>
                            )}
                            {item.type === 'lesson' && (
                                <LessonStreamComments
                                    lessonId={item.id}
                                    comments={item.comments ?? []}
                                    currentUserId={user?.id ?? ''}
                                    isTeacher={true}
                                />
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
