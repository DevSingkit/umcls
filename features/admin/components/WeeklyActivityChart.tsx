'use client'
// Simple bar chart showing daily logins for the past 7 days. Built for
// an admin who just needs a glance answer to "is the school using
// this," not a data analyst, so this stays as plain as possible: one
// bar per day, one number, no legend, no toggles.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DailyLoginCount } from '@/features/admin/actions/dashboard-stats'
export function WeeklyActivityChart({ data }: { data: DailyLoginCount[] }) {
    // Read the actual --brand token from CSS so the chart matches
    // the rest of the app instead of guessing a hex value. Fallback
    // updated to #128630, the current institution green (DESIGN-LMS.md
    // §2) — the old #2E7D46 was retired when the palette moved to the
    // uniform-based colors.
    const brandColor =
        typeof window !== 'undefined'
            ? getComputedStyle(document.documentElement).getPropertyValue('--brand').trim() ||
            '#128630'
            : '#128630'
    return (
        <div className="bg-surface rounded-md shadow-card p-6">
            <p className="text-label text-text-secondary mb-4">
                Logins this week
            </p>
            <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                    <BarChart data={data} margin={{ top: 8, right: 32, left: 0, bottom: 0 }}>
                        <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 13 }}
                            padding={{ left: 16, right: 16 }}
                        />
                        <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 13 }}
                            width={28}
                        />
                        <Tooltip
                            formatter={(value) => {
                                const count = typeof value === 'number' ? value : Number(value ?? 0)
                                return [`${count} login${count === 1 ? '' : 's'}`, '']
                            }}
                            labelFormatter={(label) => label}
                        />
                        <Bar dataKey="count" fill={brandColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
