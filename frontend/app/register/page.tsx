"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, setAuthSession, user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Dealer");
  const [businessName, setBusinessName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      router.replace(roleHomePath(user.role));
    }
  }, [isAuthenticated, isReady, router, user]);

  const businessRequired = useMemo(() => role === "Dealer" || role === "Supplier", [role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (businessRequired && !businessName.trim()) {
      setError("Business name is required for Dealer and Supplier roles.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await wamsApi.register({
        name,
        email,
        password,
        role,
        businessName: businessName.trim() || undefined,
        contactInfo: contactInfo.trim() || undefined,
      });

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

  const labelClass = "text-xs font-semibold uppercase tracking-[0.15em] text-[#605850]";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf5ee] px-4 py-10 md:px-8">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-[#d8d0c8]/60 bg-white shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:grid-cols-12">
        <div className="hidden bg-[#f2ece4] p-10 md:col-span-4 md:flex md:flex-col md:justify-between">
          <div>
            <p className="font-serif text-4xl font-bold italic text-[#c2652a]">WAMS</p>
            <p className="mt-1 text-sm text-[#6a615a]">Advanced Inventory Management, Elegantly Simplified</p>
          </div>

          <div className="space-y-5">
            <h2 className="font-serif text-3xl font-bold leading-tight text-[#3a302a]">Create a role-based access profile</h2>
            <div className="space-y-3 text-sm text-[#605850]">
              <p className="rounded-xl border border-[#d8d0c8] bg-white px-4 py-3">Admin: monitor, approve, and forecast.</p>
              <p className="rounded-xl border border-[#d8d0c8] bg-white px-4 py-3">Dealer: request and manage orders.</p>
              <p className="rounded-xl border border-[#d8d0c8] bg-white px-4 py-3">Supplier: coordinate supply and delivery status.</p>
            </div>
          </div>

          <p className="text-xs text-[#78706a]">Reliable operations begin with structured user onboarding.</p>
        </div>

        <div className="p-8 md:col-span-8 md:p-12">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78706a]">Get Started</p>
            <h1 className="mt-2 font-serif text-4xl font-bold text-[#3a302a]">Create your account</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className={labelClass}>
                  Name
                </label>
                <input
                  id="name"
                  className={fieldClass}
                  placeholder="John Doe"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className={labelClass}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={fieldClass}
                  placeholder="john@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className={fieldClass}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className={labelClass}>
                  Select Your Role
                </label>
                <select
                  id="role"
                  className={fieldClass}
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  <option value="Dealer">Dealer</option>
                  <option value="Supplier">Supplier</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="businessName" className={labelClass}>
                  Business Name
                </label>
                <input
                  id="businessName"
                  className={fieldClass}
                  placeholder="Enter dealer trade name"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  required={businessRequired}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="contactInfo" className={labelClass}>
                  Contact Info
                </label>
                <input
                  id="contactInfo"
                  className={fieldClass}
                  placeholder="Phone, WhatsApp, alternate email"
                  value={contactInfo}
                  onChange={(event) => setContactInfo(event.target.value)}
                />
              </div>
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
              {submitting ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-7 text-sm text-[#605850]">
            Already have access?{" "}
            <Link href="/login" className="font-semibold text-[#c2652a] hover:underline">
              Login
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
