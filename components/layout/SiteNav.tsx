// components/layout/SiteNav.tsx

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/about", label: "About Us" },
  { href: "/our-story", label: "Our Story" },
  { href: "/academics", label: "Academics" },
  { href: "/admissions", label: "Admissions" },
  { href: "/contact", label: "Contact" },
];

const loginLink = { href: "/login", label: "Log in" };

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-sidebar px-4 sm:px-8 border-b-2 border-black/10 shadow-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between py-4 sm:py-5">
        {/* Brand Identity */}
        <Link 
          href="/" 
          className="inline-flex min-h-[56px] min-w-0 items-center gap-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-surface shadow-sm">
            <Image
              src="/logo.webp"
              alt="UMCLSI LMS"
              width={112}
              height={112}
              className="h-10 w-10 object-contain"
            />
          </span>
          <span className="truncate text-body-lg font-bold leading-tight text-on-ink sm:whitespace-normal sm:text-body-md sm:font-semibold">
            <span className="sm:hidden">UMCLSI</span>
            <span className="hidden sm:block">
              United Methodist Cooperative Learning System, Inc.
            </span>
          </span>
        </Link>

        {/* Desktop Links & CTA */}
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-lg font-semibold text-on-ink/90 transition-colors hover:text-on-ink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={loginLink.href}
            className="inline-flex h-13 items-center justify-center rounded-xl bg-brand px-7 text-body-lg font-bold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {loginLink.label}
          </Link>
        </nav>

        {/* Mobile Menu Trigger (56px Touch Target) */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-on-ink md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </div>

      {/* Mobile Drawer Panel */}
      {open && (
        <nav className="border-t border-white/10 pb-6 md:hidden">
          <ul className="mx-auto max-w-[1280px] px-4 pt-3 space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[52px] items-center text-body-lg font-semibold text-on-ink/90 rounded-xl px-3 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-3 border-t border-white/10 mt-2">
              <Link
                href={loginLink.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[56px] items-center justify-center rounded-xl bg-brand text-body-lg font-bold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {loginLink.label}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}