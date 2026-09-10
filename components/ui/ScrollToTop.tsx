"use client";

// components/ui/ScrollToTop.tsx
//
// Floating "scroll to top" button that appears after the user scrolls
// past 400px. Uses smooth scrolling and fades in/out with a transition.
// Placed in AppShell so every scrollable page gets it automatically.

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 400;

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        function handleScroll() {
            setIsVisible(window.scrollY > SCROLL_THRESHOLD);
        }

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    return (
        <button
            type="button"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className={`fixed bottom-24 lg:bottom-8 right-4 lg:right-6 z-40
                        flex items-center justify-center w-14 h-14 min-h-touch min-w-touch
                        rounded-full bg-brand text-on-ink shadow-clay-button border-b-[4px] border-brand-border
                        transition-all duration-300
                        active:translate-y-1 active:border-b-0 active:shadow-none
                        hover:bg-brand-hover hover:scale-105
                        ${isVisible
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-4 pointer-events-none"
                }`}
        >
            <ArrowUp size={22} aria-hidden="true" />
        </button>
    );
}
