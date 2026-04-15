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
      <section className="surface" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", flexWrap: "wrap" }}>
          <p className="text-soft">Total orders: {orders.length}</p>
          <button type="button" className="btn btn-secondary" onClick={() => void loadOrders()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {error ? <div className="message error" style={{ marginTop: "0.7rem" }}>{error}</div> : null}
        {success ? <div className="message success" style={{ marginTop: "0.7rem" }}>{success}</div> : null}

        <div className="stack-md" style={{ marginTop: "0.9rem" }}>
          {orders.length === 0 ? (
            <div className="empty-state">No orders loaded yet.</div>
          ) : (
            orders.map((order) => (
              <article key={order._id} className="surface-muted" style={{ padding: "0.85rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.6rem",
                  }}
                >
                  <div className="stack-sm">
                    <strong>Order {order._id.slice(-6).toUpperCase()}</strong>
                    <span className="text-soft">Created {formatDate(order.createdAt)}</span>
                    <span className="text-soft">Dealer: {getDealerLabel(order)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                    <StatusBadge status={order.status} />
                    <span className="text-soft">{formatCurrency(order.totalAmount)}</span>
                    {(order.status === "Approved" || order.status === "Dispatched") ? (
                      <Link href={`/invoice/${order._id}?dealerId=${getDealerId(order)}`} className="btn btn-secondary">
                        Invoice
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="table-wrap" style={{ marginTop: "0.6rem" }}>
                  <table>
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
                                className="input"
                                style={{ width: "130px" }}
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
                    className="btn btn-primary"
                    style={{ marginTop: "0.6rem" }}
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
