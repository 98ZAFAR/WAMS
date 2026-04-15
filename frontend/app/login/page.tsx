"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

/*
Critical auth flow note:
The backend returns JWT + sanitized user from /api/auth/login.
This page persists both in localStorage via AuthProvider and immediately redirects
to role-specific workspace routes so every next request can send Bearer auth.
*/
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, setAuthSession, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      router.replace(roleHomePath(user.role));
    }
  }, [isAuthenticated, isReady, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await wamsApi.login({ email, password });
      setAuthSession(response.token, response.user);
      router.replace(roleHomePath(response.user.role));
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass =
    "w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-4 py-3 text-sm text-[#3a302a] placeholder:text-[#9a9088] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf5ee] px-4 py-10 md:px-8">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-[#d8d0c8]/60 bg-white shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:grid-cols-2">
        <div className="relative hidden bg-[#c2652a] p-12 text-white md:flex md:flex-col md:justify-between">
          <div>
            <p className="font-serif text-4xl font-bold italic">WAMS</p>
            <p className="mt-1 text-sm font-medium text-[#fbe8d8]">Warehouse Automated Manufacturing System</p>
          </div>

          <div>
            <h1 className="max-w-md font-serif text-4xl font-bold leading-tight">
              Precision in every movement, clarity in every byte.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#fbe8d8]">
              Manage industrial operations with a warm and modern interface designed for practical daily workflows.
            </p>
          </div>

          <div className="absolute inset-0 bg-linear-to-t from-[#8a4518]/60 via-transparent to-transparent" />
        </div>

        <div className="p-8 md:p-14">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78706a]">
              Precision in every movement
            </p>
            <h2 className="mt-2 font-serif text-4xl font-bold text-[#3a302a]">Welcome Back</h2>
            <p className="mt-2 text-sm text-[#605850]">Use your WAMS credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.15em] text-[#605850]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={fieldClass}
                placeholder="name@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.15em] text-[#605850]">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={fieldClass}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-[#c2652a] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign In to Dashboard"}
            </button>
          </form>

          <p className="mt-7 text-sm text-[#605850]">
            New to WAMS?{" "}
            <Link href="/register" className="font-semibold text-[#c2652a] hover:underline">
              Create your account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
