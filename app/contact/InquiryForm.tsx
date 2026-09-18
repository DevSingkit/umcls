// app/contact/InquiryForm.tsx
//
// NOT WIRED UP. There is no server action, database table, or email
// delivery for inquiries yet — that decision was explicitly deferred
// On submit this logs a clear
// console.error flag instead of silently doing nothing, so this
// doesn't get mistaken for a working feature during QA or a demo.
// Replace handleSubmit's body with a real server action call once
// storage/delivery is decided.

"use client";

import { useState, type FormEvent } from "react";

export function InquiryForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    console.error(
      "[InquiryForm] NOT IMPLEMENTED: contact form has no backend yet. " +
        "This submission was not saved or sent anywhere."
    );

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mt-8 rounded-md border border-hairline bg-surface p-6 text-body-md text-ink-soft shadow-card space-y-2">
        <p className="font-semibold text-ink">Thank you for your interest!</p>
        <p className="text-text-secondary leading-relaxed">
          Online inquiry processing is currently being updated. For immediate assistance and enrollment questions, please call us directly at{" "}
          <a href="tel:+639945849446" className="text-brand font-semibold hover:underline">
            0994 584 9446
          </a>{" "}
          or email{" "}
          <a href="mailto:umcls20educ@gmail.com" className="text-brand font-semibold hover:underline">
            umcls20educ@gmail.com
          </a>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="guardianName" className="mb-2 block text-label text-ink-soft">
          Parent or guardian name
        </label>
        <input
          id="guardianName"
          name="guardianName"
          type="text"
          required
          className="h-12 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-label text-ink-soft">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="h-12 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="phone" className="mb-2 block text-label text-ink-soft">
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="h-12 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="studentName" className="mb-2 block text-label text-ink-soft">
          Student name
        </label>
        <input
          id="studentName"
          name="studentName"
          type="text"
          className="h-12 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="gradeLevel" className="mb-2 block text-label text-ink-soft">
          Grade level of interest
        </label>
        <select
          id="gradeLevel"
          name="gradeLevel"
          className="h-12 w-full rounded-md border-2 border-hairline bg-surface px-4 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
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
        <label htmlFor="message" className="mb-2 block text-label text-ink-soft">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="w-full rounded-md border-2 border-hairline bg-surface px-4 py-3 text-body-md text-ink focus:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-colors"
        />
      </div>

      <button
        type="submit"
        className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-brand px-8 text-body-md font-bold text-white shadow-clay-sm hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all sm:w-auto"
      >
        Send inquiry
      </button>
    </form>
  );
}