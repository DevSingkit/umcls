"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ROLE_DASHBOARD, type Role } from "@/lib/navigation/nav-items";

interface SidebarProps {
  role: Role;
  // fullName / avatarUrl kept for API compatibility with AppShell's call
  // site — no longer rendered here now that the account menu lives in
  // TopNav.
  fullName: string;
  avatarUrl: string | null;
}

const PIN_STORAGE_KEY = "umclsi-sidebar-pinned";

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(PIN_STORAGE_KEY);
    if (stored === "true") setIsPinned(true);
  }, []);

  function togglePin() {
    setIsPinned((prev) => {
      const next = !prev;
      window.localStorage.setItem(PIN_STORAGE_KEY, String(next));
      return next;
    });
  }

  const isExpanded = isPinned || isHovering;

  return (
    <aside
      aria-label="Main navigation"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:flex-col lg:bg-sidebar border-r border-white/10",
        "transition-[width] duration-200 ease-out",
        isExpanded ? "lg:w-[240px] lg:shadow-xl" : "lg:w-[72px]"
      )}
    >
      {/* Header / Logo */}
      <div className="flex h-16 items-center px-5 shrink-0 border-b border-white/10">
        <Link
          href={ROLE_DASHBOARD[role]}
          className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <Image
            src="/logo.webp"
            alt="UMCLSI Logo"
            width={32}
            height={32}
            className="shrink-0 rounded-md object-contain"
          />
          {isExpanded && (
            <span className="font-heading text-body-md font-bold text-on-ink whitespace-nowrap truncate">
              UMCLSI
            </span>
          )}
        </Link>
      </div>

      {/* Pin / Expand Action */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={togglePin}
          aria-pressed={isPinned}
          aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          className={cn(
            "flex min-h-touch w-full items-center gap-3 rounded-md text-on-ink/70 hover:bg-white/10 hover:text-on-ink transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            isPinned && "bg-white/10 text-on-ink font-medium",
            !isExpanded && "justify-center px-0"
          )}
        >
          <Menu size={20} aria-hidden="true" className="shrink-0" />
          {isExpanded && (
            <span className="text-caption whitespace-nowrap">
              {isPinned ? "Pinned" : "Pin Menu"}
            </span>
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive = item.isActive
            ? item.isActive(pathname)
            : pathname === item.href || (item.isV1 && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={isExpanded ? undefined : item.label}
              className={cn(
                "flex min-h-touch items-center gap-3 rounded-md text-body-md text-on-ink/80 transition-colors overflow-hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                isActive
                  ? "bg-brand font-semibold text-white shadow-sm"
                  : "hover:bg-white/10 hover:text-on-ink",
                isExpanded ? "px-3" : "justify-center px-0"
              )}
            >
              <Icon size={20} aria-hidden="true" className="shrink-0" />
              {isExpanded && (
                <span className="truncate whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer, Settings, and Sign out moved to TopNav's avatar
          menu — kept out of the sidebar to avoid duplicating the same
          actions in two places. */}
    </aside>
  );
}