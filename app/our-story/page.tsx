// app/our-story/page.tsx
//
// Our Story.
//
// DESIGN-LMS 2.1 content pass (2026-09-06): the timeline's "Digital
// era" entry was vague ("interactive learning tools were added") and
// the brief's two specific milestones — SEC registration formalizing
// the institution as "United Methodist Cooperative Learning System,
// Inc.", and the implementation of an online LMS — weren't named
// explicitly. Split into two distinct timeline entries so both
// milestones are stated directly.

import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const timeline = [
  {
    era: "Founding years",
    description:
      "UMCLSI began as a church preschool ministry, started by the United Methodist Church to give local families in Caloocan access to values-rich early education.",
  },
  {
    era: "Expansion & formal registration",
    description:
      "The school earned DepEd recognition and grew into a full elementary program, and was formally registered with the SEC as United Methodist Cooperative Learning System, Inc.",
  },
  {
    era: "Digital era",
    description:
      "An online Learning Management System was implemented to complement traditional classroom teaching, giving teachers another way to reach students who learn differently.",
  },
];

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* ── Intro ────────────────────────────────────────────────────── */}
      <section className="px-4 pb-12 pt-10 sm:px-6 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Our history</p>
          <h1 className="mt-4 max-w-2xl text-h1 text-ink md:text-[3rem] md:leading-[1.1]">
            Our journey of faith and education
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-ink-soft">
            UMCLSI started as a ministry response from the United Methodist
            Church, to bring accessible, values-rich education to families in
            Caloocan.
          </p>
        </div>
      </section>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-h2 text-ink">How we got here</h2>

          <ol className="mt-10 space-y-8 border-l-2 border-hairline-strong pl-6 md:space-y-10 md:pl-8">
            {timeline.map((step) => (
              <li key={step.era}>
                <p className="text-body-emphasis text-ink">{step.era}</p>
                <p className="mt-2 max-w-xl text-body-md text-text-secondary">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Cooperative identity ─────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Why &quot;cooperative&quot;</p>
          <h2 className="mt-3 max-w-xl text-h2 text-ink">
            Learning together, not against each other
          </h2>
          <p className="mt-4 max-w-xl text-body-lg leading-relaxed text-ink-soft">
            Cooperative learning is at the center of who we are. Instead of
            students working in isolation to outperform one another, our
            classrooms are built around collaboration, where students help
            each other succeed academically and spiritually.
          </p>
        </div>
      </section>

      {/* ── Community impact ─────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-label text-text-secondary">Beyond the classroom</p>
          <h2 className="mt-3 text-h2 text-ink">
            Church and community impact
          </h2>
          <p className="mt-4 max-w-xl text-body-md text-text-secondary">
            Generations of young learners in Tala have received their
            foundational primary education through UMCLSI. Students,
            teachers, and church leadership take part in outreach programs,
            spiritual retreats, and community service throughout the year,
            carrying the school&apos;s values outside its walls.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
