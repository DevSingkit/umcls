import React from "react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  /** Main section title rendered within the encapsulated card */
  title: React.ReactNode;
  /** Optional badge or counter displayed next to the title */
  badge?: React.ReactNode;
  /** Optional descriptive subtitle below the title */
  subtitle?: React.ReactNode;
  /** Optional right-aligned action elements (e.g., "+ Create class", "View all") */
  action?: React.ReactNode;
  /** Content rendered inside the card */
  children: React.ReactNode;
  /** Root container className override */
  className?: string;
  /** Header container className override */
  headerClassName?: string;
  /** Body container className override */
  bodyClassName?: string;
  /** Optional HTML id */
  id?: string;
  /** Semantic container element (defaults to 'section') */
  as?: "section" | "div";
}

/**
 * SectionCard
 * 
 * Encapsulates a section's title, actions, and contents directly within
 * a unified card container (Card → Title + Actions → Contents), strictly
 * enforcing "The Encapsulated Card Rule" and banning orphan headings on the bare canvas.
 */
export function SectionCard({
  title,
  badge,
  subtitle,
  action,
  children,
  className,
  headerClassName,
  bodyClassName,
  id,
  as: Component = "section",
}: SectionCardProps) {
  const hasHeaderContent = Boolean(title || badge || subtitle || action);

  return (
    <Component
      id={id}
      className={cn(
        "rounded-md bg-surface shadow-card border border-hairline/80 overflow-hidden",
        className
      )}
    >
      {hasHeaderContent && (
        <div
          className={cn(
            "px-6 py-5 sm:px-8 sm:py-6 flex flex-col gap-1.5 border-b border-hairline/70",
            headerClassName
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 className="font-sans text-h2 font-bold text-ink tracking-tight truncate">
                {title}
              </h2>
              {badge && (
                <div className="shrink-0 inline-flex items-center">
                  {typeof badge === "string" || typeof badge === "number" ? (
                    <span className="inline-flex items-center rounded-pill bg-surface-sunken px-2.5 py-0.5 text-caption font-semibold text-ink-soft">
                      {badge}
                    </span>
                  ) : (
                    badge
                  )}
                </div>
              )}
            </div>

            {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
          </div>

          {subtitle && (
            <p className="font-sans text-caption text-text-secondary leading-normal">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className={cn("p-6 sm:p-8", bodyClassName)}>{children}</div>
    </Component>
  );
}
