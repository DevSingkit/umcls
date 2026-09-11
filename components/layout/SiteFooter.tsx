// components/layout/SiteFooter.tsx
//
// Same footer as app/page.tsx, pulled out so every marketing page
// shares one copy instead of five duplicates.
//
// DESIGN-LMS 2.1 fact-correction pass (2026-09-06): the phone number,
// email, and street address here were placeholder/made-up values from
// an earlier pass, not verified school info. Replaced with the
// school's actual contact details:
//   0994 584 9446 / umcls20educ@gmail.com /
//   847 Sampaguita Street, Tala, Caloocan City, Metro Manila
// Only one verified social channel exists (Facebook) — left as-is.

import Image from "next/image";
import Link from "next/link";
import { Phone, MapPin, ArrowUpRight, Mail, Clock } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-on-ink">
      <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Image
              src="/logo.webp"
              alt="UMCLSI LMS"
              width={100}
              height={30}
              className="h-8 w-auto object-contain"
            />
            <p className="mt-3 text-caption text-on-ink/70">
              United Methodist Cooperative
              <br />
              Learning System, Inc.
            </p>
          </div>

          <div>
            <p className="text-label text-on-ink">Contact</p>
            <ul className="mt-3 space-y-2.5">
              <li className="flex items-start gap-2 text-caption text-on-ink/70">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>
                  847 Sampaguita Street, Tala,
                  <br />
                  Caloocan City, Metro Manila
                </span>
              </li>
              <li className="flex items-center gap-2 text-caption text-on-ink/70">
                <Phone className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <a href="tel:+639945849446" className="hover:underline">
                  0994 584 9446
                </a>
              </li>
              <li className="flex items-center gap-2 text-caption text-on-ink/70">
                <Mail className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <a href="mailto:umcls20educ@gmail.com" className="hover:underline">
                  umcls20educ@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-caption text-on-ink/70">
                <Clock className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                Mon&ndash;Fri, 8:00 AM&ndash;4:00 PM
              </li>
              <li className="flex items-center gap-2 text-caption">
                <Link
                  href="https://facebook.com/p/United-Methodist-Cooperative-Learning-System-Inc-61576554814851"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1 text-on-ink hover:underline"
                >
                  Facebook page
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-label text-on-ink">Government recognition</p>
            <ul className="mt-3 space-y-2 text-caption text-on-ink/70">
              <li>DepEd NCR Region</li>
              <li>Nursery through Elementary Grade 6</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-caption text-on-ink/70">
          &copy;&nbsp;{new Date().getFullYear()} United Methodist Cooperative
          Learning System, Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
