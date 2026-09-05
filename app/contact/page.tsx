// app/contact/page.tsx
//
// Contact Us. Form fields are stacked full-width at all breakpoints —
// a two-column form on a school-inquiry page mostly just makes tab
// order confusing on mobile, and the field count here is small enough
// that a single column reads fine on desktop too.
//
// NOT WIRED UP: submission has no server action yet — see
// InquiryForm's onSubmit below. Decided to skip building storage/email
// delivery for now (2026-08-31); flagging in logs instead of silently
// pretending this works, so it's not mistaken for a working feature
// during testing.
//
// DESIGN-LMS 2.1 fact-correction pass (2026-09-06): phone, email,
// street address, office hours, and the map query on this page were
// all placeholder/made-up values from an earlier pass, not verified
// school info. Replaced with:
//   0994 584 9446 / umcls20educ@gmail.com /
//   847 Sampaguita Street, Tala, Caloocan City, Metro Manila /
//   Mon–Fri 8:00 AM–4:00 PM, closed weekends & holidays.
// Map iframe query updated to match the corrected street address.

import { Phone, Mail, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { InquiryForm } from "./InquiryForm";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Reach us</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
            Get in touch with UMCLSI
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            Questions about enrollment, or want to visit the campus? Reach out
            below and we&apos;ll get back to you.
          </p>
        </div>
      </section>

      {/* ── Contact info + form ──────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Direct info */}
          <div>
            <h2 className="text-h2 text-ink">Direct contact</h2>

            <ul className="mt-8 space-y-6">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-body-md text-ink-soft">
                  847 Sampaguita Street, Tala,
                  <br />
                  Caloocan City, Metro Manila, Philippines
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
                <Link href="tel:+639945849446" className="text-body-md text-ink-soft hover:underline">
                  0994 584 9446
                </Link>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
                <Link href="mailto:umcls20educ@gmail.com" className="text-body-md text-ink-soft hover:underline">
                  umcls20educ@gmail.com
                </Link>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={1.5} aria-hidden="true" />
                <span className="text-body-md text-ink-soft">
                  Monday&ndash;Friday, 8:00 AM&ndash;4:00 PM
                  <br />
                  Closed weekends and holidays
                </span>
              </li>
            </ul>

            {/* Map */}
            <div className="mt-8 aspect-video w-full overflow-hidden rounded-md bg-surface-sunken">
              <iframe
                title="UMCLSI campus location"
                className="h-full w-full border-0"
                loading="lazy"
                src="https://www.google.com/maps?q=847+Sampaguita+Street+Tala+Caloocan+City&output=embed"
              />
            </div>
          </div>

          {/* Inquiry form */}
          <div>
            <h2 className="text-h2 text-ink">Send an inquiry</h2>
            <InquiryForm />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
