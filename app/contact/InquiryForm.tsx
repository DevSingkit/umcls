// app/contact/InquiryForm.tsx
//
// NOT WIRED UP. There is no server action, database table, or email
// delivery for inquiries yet — that decision was explicitly deferred
// (see page.tsx comment, 2026-08-31). On submit this logs a clear
// console.error flag instead of silently doing nothing, so this
// doesn't get mistaken for a working feature during QA or a demo.
// Replace handleSubmit's body with a real server action call once
// storage/delivery is decided.
//
// DESIGN-LMS 2.1 bugfix pass (2026-08-31): this file predated the
// redesign and never got a pass — no logic touched, three visual
// fixes only. (1) `text-on-brand` isn't a real token (only `on-ink`
// exists in tailwind.config.ts) — same dead-token bug class fixed
// everywhere else this track. (2) Inputs used plain `border
// border-hairline-strong` at h-12 — aligned to the standing form-input
// convention used everywhere else (`border-2 border-hairline`, h-11 —
// Classroom Mode inputs deliberately stay at 44px, not bumped).
// (3) Labels used `text-body-md font-medium text-ink` instead of the
// standard `text-label text-ink-soft` label style used on every other
// form in the app.

"use client";

import { useState, type FormEvent } from "react";

export function InquiryForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // eslint-disable-next-line no-console
    console.error(
      "[InquiryForm] NOT IMPLEMENTED: contact form has no backend yet. " +
        "This submission was not saved or sent anywhere."
    );

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-md bg-surface p-6 text-body-md text-ink-soft shadow-card">
        This form isn't connected to anything yet, so your message wasn't
        actually sent. Please call or email us directly for now using the
        details on this page.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="guardianName" className="text-label text-ink-soft block mb-2">
          Parent or guardian name
        </label>
        <input
          id="guardianName"
          name="guardianName"
          type="text"
          required
          className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-label text-ink-soft block mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <label htmlFor="phone" className="text-label text-ink-soft block mb-2">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <label htmlFor="studentName" className="text-label text-ink-soft block mb-2">
          Student name
        </label>
        <input
          id="studentName"
          name="studentName"
          type="text"
          className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <div>
        <label htmlFor="gradeLevel" className="text-label text-ink-soft block mb-2">
          Grade level of interest
        </label>
        <select
          id="gradeLevel"
          name="gradeLevel"
          className="h-11 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
        >
          <option value="">Select a grade level</option>
          <option value="nursery">Nursery</option>
          <option value="kindergarten">Kindergarten</option>
          <option value="grade1">Grade 1</option>
          <option value="grade2">Grade 2</option>
          <option value="grade3">Grade 3</option>
          <option value="grade4">Grade 4</option>
          <option value="grade5">Grade 5</option>
          <option value="grade6">Grade 6</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="text-label text-ink-soft block mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full rounded-md border-2 border-hairline bg-surface px-4 py-3 text-body-md text-ink focus:border-brand outline-none focus:ring-2 focus:ring-brand/30"
        />
      </div>

      <button
        type="submit"
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-7 text-body-md font-semibold text-on-ink transition-colors hover:bg-brand-hover sm:w-auto"
      >
        Send inquiry
      </button>
    </form>
  );
}
