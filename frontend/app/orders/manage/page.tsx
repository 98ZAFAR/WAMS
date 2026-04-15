"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wamsApi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeError, readProductId, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Order } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/*
Critical admin order-management note:
This view loads all orders using GET /api/orders for Admin role,
so pending, quoted, approved, dispatched, and any future statuses are visible.
Admin can still attach quotes only for Pending orders via PUT /api/orders/:id/quote.
*/
export default function OrdersManagementPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !user) {
      return;
    }

    if (user.role !== "Admin") {
      router.replace(roleHomePath(user.role));
      return;
    }
  }, [isReady, router, user]);

  const initializeQuoteDraft = (order: Order) => {
    const record: Record<string, string> = {};

    for (const item of order.items) {
      record[readProductId(item.product)] = String(item.unitPrice);
    }

    return record;
  };

  const loadOrders = useCallback(async () => {
    setError(null);

    if (!token) {
      setError("Unauthorized session.");
      return;
    }

    setLoading(true);

    try {
      const data = await wamsApi.getAllOrders(token);
      setOrders(data);

      const nextDrafts: Record<string, Record<string, string>> = {};
      data.forEach((order) => {
        nextDrafts[order._id] = initializeQuoteDraft(order);
      });
      setQuoteDrafts(nextDrafts);
    } catch (loadError) {
      setError(normalizeError(loadError));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Admin") {
      router.replace(roleHomePath(user.role));
      return;
    }

    void loadOrders();
  }, [isReady, loadOrders, router, token, user]);

  const getDealerId = (order: Order) => {
    return typeof order.dealer === "string" ? order.dealer : order.dealer._id;
  };

  const getDealerLabel = (order: Order) => {
    if (typeof order.dealer === "string") {
      return order.dealer;
    }

    return order.dealer.businessName || order.dealer.name;
  };

  const submitQuote = async (order: Order) => {
    if (!token) {
      return;
    }

    const orderDraft = quoteDrafts[order._id] || {};

    const items = order.items.map((item) => {
      const productId = readProductId(item.product);
      const unitPrice = Number(orderDraft[productId]);

      return {
        product: productId,
        unitPrice,
      };
    });

    if (items.some((entry) => !Number.isFinite(entry.unitPrice) || entry.unitPrice < 0)) {
      setError("All quote unit prices must be valid non-negative numbers.");
      return;
    }

    setError(null);
    setSuccess(null);
    setWorkingOrderId(order._id);

    try {
      const response = await wamsApi.addQuote(token, order._id, items);
      setSuccess(response.message);
      await loadOrders();
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setWorkingOrderId(null);
    }
  };

  return (
    <AppShell
      requiredRoles={["Admin"]}
      title="Order Management"
      subtitle="All orders are shown here across every status, with quote control for pending ones."
    >
      <section className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#605850]">Total orders: {orders.length}</p>
          <button type="button" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void loadOrders()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {error ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

        <div className="mt-4 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No orders loaded yet.</div>
          ) : (
            orders.map((order) => (
              <article key={order._id} className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-3 md:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-2">
                    <strong>Order {order._id.slice(-6).toUpperCase()}</strong>
                    <span className="text-sm text-[#605850]">Created {formatDate(order.createdAt)}</span>
                    <span className="text-sm text-[#605850]">Dealer: {getDealerLabel(order)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status} />
                    <span className="text-sm text-[#605850]">{formatCurrency(order.totalAmount)}</span>
                    {(order.status === "Approved" || order.status === "Dispatched") ? (
                      <Link href={`/invoice/${order._id}?dealerId=${getDealerId(order)}`} className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
                        Invoice
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Current Unit Price</th>
                        <th>Quoted Unit Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => {
                        const productId = readProductId(item.product);
                        return (
                          <tr key={`${order._id}-${productId}-${index}`}>
                            <td>{readProductName(item.product)}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unitPrice)}</td>
                            <td>
                              <input
                                className="w-32 rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                                type="number"
                                min={0}
                                step="0.01"
                                value={quoteDrafts[order._id]?.[productId] || "0"}
                                disabled={order.status !== "Pending"}
                                onChange={(event) =>
                                  setQuoteDrafts((previous) => ({
                                    ...previous,
                                    [order._id]: {
                                      ...(previous[order._id] || {}),
                                      [productId]: event.target.value,
                                    },
                                  }))
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {order.status === "Pending" ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={workingOrderId === order._id}
                    onClick={() => submitQuote(order)}
                  >
                    {workingOrderId === order._id ? "Applying Quote..." : "Attach Quote"}
                  </button>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}

