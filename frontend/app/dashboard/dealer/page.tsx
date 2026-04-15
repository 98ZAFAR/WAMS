"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wamsApi } from "@/lib/api";
import { formatCurrency, normalizeError, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Order, Product } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function DealerDashboardPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Dealer") {
      router.replace(roleHomePath(user.role));
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [orderData, inventoryData] = await Promise.all([
          wamsApi.getDealerOrders(token, user.id),
          wamsApi.getInventory(token),
        ]);

        setOrders(orderData);
        setInventory(inventoryData);
      } catch (loadError) {
        setError(normalizeError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, router, token, user]);

  const pendingCount = useMemo(() => {
    return orders.filter((order) => ["Pending", "Quoted"].includes(order.status)).length;
  }, [orders]);

  const alerts = useMemo(() => {
    return inventory.filter((item) => item.currentStock < item.minThreshold);
  }, [inventory]);

  return (
    <AppShell
      requiredRoles={["Dealer"]}
      title="Dealer Dashboard"
      subtitle="Live inventory visibility, recent order activity, and low-stock watchlist."
      actions={
        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          <Link href="/orders/request" className="btn btn-primary">
            Request New Order
          </Link>
          <Link href="/orders/my" className="btn btn-secondary">
            View All Orders
          </Link>
        </div>
      }
    >
      {error ? <div className="message error">{error}</div> : null}

      <section className="kpi-grid">
        <article className="surface kpi-card">
          <div className="kicker">Active Inventory</div>
          <div className="kpi-value">{inventory.length}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Open Order Threads</div>
          <div className="kpi-value">{pendingCount}</div>
        </article>
        <article className="surface kpi-card">
          <div className="kicker">Inventory Alerts</div>
          <div className="kpi-value">{alerts.length}</div>
        </article>
      </section>

      <section className="split-grid">
        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Active Inventory Orders
          </h2>
          {loading ? (
            <p className="text-soft">Loading order summaries...</p>
          ) : orders.length === 0 ? (
            <div className="empty-state">No orders yet. Create your first order request.</div>
          ) : (
            <div className="table-wrap" style={{ marginTop: "0.7rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product Group</th>
                    <th>Status</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map((order) => (
                    <tr key={order._id}>
                      <td>{order._id.slice(-6).toUpperCase()}</td>
                      <td>{order.items.map((item) => readProductName(item.product)).join(", ")}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Inventory Alerts
          </h2>
          <div className="stack-sm" style={{ marginTop: "0.7rem" }}>
            {alerts.length === 0 ? (
              <div className="empty-state">All products are above threshold.</div>
            ) : (
              alerts.slice(0, 6).map((item) => (
                <div key={item._id} className="surface-muted" style={{ padding: "0.7rem" }}>
                  <strong>{item.name}</strong>
                  <p className="text-soft" style={{ margin: "0.2rem 0 0" }}>
                    {item.currentStock} in stock, threshold {item.minThreshold}
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
