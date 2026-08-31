// app/academics/page.tsx
//
// Academics & Student Life. Curriculum overview kept brief here since
// the homepage already covers programs in depth — this page focuses on
// what's specific to it: co-curricular life and handbook highlights.
//
// DESIGN-LMS 2.1 (2026-08-31): removed font-heading (Fredoka) from all
// headings on this page — global default is now Roboto (font-document)
// via globals.css's base h1-h6 rule.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31, continued): `pb-xl`/`pt-lg`
// on the hero section weren't real Tailwind spacing keys — same dead-
// token bug as the amber/text-heading-lg finds elsewhere. Fixed to
// real values, matching the other public pages' identical hero fix.

import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const activities = [
  "Campus ministry",
  "Scout units",
  "Choir",
  "Arts",
  "Sports",
  "Science club",
];

const handbookHighlights = [
  {
    title: "Attendance",
    description: "Regular attendance is expected, with clear steps for reporting absences.",
  },
  {
    title: "Dress code",
    description: "Uniform and grooming standards, consistent across grade levels.",
  },
  {
    title: "Anti-bullying",
    description: "A clear process for reporting and addressing bullying, taken seriously at every level.",
  },
  {
    title: "Conduct",
    description: "Expectations for behavior in and out of the classroom, in line with our values.",
  },
];

export default function AcademicsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Life at UMCLSI</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
            Academics and student life
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            DepEd-aligned learning for Nursery through Grade 6, with values
            woven through every subject, and plenty of ways for students to
            grow outside the classroom too.
          </p>
        </div>
      </section>

      {/* ── Curriculum overview ──────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Curriculum overview</h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            Early Childhood covers Nursery and Kindergarten, with a play-based
            foundation in literacy and character. Elementary covers Grades 1
            to 6, aligned with DepEd's K-12 program, with a strong focus
            on English and Math alongside Christian education.
          </p>
        </div>
      </section>

      {/* ── Co-curricular ────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Co-curricular activities</h2>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {activities.map((activity) => (
              <span
                key={activity}
                className="inline-flex items-center rounded-pill bg-brand-soft px-4 py-1.5 text-caption font-semibold text-brand"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Student handbook ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">Student handbook highlights</h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {handbookHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-md bg-surface p-7 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <h3 className="text-body-emphasis text-ink">{item.title}</h3>
                <p className="mt-2 text-caption text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
