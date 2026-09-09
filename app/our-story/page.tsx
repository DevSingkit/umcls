// app/our-story/page.tsx

import { Heart, Users, BookOpen, Church, ShieldCheck, MapPin } from "lucide-react";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";

const timeline = [
  {
    era: "Church Ministry Foundations",
    title: "United Methodist Preschool Ministry",
    description:
      "UMCLSI was established as a localized educational ministry of the United Methodist Church, offering accessible, values-driven preschool education to families in Northern Caloocan.",
  },
  {
    era: "DepEd Recognition & SEC Registration",
    title: "Formal Expansion to Elementary",
    description:
      "Following growth in enrollment, the institution earned official DepEd Division of Caloocan City recognition for Grades 1 through 6, incorporating under SEC registration as United Methodist Cooperative Learning System, Inc.",
  },
  {
    era: "LMS & Digital Integration",
    title: "Blended Learning Infrastructure",
    description:
      "To complement structured classroom instruction, UMCLSI introduced a dedicated online Learning Management System for coursework tracking, parent updates, and supplemental study materials.",
  },
];

const pillarsOfCooperation = [
  {
    icon: Users,
    title: "Peer-Assisted Learning",
    description: "Classrooms use structured group tasks where stronger learners mentor peers, reinforcing mastery for both students.",
  },
  {
    icon: BookOpen,
    title: "Learner-Centered Methodology",
    description: "Focus is placed on holistic skill development and critical thinking rather than purely competitive ranking.",
  },
  {
    icon: Church,
    title: "Methodist Spiritual Formation",
    description: "Christian ethics, weekly devotionals, and moral guidance are integrated directly into classroom instruction and daily life.",
  },
];

export default function OurStoryPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink antialiased">
      <SiteNav />

      {/* Hero / Intro */}
      <section className="px-4 py-12 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Institutional History
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Our Journey of Faith, Learning, & Service
          </h1>
          <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-ink-soft">
            Founded as a Christian ministry extension of the United Methodist Church, UMCLSI has served generations of early childhood and elementary learners in Tala, Caloocan City through affordable, quality basic education grounded in Methodist values.
          </p>

          {/* Institutional Fast Facts */}
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 shadow-sm md:grid-cols-4">
            <div>
              <p className="text-caption text-text-secondary">School Type</p>
              <p className="mt-1 text-body-md font-bold text-ink">Private Basic Education</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">DepEd Status</p>
              <p className="mt-1 text-body-md font-bold text-ink">Fully Recognized</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Affiliation</p>
              <p className="mt-1 text-body-md font-bold text-ink">United Methodist Church</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Location</p>
              <p className="mt-1 text-body-md font-bold text-ink">Tala, Caloocan City</p>
            </div>
          </div>
        </div>
      </section>

      {/* History Timeline */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Historical Milestones
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">How UMCLSI Was Built</h2>

          <div className="mt-8 relative border-l-2 border-border pl-6 space-y-8 md:pl-8 md:space-y-10">
            {timeline.map((step) => (
              <div key={step.era} className="relative">
                {/* Timeline node badge */}
                <div className="absolute -left-[31px] md:-left-[39px] top-1.5 h-4 w-4 rounded-full border-2 border-brand bg-surface" />
                
                <span className="text-caption font-semibold uppercase tracking-wider text-brand">
                  {step.era}
                </span>
                <h3 className="mt-1 text-body-md font-bold text-ink">{step.title}</h3>
                <p className="mt-2 max-w-2xl text-caption leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cooperative Identity */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <p className="text-caption font-semibold uppercase tracking-wider text-brand">
            Educational Philosophy
          </p>
          <h2 className="mt-2 text-2xl font-bold text-ink">
            Why &quot;Cooperative Learning&quot; Defines Us
          </h2>
          <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-ink-soft">
            Cooperative learning is the core pedagogy of our institution. Rather than fostering divisive peer competition, classroom seating and instruction are designed around mutual support, collaborative problem-solving, and Christ-like care.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {pillarsOfCooperation.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                  <pillar.icon className="h-6 w-6 text-brand" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-body-md font-bold text-ink">{pillar.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-text-secondary">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community & Church Impact */}
      <section className="px-4 py-10 sm:px-6 md:py-12">
        <div className="mx-auto max-w-[1280px]">
          <div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
            <p className="text-caption font-semibold uppercase tracking-wider text-brand">
              Community & Church Outreach
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              Serving Barangay Tala & Northern Caloocan
            </h2>
            <p className="mt-4 max-w-2xl text-body-md leading-relaxed text-text-secondary">
              For years, UMCLSI has served local families by providing character-first Christian education. In active partnership with the local church leadership and parents, our students participate in campus ministry, community outreach, scout units, and civic events throughout Caloocan City.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}