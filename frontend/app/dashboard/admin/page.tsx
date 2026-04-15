"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wamsApi } from "@/lib/api";
import { formatCurrency, normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { ForecastResponse, SalesRow, Supply } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [sales, setSales] = useState<SalesRow[]>([]);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Admin") {
      router.replace(roleHomePath(user.role));
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [salesData, forecastData, supplyData] = await Promise.all([
          wamsApi.getSalesReport(token),
          wamsApi.getForecastReport(token),
          wamsApi.getSupplies(token),
        ]);

        setSales(salesData);
        setForecast(forecastData);
        setSupplies(supplyData);
      } catch (loadError) {
        setError(normalizeError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, router, token, user]);

  const totalRevenue = useMemo(() => {
    return sales.reduce((acc, row) => acc + row.totalRevenue, 0);
  }, [sales]);

  const topProduct = useMemo(() => {
    return sales[0];
  }, [sales]);

  const highRiskCount = useMemo(() => {
    return forecast?.forecast.filter((row) => row.risk === "High").length || 0;
  }, [forecast]);

  const pendingSupplies = useMemo(() => {
    return supplies.filter((supply) => supply.status === "Pending").length;
  }, [supplies]);

  const peakRevenue = useMemo(() => {
    if (!sales.length) {
      return 1;
    }

    return Math.max(...sales.map((row) => row.totalRevenue), 1);
  }, [sales]);

  return (
    <AppShell
      requiredRoles={["Admin"]}
      title="Admin Dashboard"
      subtitle="Sales visibility, forecast risk, and supply-chain review in one place."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory" className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            Manage Inventory
          </Link>
          <Link href="/orders/manage" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
            Manage Quotes
          </Link>
          <Link href="/supplies" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
            Review Supplies
          </Link>
        </div>
      }
    >
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Sales Revenue</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{formatCurrency(totalRevenue)}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Forecast High Risk</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{highRiskCount}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Pending Supply Requests</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{pendingSupplies}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Top Product</div>
          <div className="mt-2 font-serif text-xl font-bold text-[#c2652a]">
            {topProduct?.productName || "-"}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Sales Overview
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-[#605850]">Loading sales report...</p>
          ) : sales.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No approved orders yet for sales analytics.</div>
          ) : (
            <div className="mt-3 space-y-4">
              {sales.slice(0, 7).map((row) => (
                <div key={row.productId} className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{row.productName || "Unnamed product"}</strong>
                    <span className="text-sm text-[#605850]">{formatCurrency(row.totalRevenue)}</span>
                  </div>
                  <div
                    style={{
                      marginTop: "0.5rem",
                      height: "8px",
                      width: "100%",
                      background: "#eadfd2",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max((row.totalRevenue / peakRevenue) * 100, 7)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #c2652a, #8c3c3c)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Optimization Tip
          </h2>
          <div className="mt-3 space-y-2">
            {(forecast?.forecast || []).slice(0, 5).map((row) => (
              <div key={row.productId} className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{row.productName}</strong>
                  <StatusBadge status={row.risk} />
                </div>
                <p className="mt-1 text-sm text-[#605850]">
                  Recommended restock: {row.recommendedRestock}
                </p>
              </div>
            ))}

            {!forecast?.forecast.length ? (
              <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">Forecast data appears after approved/dispatched order history grows.</div>
            ) : null}
          </div>
        </article>
      </section>
    </AppShell>
  );
}

