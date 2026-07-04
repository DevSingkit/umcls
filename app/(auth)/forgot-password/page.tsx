"use client";

// app/forgot-password/page.tsx
//
// Design system: DESIGN-LMS.md v3.0.0 (§2.1 Auth Flow — Forgot Password)
// Same card treatment as app/login/page.tsx — see that file for the full
// token → Tailwind arbitrary-value map.

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";
import { requestPasswordReset } from "@/features/auth/actions/request-password-reset";

export default function ForgotPasswordPage() {
    const [submitted, setSubmitted] = useState(false);
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        await requestPasswordReset(formData);
        // Always show the same confirmation, whether or not the email
        // was found. See request-password-reset.ts for why.
        setSubmitted(true);
        setIsPending(false);
    }

    return (
        <main
            id="main-content"
            className="flex min-h-screen flex-col items-center justify-center bg-[#F3F0EE] px-6 py-16"
        >
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <Image
                        src="/logo.png"
                        alt="UMCLS LMS"
                        width={140}
                        height={44}
                        priority
                        className="h-11 w-auto object-contain"
                    />
                </div>

                {/* Card — white / 40px radius (rounded.hero) / card-lift shadow */}
                <div className="rounded-[40px] bg-white p-8 shadow-[0_24px_48px_rgba(0,0,0,0.08)] sm:p-10">
                    {submitted ? (
                        <div className="text-center">
                            {/* Circle icon — echoes the circle-portrait signature */}
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F0EE]">
                                <Mail className="h-6 w-6 text-[#141413]" strokeWidth={1.5} />
                            </div>

                            <p className="mt-5 flex items-center justify-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
                                <span aria-hidden="true" className="text-[#F37338]">
                                    •
                                </span>
                                Check your email
                            </p>

                            <h1 className="mt-2 text-[20px] font-medium leading-[1.2] tracking-[-0.4px] text-[#141413]">
                                Link sent
                            </h1>

                            <p className="mt-3 text-[14px] leading-[1.5] text-[#696969]">
                                If an account exists for that email, we&apos;ve sent a
                                link to reset your password. The link expires in 1 hour.
                            </p>

                            <Link
                                href="/login"
                                className="mt-8 inline-flex h-11 items-center justify-center text-[14px] text-[#3860BE] hover:underline"
                            >
                                Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <p className="mb-3 flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
                                <span aria-hidden="true" className="text-[#F37338]">
                                    •
                                </span>
                                Reset password
                            </p>

                            <h1 className="text-[20px] font-medium leading-[1.2] tracking-[-0.4px] text-[#141413]">
                                Forgot your password?
                            </h1>
                            <p className="mb-8 mt-2 text-[16px] leading-[1.4] text-[#696969]">
                                Enter your school email and we&apos;ll send you a link
                                to reset it.
                            </p>

                            <form action={handleSubmit}>
                                <div className="mb-6">
                                    <label
                                        htmlFor="email"
                                        className="mb-2 block text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        placeholder="you@school.edu"
                                        className="h-11 w-full rounded-[20px] border border-[#D1CDC7] bg-white px-5 text-[16px] text-[#141413] placeholder:text-[#9A9390] focus:border-[1.5px] focus:border-[#141413] focus:outline-none"
                                    />
                                </div>

                                {/* button-primary — ink pill, no uppercase (v3 §7.1) */}
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-11 w-full rounded-[20px] bg-[#141413] text-[16px] font-medium tracking-[-0.48px] text-[#F3F0EE] transition-colors hover:bg-[#292929] active:bg-[#141413] disabled:bg-[#E8E8E8] disabled:text-[#9A9390]"
                                >
                                    {isPending ? "Sending…" : "Send reset link"}
                                </button>
                            </form>

                            <Link
                                href="/login"
                                className="mt-6 block text-center text-[14px] text-[#3860BE] hover:underline"
                            >
                                Back to sign in
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}