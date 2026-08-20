"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Desktop-only back navigation, rendered once in AppShell so every
 * (dashboard) page gets it automatically. Hidden below lg — on mobile
 * the phone's own back gesture/button already covers this, so a
 * second on-screen back control would just be redundant.
 */
export function BackButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.back()}
            className="hidden lg:inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-caption font-medium text-text-secondary hover:bg-surface-sunken hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
            <ArrowLeft size={16} aria-hidden="true" />
            Back
        </button>
    );
}