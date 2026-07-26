'use client'
import { getSubmissionDownloadUrl } from '@/features/assignments/actions/submissions'

export function GradedFileDownloadLink({ submissionId }: { submissionId: string }) {
    async function handleClick() {
        const url = await getSubmissionDownloadUrl(submissionId)
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <button onClick={handleClick} className="text-caption text-text-secondary hover:underline">
            View submitted file
        </button>
    )
}