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
    <main className="page-wrap" style={{ padding: "1.2rem 0 2rem" }}>
      <header className="surface top-nav" style={{ marginBottom: "1rem" }}>
        <div className="brand-mark">
          W<span>AMS</span>
        </div>
        <div style={{ display: "flex", gap: "0.55rem" }}>
          <Link href="/login" className="btn btn-secondary">
            Login
          </Link>
          <Link href="/register" className="btn btn-primary">
            Register
          </Link>
        </div>
      </header>

      <section
        className="surface"
        style={{
          padding: "1.65rem",
          display: "grid",
          gap: "1rem",
          alignItems: "center",
          gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))",
        }}
      >
        <div className="stack-md">
          <span className="kicker">Sun-Baked Simplicity</span>
          <h1 className="headline" style={{ fontSize: "clamp(2.1rem, 4vw, 3.2rem)" }}>
            Advanced Warehouse Automation for Admin, Dealer, and Supplier teams.
          </h1>
          <p className="text-soft" style={{ maxWidth: "56ch" }}>
            Unified inventory governance, quote-driven ordering, supplier cycle tracking,
            and forecast visibility from one warm, role-aware control room.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            <Link href="/login" className="btn btn-primary">
              Get Started Now
            </Link>
            <Link href="/register" className="btn btn-secondary">
              Create Workspace Access
            </Link>
          </div>
        </div>
        <div className="surface-muted" style={{ padding: "1rem", display: "grid", gap: "0.65rem" }}>
          <p className="kicker">Designed for Every Stakeholder</p>
          <div className="stack-sm">
            <h2 className="headline" style={{ fontSize: "1.42rem" }}>
              Total Production Control
            </h2>
            <p className="text-soft">Track supplies, update stock, and resolve low-threshold risks early.</p>
          </div>
          <div className="stack-sm">
            <h2 className="headline" style={{ fontSize: "1.42rem" }}>
              Seamless Distribution
            </h2>
            <p className="text-soft">Convert dealer requests into approved invoices with quote-first governance.</p>
          </div>
          <div className="stack-sm">
            <h2 className="headline" style={{ fontSize: "1.42rem" }}>
              Operational Clarity
            </h2>
            <p className="text-soft">Sales and forecast reports help admin teams maintain confident stock cover.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
