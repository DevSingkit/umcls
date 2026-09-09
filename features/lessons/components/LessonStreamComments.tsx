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
        <div className="mt-3 pl-[60px]">
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary hover:text-ink"
            >
                <MessageCircle size={16} aria-hidden="true" />
                {comments.length === 0 ? 'Add class comment' : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
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
