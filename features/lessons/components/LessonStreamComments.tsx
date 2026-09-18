'use client'
// features/lessons/components/LessonStreamComments.tsx
//
// Inline comment thread for a lesson's stream card — same
// expand/collapse pattern AnnouncementCard.tsx already uses for
// announcement comments, wrapping the existing CommentsTab.tsx
// (unchanged) rather than building a second comment UI. Comments are
// preloaded via get-course-stream.ts / get-teacher-course-stream.ts's
// batched listLessonCommentsForLessons call, same "fetched eagerly,
// not on-expand" convention CommentsTab and AnnouncementCard already
// follow — this component only toggles visibility, it never fetches.

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { CommentsTab } from '@/features/lessons/components/CommentsTab'
import type { LessonComment } from '@/features/lessons/actions/lesson-comments'

export function LessonStreamComments({
    lessonId,
    comments,
    currentUserId,
    isTeacher,
}: {
    lessonId: string
    comments: LessonComment[]
    currentUserId: string
    isTeacher: boolean
}) {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="mt-3 pl-[5px]">
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary hover:text-ink rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
            >
                <MessageCircle size={14} aria-hidden="true" />
                {comments.length === 0 ? 'Add comment' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
            </button>

            {isExpanded && (
                <div className="mt-3">
                    <CommentsTab
                        lessonId={lessonId}
                        comments={comments}
                        currentUserId={currentUserId}
                        isTeacher={isTeacher}
                    />
                </div>
            )}
        </div>
    )
}
