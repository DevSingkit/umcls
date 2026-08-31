// app/about/page.tsx
//
// About Us. Mobile first: sections stack full width with generous
// vertical spacing, widen into a two-column layout only from md: up
// where content genuinely benefits from side-by-side (mission/vision,
// values grid).
//
// DESIGN-LMS 2.1 (2026-08-31): removed font-heading (Fredoka) from all
// headings on this page — global default is now Roboto (font-document)
// via globals.css's base h1-h6 rule.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31, continued): `pb-xl`/`pt-lg`
// on the hero section were not real Tailwind spacing keys (only
// numeric spacing + the custom `13` exist in tailwind.config.ts) —
// same dead-token bug class as the earlier amber/text-heading-lg
// finds, just silently producing zero padding instead of erroring.
// Replaced with real values scaled down from the md: breakpoint's
// pb-20/pt-16 the same way every other public page's hero already
// does it. Also `max-w-1xl` on the h1 isn't a real Tailwind class
// (`1xl` doesn't exist on the scale) — fixed to `max-w-2xl`, matching
// the identical h1 pattern on every other public page (our-story,
// admissions, academics, contact).

import { HandHeart, Sparkles, Users2, HeartHandshake } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const coreValues = [
  {
    icon: HandHeart,
    title: "Faith and integrity",
    description: "Grounded in Methodist Christian teachings, in the classroom and out of it.",
  },
  {
    icon: Sparkles,
    title: "Excellence",
    description: "Academic rigor and critical thinking, paced to how each learner actually grows.",
  },
  {
    icon: Users2,
    title: "Cooperation",
    description: "Learning together through mutual respect and teamwork, not isolated competition.",
  },
  {
    icon: HeartHandshake,
    title: "Service",
    description: "Dedicated to serving God, family, and the community around our school.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Who we are</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.0]">
            United Methodist Cooperative Learning System, Inc.
          </h1>
          
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            A Christian elementary school in Tala, Caloocan City, recognized by
            DepEd and built around cooperative learning: students helping each
            other grow, not competing against each other.
          </p>
        </div>
      </section>

      {/* ── Mission & Vision ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-label text-text-secondary">Mission</p>
            <p className="mt-4 text-body-lg leading-relaxed text-ink-soft">
              To provide holistic, Christ-centered, and affordable quality
              education that develops academic excellence, moral integrity,
              and social responsibility in young learners.
            </p>
          </div>
          <div>
            <p className="text-label text-text-secondary">Vision</p>
            <p className="mt-4 text-body-lg leading-relaxed text-ink-soft">
              To be a premier Christian learning institution nurturing
              compassionate, competent, and faith-driven leaders for the
              community and the world.
            </p>
          </div>
        </div>
      </section>

      {/* ── Core values ──────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">What guides us</p>
          <h2 className="mt-3 text-h2 text-ink">Our core values</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {coreValues.map((value) => (
              <div
                key={value.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-soft">
                  <value.icon className="h-6 w-6 text-brand" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-body-emphasis text-ink">{value.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Accreditation ────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Recognition</p>
          <h2 className="mt-3 text-h2 text-ink">
            Accredited, and part of a larger church
          </h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            UMCLSI is recognized by DepEd and registered with the SEC, and is
            affiliated with the United Methodist Church Philippines, Manila
            Episcopal Area.
          </p>

          <div className="mt-8 flex flex-wrap gap-2.5">
            <span className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand">
              DepEd Recognized
            </span>
            <span className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand">
              SEC Registered
            </span>
          </div>
        </div>
      </section>

      {/* ── Facilities ───────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Our campus</p>
          <h2 className="mt-3 text-h2 text-ink">Facilities</h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            Classrooms, a computer lab, a library, play areas, and a
            worship space, all sized for an elementary campus rather than
            spread thin across one.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
