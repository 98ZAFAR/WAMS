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
      <main className="page-wrap" style={{ padding: "2rem 0" }}>
        <div className="surface" style={{ padding: "1.1rem" }}>
          Preparing your WAMS workspace...
        </div>
      </main>
    );
  }

  const navigation = roleNav[user.role];

  return (
    <>
      <header className="page-wrap top-nav surface" role="banner">
        <div className="brand-mark">
          W<span>AMS</span>
        </div>
        <nav className="nav-links" aria-label="Primary">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(pathname, item.href) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <span className="text-soft" style={{ fontSize: "0.82rem" }}>
            {user.name} ({user.role})
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logout();
              router.replace("/login");
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="page-wrap page-stack" style={{ padding: "1.1rem 0 2rem" }}>
        <section className="surface" style={{ padding: "1.35rem" }}>
          <div className="kicker">Operational Console</div>
          <h1 className="headline" style={{ marginTop: "0.25rem", fontSize: "2rem" }}>
            {title}
          </h1>
          {subtitle ? <p className="text-soft" style={{ marginTop: "0.35rem" }}>{subtitle}</p> : null}
          {actions ? <div style={{ marginTop: "0.95rem" }}>{actions}</div> : null}
        </section>
        {children}
      </main>
    </>
  );
};
