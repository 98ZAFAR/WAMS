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
        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          <Link href="/inventory" className="btn btn-primary">
            Manage Inventory
          </Link>
          <Link href="/orders/manage" className="btn btn-secondary">
            Manage Quotes
          </Link>
          <Link href="/supplies" className="btn btn-secondary">
            Review Supplies
          </Link>
        </div>
      }
    >
      {error ? <div className="message error">{error}</div> : null}

      <section className="kpi-grid">
        <article className="surface kpi-card">
          <div className="kicker">Sales Revenue</div>
          <div className="kpi-value">{formatCurrency(totalRevenue)}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Forecast High Risk</div>
          <div className="kpi-value">{highRiskCount}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Pending Supply Requests</div>
          <div className="kpi-value">{pendingSupplies}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Top Product</div>
          <div className="kpi-value" style={{ fontSize: "1.3rem" }}>
            {topProduct?.productName || "-"}
          </div>
        </article>
      </section>

      <section className="split-grid">
        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Sales Overview
          </h2>
          {loading ? (
            <p className="text-soft">Loading sales report...</p>
          ) : sales.length === 0 ? (
            <div className="empty-state">No approved orders yet for sales analytics.</div>
          ) : (
            <div className="stack-md" style={{ marginTop: "0.8rem" }}>
              {sales.slice(0, 7).map((row) => (
                <div key={row.productId} className="surface-muted" style={{ padding: "0.55rem 0.7rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
                    <strong>{row.productName || "Unnamed product"}</strong>
                    <span className="text-soft">{formatCurrency(row.totalRevenue)}</span>
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

        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Optimization Tip
          </h2>
          <div className="stack-sm" style={{ marginTop: "0.8rem" }}>
            {(forecast?.forecast || []).slice(0, 5).map((row) => (
              <div key={row.productId} className="surface-muted" style={{ padding: "0.6rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.55rem", flexWrap: "wrap" }}>
                  <strong>{row.productName}</strong>
                  <StatusBadge status={row.risk} />
                </div>
                <p className="text-soft" style={{ margin: "0.2rem 0 0" }}>
                  Recommended restock: {row.recommendedRestock}
                </p>
              </div>
            ))}

            {!forecast?.forecast.length ? (
              <div className="empty-state">Forecast data appears after approved/dispatched order history grows.</div>
            ) : null}
          </div>
        </article>
      </section>
    </AppShell>
  );
}
