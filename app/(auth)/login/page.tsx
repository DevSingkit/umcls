"use client";

// app/login/page.tsx
//
// Design system: DESIGN-LMS.md v3.0.0 (§4.1 Authentication — Login)
//
// Token → Tailwind arbitrary-value map used throughout this file
// (drop these into tailwind.config.ts as named colors once, then swap
// the arbitrary values below for e.g. bg-canvas / text-ink / etc.):
//   canvas          #F3F0EE   lifted   #FCFBFA   white  #FFFFFF
//   hairline        #D1CDC7   ink      #141413   on-ink #F3F0EE
//   text-secondary  #696969   text-muted #9A9390
//   link            #3860BE   signal   #CF4500   error  #B3262B  error-soft #F9D4D2
//
// Radii: button 20px · hero 40px (card) · pill 999px
// Shadow: card-lift = 0 24px 48px rgba(0,0,0,0.08)

import { useActionState, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { login } from "@/features/auth/actions/login";
import { cn } from "@/lib/utils";

async function loginAction(
    _prevState: { error: string | null },
    formData: FormData
): Promise<{ error: string | null }> {
    return login(formData);
}

const initialState: { error: string | null } = { error: null };

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(
        loginAction,
        initialState
    );
    const [showPassword, setShowPassword] = useState(false);

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
                    {/* Eyebrow — the only uppercase text in the system */}
                    <p className="mb-3 flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]">
                        <span aria-hidden="true" className="text-[#F37338]">
                            •
                        </span>
                        Sign in
                    </p>

                    <h1 className="text-[20px] font-medium leading-[1.2] tracking-[-0.4px] text-[#141413]">
                        United Methodist
                    </h1>
                    <h1 className="mb-3 text-[20px] font-medium leading-[1.2] tracking-[-0.4px] text-[#141413]">
                        Cooperative Learning System
                    </h1>
                    <p className="mb-1 text-[14px] italic leading-[1.5] text-[#696969]">
                        &ldquo;Classroom without walls&hellip; Classroom without
                        losers&rdquo;
                    </p>
                    <p className="mb-8 text-[16px] font-normal leading-[1.4] text-[#696969]">
                        Sign in to your account
                    </p>

                    <form action={formAction} noValidate>
                        <div className="mb-5">
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
                                aria-describedby={state.error ? "login-error" : undefined}
                                aria-invalid={state.error ? true : undefined}
                                placeholder="you@school.edu"
                                className="h-11 w-full rounded-[20px] border border-[#D1CDC7] bg-white px-5 text-[16px] text-[#141413] placeholder:text-[#9A9390] focus:border-[1.5px] focus:border-[#141413] focus:outline-none"
                            />
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="password"
                                className="mb-2 block text-[14px] font-bold uppercase tracking-[0.56px] text-[#696969]"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    aria-describedby={
                                        state.error ? "login-error" : undefined
                                    }
                                    aria-invalid={state.error ? true : undefined}
                                    placeholder="••••••••"
                                    className="h-11 w-full rounded-[20px] border border-[#D1CDC7] bg-white px-5 pr-12 text-[16px] text-[#141413] placeholder:text-[#9A9390] focus:border-[1.5px] focus:border-[#141413] focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    aria-pressed={showPassword}
                                    className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center text-[#696969]"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4.5 w-4.5" strokeWidth={1.5} />
                                    ) : (
                                        <Eye className="h-4.5 w-4.5" strokeWidth={1.5} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 text-right">
                            <Link
                                href="/forgot-password"
                                className="inline-flex h-11 items-center text-[14px] text-[#3860BE] hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {state.error && (
                            <div
                                id="login-error"
                                role="alert"
                                className="mb-5 flex items-start gap-2 rounded-[20px] bg-[#F9D4D2] px-5 py-3"
                            >
                                <AlertCircle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-[#B3262B]"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                />
                                <p className="text-[14px] leading-[1.5] text-[#B3262B]">
                                    {state.error}
                                </p>
                            </div>
                        )}

                        {/* button-primary — ink pill, no uppercase (v3 §7.1) */}
                        <button
                            type="submit"
                            disabled={isPending}
                            className={cn(
                                "h-11 w-full rounded-[20px] bg-[#141413] text-[16px] font-medium tracking-[-0.48px] text-[#F3F0EE] transition-colors",
                                "hover:bg-[#292929] active:bg-[#141413]",
                                "disabled:bg-[#E8E8E8] disabled:text-[#9A9390]"
                            )}
                        >
                            {isPending ? "Signing in…" : "Sign in"}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}