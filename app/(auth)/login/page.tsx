"use client";

// app/login/page.tsx
//
// Design system: DESIGN-LMS.md v1.1 (Authentication — Login)

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
            className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-16"
        >
            <div className="w-full max-w-2xl">
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

                {/* Card */}
                <div className="rounded-md bg-surface p-8 shadow-modal sm:p-10">
                    {/* Eyebrow */}
                    <p className="mb-3 flex items-center gap-1.5 text-label text-text-secondary">
                        <span aria-hidden="true" className="text-amber">
                            •
                        </span>
                        Sign in
                    </p>

                    <h1 className="font-heading text-h3 text-ink">
                        United Methodist
                    </h1>
                    <h1 className="mb-3 font-heading text-h3 text-ink">
                        Cooperative Learning System
                    </h1>
                    <p className="mb-5 text-caption text-text-secondary">
                        &ldquo;Teaching every child with patience, and the belief
                        that no one is left behind.&rdquo;
                    </p>
                    <p className="mb-8 text-body-md text-text-secondary">
                        Sign in to your account
                    </p>

                    <form action={formAction} noValidate>
                        <div className="mb-5">
                            <label
                                htmlFor="email"
                                className="mb-2 block text-label text-text-secondary"
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
                                className="h-11 w-full rounded-md border border-hairline-strong bg-surface px-5 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            />
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="password"
                                className="mb-2 block text-label text-text-secondary"
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
                                    className="h-11 w-full rounded-md border border-hairline-strong bg-surface px-5 pr-12 text-body-md text-ink placeholder:text-text-muted focus:border-[1.5px] focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={
                                        showPassword ? "Hide password" : "Show password"
                                    }
                                    aria-pressed={showPassword}
                                    className="absolute inset-y-0 right-0 flex h-11 w-11 items-center justify-center text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" strokeWidth={1.5} />
                                    ) : (
                                        <Eye className="h-5 w-5" strokeWidth={1.5} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="mb-6 text-right">
                            <Link
                                href="/forgot-password"
                                className="inline-flex h-11 items-center text-body-md text-brand hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {state.error && (
                            <div
                                id="login-error"
                                role="alert"
                                className="mb-5 flex items-start gap-2 rounded-md bg-error-soft px-5 py-3"
                            >
                                <AlertCircle
                                    className="mt-0.5 h-4 w-4 shrink-0 text-error"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                />
                                <p className="text-caption text-error">
                                    {state.error}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className={cn(
                                "h-11 w-full rounded-md bg-brand text-body-md font-medium text-on-ink transition-colors",
                                "hover:bg-brand-hover",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                                "disabled:bg-hairline disabled:text-text-muted"
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
