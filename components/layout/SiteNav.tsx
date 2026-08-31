// components/layout/SiteNav.tsx
//
// Shared nav for the public marketing pages (Home, About, Our Story,
// Contact, Admissions, Academics). Mobile-first: a hamburger menu that
// opens a full-width panel on small screens, and a plain horizontal
// link row from md: up. Reuses the same logo treatment already in
// app/page.tsx's header so all pages look like one site.

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
    <header className="sticky top-0 z-40 bg-sidebar px-4 sm:px-6">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between py-3">
        <Link href="/" className="inline-flex min-h-[44px] min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface">
            <Image
              src="/logo.webp"
              alt="UMCLSI LMS"
              width={112}
              height={112}
              className="h-7 w-7 object-contain"
            />
          </span>
          <span className="truncate text-body-md font-semibold leading-tight text-on-ink sm:whitespace-normal sm:text-caption sm:font-medium">
            <span className="sm:hidden">UMCLSI</span>
            <span className="hidden sm:block">
              United Methodist Cooperative Learning System, Inc.
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-body-md font-medium text-on-ink/85 transition-colors hover:text-on-ink"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={loginLink.href}
            className="inline-flex h-10 items-center rounded-md bg-surface px-5 text-body-md font-semibold text-ink transition-colors hover:bg-surface-sunken"
          >
            {loginLink.label}
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-on-ink md:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <nav className="border-t border-white/10 pb-4 md:hidden">
          <ul className="mx-auto max-w-[1200px] px-4 pt-2 sm:px-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center text-body-md font-medium text-on-ink/90"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href={loginLink.href}
                onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center justify-center rounded-md bg-surface text-body-md font-semibold text-ink"
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
