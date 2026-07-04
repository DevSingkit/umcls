"use client";

// app/reset-password/page.tsx
//
// Design system: DESIGN-LMS.md v3.0.0 (§2.1 Auth Flow — Reset Password)
// Same card treatment as app/login/page.tsx and app/forgot-password/page.tsx —
// see login/page.tsx for the full token → Tailwind arbitrary-value map.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { resetPassword } from "@/features/auth/actions/reset-password";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(formData: FormData) {
        setError(null);
        setIsPending(true);

        const result = await resetPassword(formData);

        if (!result.ok) {
            setError(result.error);
            setIsPending(false);
            return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
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
                    {success ? (
                        <div className="text-center">
                            {/* Circle icon — echoes the circle-portrait signature */}
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d4f5e3]">
                                <CheckCircle2
                                    className="h-6 w-6 text-[#1a7a4a]"
                                    strokeWidth={1.5}
                                />
                            </div>

                            <p className="mt-5 flex items-center justify-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
                                <span aria-hidden="true" className="text-[#F37338]">
                                    •
                                </span>
                                Password updated
                            </p>

                            <h1 className="mt-2 text-[20px] font-medium leading-[1.2] tracking-[-0.4px] text-[#141413]">
                                You&apos;re all set
                            </h1>

                            <p className="mt-3 text-[14px] leading-[1.5] text-[#696969]">
                                Taking you to the sign in page&hellip;
                            </p>
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
                                Set a new password
                            </h1>
                            <p className="mb-8 mt-2 text-[16px] leading-[1.4] text-[#696969]">
                                Choose a new password with at least 12 characters,
                                including an uppercase letter, a lowercase letter, and a
                                number.
                            </p>

                            <form action={handleSubmit}>
                                <div className="mb-5">
                                    <label
                                        htmlFor="password"
                                        className="mb-2 block text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]"
                                    >
                                        New password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={12}
                                        aria-describedby={error ? "reset-error" : undefined}
                                        aria-invalid={error ? true : undefined}
                                        className="h-11 w-full rounded-[20px] border border-[#D1CDC7] bg-white px-5 text-[16px] text-[#141413] placeholder:text-[#9A9390] focus:border-[1.5px] focus:border-[#141413] focus:outline-none"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label
                                        htmlFor="confirmPassword"
                                        className="mb-2 block text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]"
                                    >
                                        Confirm new password
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        autoComplete="new-password"
                                        required
                                        minLength={12}
                                        aria-describedby={error ? "reset-error" : undefined}
                                        aria-invalid={error ? true : undefined}
                                        className="h-11 w-full rounded-[20px] border border-[#D1CDC7] bg-white px-5 text-[16px] text-[#141413] placeholder:text-[#9A9390] focus:border-[1.5px] focus:border-[#141413] focus:outline-none"
                                    />
                                </div>

                                {error && (
                                    <div
                                        id="reset-error"
                                        role="alert"
                                        className="mb-5 flex items-start gap-2 rounded-[20px] bg-[#F9D4D2] px-5 py-3"
                                    >
                                        <AlertCircle
                                            className="mt-0.5 h-4 w-4 shrink-0 text-[#B3262B]"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                        <p className="text-[14px] leading-[1.5] text-[#B3262B]">
                                            {error}
                                        </p>
                                    </div>
                                )}

                                {/* button-primary — ink pill, no uppercase (v3 §7.1) */}
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="h-11 w-full rounded-[20px] bg-[#141413] text-[16px] font-medium tracking-[-0.48px] text-[#F3F0EE] transition-colors hover:bg-[#292929] active:bg-[#141413] disabled:bg-[#E8E8E8] disabled:text-[#9A9390]"
                                >
                                    {isPending ? "Updating…" : "Update password"}
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