import { OptionBullet } from '@/features/quizzes/components/OptionBullet'

const QUESTION_TYPE_LABEL: Record<string, string> = {
    multiple_choice_single: 'Multiple choice',
    true_false: 'True / False',
}

type AnswerOption = {
    id: string
    option_text: string
    is_correct: boolean
}

type Question = {
    id: string
    question_text: string
    question_type: string
    answer_options: AnswerOption[]
}

// A single saved question, Google Forms-style: question text up top,
// its options underneath rendered via OptionBullet.
export function QuestionCard({ question, index }: { question: Question; index: number }) {
    return (
        <div className="bg-surface rounded-md border border-hairline shadow-card p-6 border-l-4 border-l-brand">
            <div className="flex items-center justify-between mb-3">
                <p className="text-caption text-text-secondary">Question {index + 1}</p>
                <span className="text-caption font-semibold text-text-secondary bg-surface-sunken rounded-pill px-3 py-1">
                    {QUESTION_TYPE_LABEL[question.question_type] ?? question.question_type}
                </span>
            </div>

            <p className="text-body-emphasis text-ink mb-4">{question.question_text}</p>

            <div className="space-y-2">
                {question.answer_options.map((option) => (
                    <OptionBullet key={option.id} text={option.option_text} isCorrect={option.is_correct} />
                ))}
            </div>
        </div>
    )
}
