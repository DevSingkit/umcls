// features/dashboard/components/StatCard.tsx
// One of 2-4 stat cards at the top of a dashboard (§8.2). Plain number,
// plain label, no jargon.

type StatCardProps = {
    label: string
    value: number
}

export function StatCard({ label, value }: StatCardProps) {
    return (
        <div className="bg-surface rounded-md shadow-card p-6">
            <p className="text-data-lg text-ink">{value}</p>
            <p className="text-body-md text-text-secondary mt-1">{label}</p>
        </div>
    )
}
