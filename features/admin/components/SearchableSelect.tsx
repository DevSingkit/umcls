'use client'
// features/admin/components/SearchableSelect.tsx
//
// Type-to-filter, click-to-select combobox, replacing plain <select>
// dropdowns in CourseReassignment.tsx and EnrollForm.tsx (both had
// long lists — courses, teachers, students — with no way to search).
//
// Submits the same way a native <select> would: a hidden
// <input type="hidden" name={name} value={selectedId} /> carries the
// actual id into the surrounding <form>'s FormData, same as before.
// The visible text input is purely for searching/display, it never
// submits its own value.

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type SearchableSelectOption = {
    id: string
    label: string
    sublabel?: string
}

export function SearchableSelect({
    name,
    options,
    placeholder,
    required,
    disabled,
}: {
    name: string
    options: SearchableSelectOption[]
    placeholder: string
    required?: boolean
    disabled?: boolean
}) {
    const [query, setQuery] = useState('')
    const [selectedId, setSelectedId] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const listboxId = useId()

    const selectedOption = options.find((o) => o.id === selectedId)

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options
        return options.filter(
            (o) =>
                o.label.toLowerCase().includes(q) ||
                (o.sublabel ? o.sublabel.toLowerCase().includes(q) : false)
        )
    }, [query, options])

    // Close the list when clicking anywhere outside this component.
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function selectOption(option: SearchableSelectOption) {
        setSelectedId(option.id)
        setQuery(option.label)
        setIsOpen(false)
    }

    function handleInputChange(value: string) {
        setQuery(value)
        setIsOpen(true)
        setHighlightedIndex(0)
        // Typing after having picked something invalidates that pick —
        // don't silently submit a stale id that no longer matches what's
        // shown in the box.
        if (selectedId) setSelectedId('')
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setIsOpen(true)
            return
        }
        if (!isOpen) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightedIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const option = filtered[highlightedIndex]
            if (option) selectOption(option)
        } else if (e.key === 'Escape') {
            setIsOpen(false)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            {/* Carries the real value into the surrounding form's
                FormData under the original field name — everything
                downstream (the server action) reads this exactly like
                it read the old <select>'s value. */}
            <input type="hidden" name={name} value={selectedId} required={required} />

            <div className="relative">
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    disabled={disabled}
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="w-full h-11 px-5 pr-11 rounded-md border border-hairline-strong bg-surface focus:border-[1.5px] focus:border-brand outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                />
            </div>

            {isOpen && !disabled && (
                <ul
                    id={listboxId}
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-hairline-strong bg-surface shadow-card-hover"
                >
                    {filtered.length === 0 ? (
                        <li className="px-5 py-3 text-caption text-text-secondary">
                            No matches found.
                        </li>
                    ) : (
                        filtered.map((option, index) => (
                            <li
                                key={option.id}
                                role="option"
                                aria-selected={option.id === selectedId}
                                onMouseDown={(e) => {
                                    // mousedown, not click — fires before
                                    // the input's onBlur/outside-click
                                    // handler would otherwise close the
                                    // list first and swallow the click.
                                    e.preventDefault()
                                    selectOption(option)
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`cursor-pointer px-5 py-3 text-body-md ${
                                    index === highlightedIndex ? 'bg-brand-soft' : ''
                                } ${option.id === selectedId ? 'text-brand font-medium' : 'text-ink'}`}
                            >
                                {option.label}
                                {option.sublabel && (
                                    <span className="text-caption text-text-secondary">
                                        {' '}
                                        ({option.sublabel})
                                    </span>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            )}

            {/* Native required-field validation can't attach to a
                hidden input reliably across browsers — this visible,
                non-interactive proxy gives the same "please fill this
                field" prompt if submitted empty, anchored right under
                the visible text input. */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute h-0 w-0 opacity-0"
                    value={selectedId}
                    required
                    onChange={() => {}}
                />
            )}
        </div>
    )
}
