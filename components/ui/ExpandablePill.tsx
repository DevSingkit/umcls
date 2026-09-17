"use client";

import React, { useState, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ExpandablePillProps {
  /** Leading icon component or element (e.g. ClipboardList, HelpCircle) */
  icon?: React.ReactNode;
  /** Background tone for the circular icon container (defaults to 'bg-surface-sunken text-ink') */
  iconClassName?: string;
  /** Primary title of the task or item */
  title: React.ReactNode;
  /** Optional source course or subject tag (e.g., 'Grade 4 Science') */
  courseBadge?: React.ReactNode;
  /** Optional status pill or chip (e.g. 'Draft', 'Mastered', 'Due tomorrow') */
  statusBadge?: React.ReactNode;
  /** Trailing metadata timestamp or due date string */
  metadata?: React.ReactNode;
  /** Children rendered inside the expandable disclosure drawer */
  children?: React.ReactNode;
  /** Optional bottom action footer slot (e.g., "Grade" button, "Open assignment") */
  actions?: React.ReactNode;
  /** Controlled open state */
  isOpen?: boolean;
  /** Default open state for uncontrolled usage */
  defaultOpen?: boolean;
  /** Callback fired on toggle */
  onToggle?: (open: boolean) => void;
  /** Container className override */
  className?: string;
  /** Header row className override */
  headerClassName?: string;
  /** Expanded content drawer className override */
  contentClassName?: string;
}

/**
 * ExpandablePill
 * 
 * Modeled directly on Google Classroom's feed rows, strictly scoped
 * for student and teacher dashboard task lists. Clicking the resting
 * row smoothly toggles the disclosure drawer inline within the card.
 */
export function ExpandablePill({
  icon,
  iconClassName,
  title,
  courseBadge,
  statusBadge,
  metadata,
  children,
  actions,
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onToggle,
  className,
  headerClassName,
  contentClassName,
}: ExpandablePillProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalIsOpen;

  const contentId = useId();

  function toggle() {
    const nextState = !open;
    if (!isControlled) {
      setInternalIsOpen(nextState);
    }
    onToggle?.(nextState);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border border-hairline bg-surface transition-all duration-150 overflow-hidden",
        open ? "shadow-card-hover border-hairline-strong" : "shadow-sm hover:shadow-card hover:border-hairline-strong",
        className
      )}
    >
      {/* Resting Header Row (Clickable Pill) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex min-h-touch items-center gap-3.5 px-4 py-3 sm:px-5 sm:py-3.5 cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
          open ? "bg-surface-sunken/30 border-b border-hairline/60" : "hover:bg-surface-sunken/20",
          headerClassName
        )}
      >
        {/* Leading Icon Avatar */}
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-ink transition-transform",
              iconClassName || "bg-surface-sunken"
            )}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}

        {/* Title and Badges */}
        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
          <span className="font-sans text-body-emphasis text-ink leading-tight truncate">
            {title}
          </span>

          {courseBadge && (
            <span className="shrink-0 inline-flex items-center rounded-pill bg-surface-sunken px-2.5 py-0.5 text-caption font-semibold text-ink-soft">
              {courseBadge}
            </span>
          )}

          {statusBadge && (
            <span className="shrink-0 inline-flex items-center">
              {statusBadge}
            </span>
          )}
        </div>

        {/* Trailing Metadata & Chevron */}
        <div className="flex shrink-0 items-center gap-3">
          {metadata && (
            <span className="font-sans text-caption text-text-secondary whitespace-nowrap">
              {metadata}
            </span>
          )}

          <ChevronDown
            size={18}
            className={cn(
              "text-ink-muted transition-transform duration-200 ease-out",
              open ? "rotate-180 text-brand" : "group-hover:text-ink"
            )}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Expandable Disclosure Drawer */}
      {open && (
        <div
          id={contentId}
          className={cn(
            "px-5 py-4 sm:px-6 sm:py-5 space-y-4 bg-surface animate-fadeIn",
            contentClassName
          )}
        >
          {children && (
            <div className="font-sans text-body-md text-ink space-y-2 leading-relaxed">
              {children}
            </div>
          )}

          {actions && (
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-hairline/60">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
