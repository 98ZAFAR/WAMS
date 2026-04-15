"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { roleHomePath } from "@/lib/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { isReady, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) {
      return;
    }

    router.replace(roleHomePath(user.role));
  }, [isAuthenticated, isReady, router, user]);

  return (
    <div className="min-h-screen bg-[#faf5ee] text-[#3a302a]">
      <header className="sticky top-0 z-50 border-b border-[#d8d0c8]/60 bg-[#faf5ee]/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="font-serif text-2xl font-bold italic text-[#c2652a]">WAMS</div>
          <nav className="hidden items-center gap-7 md:flex">
            <span className="cursor-default text-sm font-medium text-[#605850]">Features</span>
            <span className="cursor-default border-b-2 border-[#c2652a] pb-1 text-sm font-bold text-[#c2652a]">Solutions</span>
            <span className="cursor-default text-sm font-medium text-[#605850]">Inventory</span>
            <span className="cursor-default text-sm font-medium text-[#605850]">Support</span>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-[#605850] transition hover:text-[#c2652a]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#c2652a] px-5 py-2 text-sm font-bold text-white transition hover:opacity-90"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-24 pt-16 md:px-8 md:pt-24">
          <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="font-serif text-5xl font-bold leading-[1.08] text-[#3a302a] md:text-7xl">
                Advanced Inventory Management,
                <span className="italic text-[#c2652a]"> Elegantly Simplified.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base leading-relaxed text-[#605850] md:text-xl">
                Empower your manufacturing ecosystem with real-time tracking, automated ordering, and seamless
                dealer and supplier collaboration.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-lg bg-[#c2652a] px-7 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Get Started Now
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-[#d8d0c8] bg-white px-7 py-3 text-sm font-bold text-[#3a302a] transition hover:bg-[#f2ece4]"
                >
                  View Solutions
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_10px_30px_rgba(58,48,42,0.08)]">
              <div className="rounded-2xl bg-[#f2ece4] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78706a]">Live Operations Snapshot</p>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-[#d8d0c8] bg-white p-4">
                    <p className="text-xs text-[#78706a]">Inventory Items</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-[#3a302a]">1,284</p>
                  </div>
                  <div className="rounded-xl border border-[#d8d0c8] bg-white p-4">
                    <p className="text-xs text-[#78706a]">Open Orders</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-[#3a302a]">452</p>
                  </div>
                  <div className="rounded-xl border border-[#d8d0c8] bg-white p-4">
                    <p className="text-xs text-[#78706a]">Pending Supplies</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-[#3a302a]">18</p>
                  </div>
                  <div className="rounded-xl border border-[#d8d0c8] bg-white p-4">
                    <p className="text-xs text-[#78706a]">Forecast Alerts</p>
                    <p className="mt-1 font-serif text-3xl font-bold text-[#8c3c3c]">5</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-[#fbe8d8]/70 to-transparent" />
        </section>

        <section className="border-y border-[#d8d0c8]/50 bg-[#f6f0e8] px-4 py-14 md:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#78706a]">
              Trusted by leading industrial manufacturers
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-2xl font-serif font-bold tracking-tight text-[#605850] opacity-70 md:gap-20">
              <span>STEELCORE</span>
              <span>PRECISION+</span>
              <span>LUX FAB</span>
              <span>METAGRIND</span>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-20 md:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="font-serif text-4xl font-bold text-[#3a302a] md:text-5xl">Designed for Every Stakeholder</h2>
            <p className="mt-4 text-[#605850]">
              Whether you scale production, manage dealership requests, or coordinate supply cycles, WAMS gives each
              role a focused operational view.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-12">
            <article className="rounded-3xl border border-[#d8d0c8]/60 bg-white p-8 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:col-span-7">
              <p className="inline-flex rounded-full bg-[#c2652a]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#c2652a]">
                For Admin
              </p>
              <h3 className="mt-5 font-serif text-3xl font-bold">Total Production Control</h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#605850]">
                Gain full visibility across inventory, quotes, approvals, invoices, and predictive stock coverage.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[#3a302a]">
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#c2652a]" /> Real-time stock governance</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#c2652a]" /> Quote-first order approval</li>
                <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#c2652a]" /> Sales and forecast intelligence</li>
              </ul>
            </article>

            <article className="rounded-3xl border border-[#8c3c3c]/20 bg-[#fce0e0]/40 p-8 md:col-span-5">
              <p className="inline-flex rounded-full bg-[#8c3c3c]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#8c3c3c]">
                For Dealer & Supplier
              </p>
              <h3 className="mt-5 font-serif text-3xl font-bold text-[#3a2020]">Seamless Distribution</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#6e3030]">
                Dealers request and approve orders quickly, while suppliers submit and track material requests through
                structured lifecycle states.
              </p>
              <div className="mt-7 grid gap-3 text-sm">
                <div className="rounded-xl bg-white/70 px-4 py-3">Dealer order request and approval workflow</div>
                <div className="rounded-xl bg-white/70 px-4 py-3">Supplier production and profile management</div>
                <div className="rounded-xl bg-white/70 px-4 py-3">Admin supply status and stock synchronization</div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#d8d0c8]/60 px-4 py-8 text-sm text-[#78706a] md:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <div className="font-serif text-xl font-bold italic text-[#c2652a]">WAMS</div>
          <p>© 2026 WAMS Automated Manufacturing System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
