"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wamsApi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeError, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { SupplierDashboard } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SupplierDashboardPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [dashboard, setDashboard] = useState<SupplierDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Supplier") {
      router.replace(roleHomePath(user.role));
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await wamsApi.getSupplierDashboard(token);
        setDashboard(data);
      } catch (loadError) {
        setError(normalizeError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, router, token, user]);

  return (
    <AppShell
      requiredRoles={["Supplier"]}
      title="Supplier Overview"
      subtitle="Track request lifecycle, low raw materials, and current production workload."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/supplier/production" className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            Production Orders
          </Link>
          <Link href="/supplier/profile" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
            Profile Settings
          </Link>
        </div>
      }
    >
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Total Requests</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{dashboard?.totalRequests || 0}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Pending</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{dashboard?.statusCounts.Pending || 0}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Approved</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{dashboard?.statusCounts.Approved || 0}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Received</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{dashboard?.statusCounts.Received || 0}</div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Current Production
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-[#605850]">Loading production requests...</p>
          ) : !dashboard?.latestSupplies.length ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No supply requests yet.</div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Batch ID</th>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Est. Completion</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.latestSupplies.map((supply) => (
                    <tr key={supply._id}>
                      <td>{supply._id.slice(-6).toUpperCase()}</td>
                      <td>{readProductName(supply.product)}</td>
                      <td>
                        <StatusBadge status={supply.status} />
                      </td>
                      <td>{formatDate(supply.expectedDeliveryDate)}</td>
                      <td>{formatCurrency(supply.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Resource Levels
          </h2>
          <div className="mt-3 space-y-2">
            {!dashboard?.lowStockRawMaterials.length ? (
              <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No raw-material shortages detected.</div>
            ) : (
              dashboard.lowStockRawMaterials.map((material) => (
                <div key={material._id} className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-3">
                  <strong>{material.name}</strong>
                  <p className="mt-1 text-sm text-[#605850]">
                    {material.currentStock} available, threshold {material.minThreshold}
                  </p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

