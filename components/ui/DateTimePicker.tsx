'use client'
// components/ui/DateTimePicker.tsx
//
// Replaces the native <input type="datetime-local"> / separate
// <input type="date"> + <input type="time">, which several forms used
// directly — teachers found typing digits and toggling AM/PM by hand
// error-prone. This is a click-based calendar for the date and simple
// hour/minute/AM-PM dropdowns for the time, so nothing needs to be
// typed at all.
//
// Contract: value/onChange both use the exact same naive
// "YYYY-MM-DDTHH:mm" string every form using this already works with
// (e.g. `new Date(value)` parses it as LOCAL time, then
// `.toISOString()` converts to a real UTC instant before it reaches
// the server — same bug-fixed pattern already documented in
// NewAssignmentForm.tsx/EditAssignmentForm.tsx). This component does
// not change that timezone handling at all, it only changes how the
// person builds that string — by clicking, not typing.

import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number) {
    return String(n).padStart(2, '0')
}

// Parses this component's naive "YYYY-MM-DDTHH:mm" value format into
// its parts, defaulting to "now" only for driving the calendar's
// initial visible month — an empty value never implies a selected date.
function parseValue(value: string): { date: Date | null; hour24: number; minute: number } {
    if (!value) return { date: null, hour24: 23, minute: 59 }
    const [datePart, timePart] = value.split('T')
    const [y, m, d] = (datePart ?? '').split('-').map(Number)
    const [h, min] = (timePart ?? '23:59').split(':').map(Number)
    if (!y || !m || !d) return { date: null, hour24: 23, minute: 59 }
    return { date: new Date(y, m - 1, d), hour24: h ?? 23, minute: min ?? 59 }
}

function toValue(date: Date, hour24: number, minute: number): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour24)}:${pad(minute)}`
}

function to12Hour(hour24: number): { hour12: number; period: 'AM' | 'PM' } {
    const period = hour24 >= 12 ? 'PM' : 'AM'
    let hour12 = hour24 % 12
    if (hour12 === 0) hour12 = 12
    return { hour12, period }
}

function to24Hour(hour12: number, period: 'AM' | 'PM'): number {
    if (period === 'AM') return hour12 === 12 ? 0 : hour12
    return hour12 === 12 ? 12 : hour12 + 12
}

function formatDisplayDate(date: Date | null): string {
    if (!date) return 'Choose a date'
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDisplayTime(hour24: number, minute: number): string {
    const { hour12, period } = to12Hour(hour24)
    return `${hour12}:${pad(minute)} ${period}`
}

export function DateTimePicker({
    id,
    value,
    onChange,
    placeholder = 'No date set',
}: {
    id?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}) {
    const { date: selectedDate, hour24, minute } = parseValue(value)
    const [isOpen, setIsOpen] = useState(false)
    const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date())
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Keep the visible month in sync if the value changes from outside
    // (e.g. a "Clear" button elsewhere, or switching between editing
    // different quizzes on the same mounted form).
    useEffect(() => {
        if (selectedDate) setVisibleMonth(selectedDate)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    function commitDate(day: Date) {
        onChange(toValue(day, hour24, minute))
    }

    function commitHour12(hour12: number) {
        const { period } = to12Hour(hour24)
        const base = selectedDate ?? visibleMonth
        onChange(toValue(base, to24Hour(hour12, period), minute))
    }

    function commitMinute(newMinute: number) {
        const base = selectedDate ?? visibleMonth
        onChange(toValue(base, hour24, newMinute))
    }

    function commitPeriod(period: 'AM' | 'PM') {
        const { hour12 } = to12Hour(hour24)
        const base = selectedDate ?? visibleMonth
        onChange(toValue(base, to24Hour(hour12, period), minute))
    }

    const { hour12, period } = to12Hour(hour24)

    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
    const leadingBlanks = firstOfMonth.getDay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
        <div ref={containerRef} className="relative inline-block">
            <button
                id={id}
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                className={cn(
                    'flex h-11 items-center gap-2 px-4 rounded-md border-[1.5px] border-hairline-strong bg-surface text-body-md',
                    'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30',
                    selectedDate ? 'text-ink' : 'text-text-muted'
                )}
            >
                <Calendar className="h-4 w-4 text-text-secondary shrink-0" aria-hidden="true" />
                {selectedDate ? (
                    <span>
                        {formatDisplayDate(selectedDate)} · {formatDisplayTime(hour24, minute)}
                    </span>
                ) : (
                    <span>{placeholder}</span>
                )}
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    className="absolute left-0 z-30 mt-2 w-[320px] rounded-md border border-hairline bg-surface p-4 shadow-modal"
                >
                    <div className="flex items-center justify-between mb-3">
                        <button
                            type="button"
                            aria-label="Previous month"
                            onClick={() =>
                                setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-sunken text-ink"
                        >
                            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <p className="text-body-emphasis text-ink">
                            {MONTH_LABELS[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
                        </p>
                        <button
                            type="button"
                            aria-label="Next month"
                            onClick={() =>
                                setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-sunken text-ink"
                        >
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-1">
                        {WEEKDAY_LABELS.map((w, i) => (
                            <div key={i} className="h-8 flex items-center justify-center text-caption text-text-secondary font-medium">
                                {w}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 mb-4">
                        {Array.from({ length: leadingBlanks }).map((_, i) => (
                            <div key={`blank-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const thisDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day)
                            const isSelected =
                                selectedDate &&
                                selectedDate.getFullYear() === thisDate.getFullYear() &&
                                selectedDate.getMonth() === thisDate.getMonth() &&
                                selectedDate.getDate() === thisDate.getDate()
                            const isPast = thisDate < today
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => commitDate(thisDate)}
                                    className={cn(
                                        'h-8 rounded-md text-caption font-medium transition-colors',
                                        isSelected
                                            ? 'bg-brand text-on-ink'
                                            : isPast
                                              ? 'text-text-muted hover:bg-surface-sunken'
                                              : 'text-ink hover:bg-surface-sunken'
                                    )}
                                >
                                    {day}
                                </button>
                            )
                        })}
                    </div>

                    <div className="border-t border-hairline pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                            <span className="text-label text-ink-soft">Time</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                aria-label="Hour"
                                value={hour12}
                                onChange={(e) => commitHour12(Number(e.target.value))}
                                className="h-10 px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                                    <option key={h} value={h}>
                                        {h}
                                    </option>
                                ))}
                            </select>
                            <span className="text-body-md text-text-secondary">:</span>
                            <select
                                aria-label="Minute"
                                value={minute}
                                onChange={(e) => commitMinute(Number(e.target.value))}
                                className="h-10 px-3 rounded-md border-[1.5px] border-hairline-strong text-body-md text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                            >
                                {Array.from(
                                    new Set([...Array.from({ length: 12 }, (_, i) => i * 5), minute])
                                )
                                    .sort((a, b) => a - b)
                                    .map((m) => (
                                        <option key={m} value={m}>
                                            {pad(m)}
                                        </option>
                                    ))}
                            </select>
                            <div className="flex rounded-md border-[1.5px] border-hairline-strong overflow-hidden shrink-0">
                                <button
                                    type="button"
                                    onClick={() => commitPeriod('AM')}
                                    className={cn(
                                        'h-10 px-3 text-caption font-semibold transition-colors',
                                        period === 'AM' ? 'bg-brand text-on-ink' : 'bg-surface text-ink hover:bg-surface-sunken'
                                    )}
                                >
                                    AM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => commitPeriod('PM')}
                                    className={cn(
                                        'h-10 px-3 text-caption font-semibold transition-colors',
                                        period === 'PM' ? 'bg-brand text-on-ink' : 'bg-surface text-ink hover:bg-surface-sunken'
                                    )}
                                >
                                    PM
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-hairline mt-4 pt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="h-9 px-4 rounded-md bg-brand text-on-ink text-caption font-semibold hover:bg-brand-hover"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
