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
        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          <Link href="/supplier/production" className="btn btn-primary">
            Production Orders
          </Link>
          <Link href="/supplier/profile" className="btn btn-secondary">
            Profile Settings
          </Link>
        </div>
      }
    >
      {error ? <div className="message error">{error}</div> : null}

      <section className="kpi-grid">
        <article className="surface kpi-card">
          <div className="kicker">Total Requests</div>
          <div className="kpi-value">{dashboard?.totalRequests || 0}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Pending</div>
          <div className="kpi-value">{dashboard?.statusCounts.Pending || 0}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Approved</div>
          <div className="kpi-value">{dashboard?.statusCounts.Approved || 0}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Received</div>
          <div className="kpi-value">{dashboard?.statusCounts.Received || 0}</div>
        </article>
      </section>

      <section className="split-grid">
        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Current Production
          </h2>
          {loading ? (
            <p className="text-soft">Loading production requests...</p>
          ) : !dashboard?.latestSupplies.length ? (
            <div className="empty-state">No supply requests yet.</div>
          ) : (
            <div className="table-wrap" style={{ marginTop: "0.7rem" }}>
              <table>
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

        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Resource Levels
          </h2>
          <div className="stack-sm" style={{ marginTop: "0.7rem" }}>
            {!dashboard?.lowStockRawMaterials.length ? (
              <div className="empty-state">No raw-material shortages detected.</div>
            ) : (
              dashboard.lowStockRawMaterials.map((material) => (
                <div key={material._id} className="surface-muted" style={{ padding: "0.65rem" }}>
                  <strong>{material.name}</strong>
                  <p className="text-soft" style={{ margin: "0.2rem 0 0" }}>
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
