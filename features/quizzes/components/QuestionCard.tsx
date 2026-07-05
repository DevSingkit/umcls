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
// its options underneath rendered via OptionBullet. Extracted from
// QuizEditPage so the per-question card markup lives in one place.
export function QuestionCard({ question, index }: { question: Question; index: number }) {
    return (
        <div className="bg-white rounded-hero shadow-card-lift p-6 border-l-4 border-ink">
            <div className="flex items-center justify-between mb-3">
                <p className="text-caption-md text-graphite">Question {index + 1}</p>
                <span className="text-caption-sm uppercase tracking-wide text-graphite bg-hairline/40 rounded-full px-3 py-1">
                    {QUESTION_TYPE_LABEL[question.question_type] ?? question.question_type}
                </span>
            </div>

            <p className="text-body-md text-ink font-medium mb-4">{question.question_text}</p>

            <div className="space-y-2">
                {question.answer_options.map((option) => (
                    <OptionBullet key={option.id} text={option.option_text} isCorrect={option.is_correct} />
                ))}
            </div>
        </div>
    )
}