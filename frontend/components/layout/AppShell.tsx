"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { roleHomePath, roleNav } from "@/lib/navigation";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  requiredRoles?: Role[];
  actions?: React.ReactNode;
  children: React.ReactNode;
};

const isActive = (pathname: string, href: string) => {
  return pathname === href || pathname.startsWith(`${href}/`);
};

const roleLabel = (role: Role) => {
  if (role === "Admin") {
    return "Admin Console";
  }

  if (role === "Supplier") {
    return "Supplier Workspace";
  }

  return "Dealer Workspace";
};

export const AppShell = ({
  title,
  subtitle,
  requiredRoles,
  actions,
  children,
}: AppShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isReady, isAuthenticated, logout, user } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      router.replace(roleHomePath(user.role));
    }
  }, [isAuthenticated, isReady, requiredRoles, router, user]);

  if (!isReady || !isAuthenticated || !user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-xl border border-[#d8d0c8] bg-white px-5 py-4 text-sm text-[#605850] shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          Preparing your WAMS workspace...
        </div>
      </main>
    );
  }

  const navigation = roleNav[user.role];

  return (
    <div className="min-h-screen bg-[#faf5ee] text-[#3a302a]">
      <header
        className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-[#d8d0c8]/60 bg-[#faf5ee]/95 px-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] backdrop-blur md:px-6"
        role="banner"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="font-serif text-2xl font-bold italic text-[#c2652a]">WAMS</div>
          <div className="hidden h-6 w-px bg-[#d8d0c8] lg:block" />
          <div className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78706a] lg:block">
            {roleLabel(user.role)}
          </div>
        </div>

        {/* <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-[#d8d0c8]/70 bg-[#f2ece4] px-3 py-1.5 md:flex">
          <span className="material-symbols-outlined text-sm text-[#9a9088]">search</span>
          <input
            className="w-full border-none bg-transparent p-0 text-sm text-[#3a302a] placeholder:text-[#9a9088] focus:ring-0"
            placeholder="Search workspace"
            type="text"
            aria-label="Search workspace"
          />
        </div> */}

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-[#3a302a]">{user.name}</p>
            <p className="text-[11px] uppercase tracking-wider text-[#78706a]">{user.role}</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[#d8d0c8] px-3 py-1.5 text-xs font-semibold text-[#605850] transition hover:bg-[#f2ece4]"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-64 flex-col border-r border-[#d8d0c8]/60 bg-[#faf5ee] py-6 lg:flex">
        <div className="mb-8 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c2652a] text-white">
              <span className="material-symbols-outlined">factory</span>
            </div>
            <div>
              <p className="font-serif text-lg font-semibold italic text-[#c2652a]">WAMS Control</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#78706a]">{roleLabel(user.role)}</p>
            </div>
          </div>
        </div>

        <nav className="space-y-1 px-2" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                isActive(pathname, item.href)
                  ? "border-r-4 border-[#c2652a] bg-[#c2652a]/10 text-[#c2652a]"
                  : "text-[#605850] hover:bg-[#f2ece4] hover:text-[#c2652a]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto px-4">
          <button
            type="button"
            className="w-full rounded-lg bg-[#c2652a] px-4 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(194,101,42,0.25)] transition hover:opacity-90"
            onClick={() => router.push(roleHomePath(user.role))}
          >
            Open Dashboard
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-screen-2xl px-4 pb-10 pt-8 lg:pl-72 lg:pr-8">
        <section className="mb-6 rounded-2xl border border-[#d8d0c8]/60 bg-white p-6 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#78706a]">Operational Console</div>
          <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-[#3a302a] md:text-5xl">
            {title}
          </h1>
          {subtitle ? <p className="mt-3 max-w-3xl text-sm text-[#605850] md:text-base">{subtitle}</p> : null}
          {actions ? <div className="mt-5 flex flex-wrap gap-3">{actions}</div> : null}
        </section>
        <div className="space-y-6">{children}</div>
      </main>
    </div>
  );
};
