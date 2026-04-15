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
        <div className="flex flex-wrap gap-2">
          <Link href="/orders/request" className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            Request New Order
          </Link>
          <Link href="/orders/my" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
            View All Orders
          </Link>
        </div>
      }
    >
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Active Inventory</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{inventory.length}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Open Order Threads</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{pendingCount}</div>
        </article>
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Inventory Alerts</div>
          <div className="mt-2 font-serif text-3xl font-bold text-[#c2652a]">{alerts.length}</div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Active Inventory Orders
          </h2>
          {loading ? (
            <p className="mt-3 text-sm text-[#605850]">Loading order summaries...</p>
          ) : orders.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No orders yet. Create your first order request.</div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
              <table className="min-w-full text-sm">
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

        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Inventory Alerts
          </h2>
          <div className="mt-3 space-y-2">
            {alerts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">All products are above threshold.</div>
            ) : (
              alerts.slice(0, 6).map((item) => (
                <div key={item._id} className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-3">
                  <strong>{item.name}</strong>
                  <p className="mt-1 text-sm text-[#605850]">
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

