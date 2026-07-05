// Read-only display of a single answer option, Google Forms-style:
// a bullet (filled + checked if correct, outlined otherwise) plus the
// option text. Used inside QuestionCard when rendering saved questions.
// This is a *display* bullet only — the clickable "mark as correct"
// bullet in AddQuestionForm is a separate, still-editable control and
// intentionally does not use this component.
export function OptionBullet({
    text,
    isCorrect,
}: {
    text: string
    isCorrect: boolean
}) {
    return (
        <div
            className={`flex items-center gap-3 rounded-button px-4 py-2.5 border ${isCorrect ? 'border-success bg-success/5' : 'border-hairline'
                }`}
        >
            <span
                className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${isCorrect ? 'border-success bg-success text-white' : 'border-hairline'
                    }`}
            >
                {isCorrect && (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path
                            fillRule="evenodd"
                            d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                )}
            </span>
            <span className={`text-body-md ${isCorrect ? 'text-ink font-medium' : 'text-graphite'}`}>
                {text}
            </span>
            {isCorrect && (
                <span className="ml-auto text-caption-sm text-success uppercase tracking-wide">
                    Correct answer
                </span>
            )}
        </div>
    )
}