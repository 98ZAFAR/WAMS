"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { saveLastInvoice } from "@/lib/auth-storage";
import { wamsApi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeError, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Order } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function MyOrdersPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingOrderId, setWorkingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!token || !user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await wamsApi.getDealerOrders(token, user.id);
      setOrders(data);
    } catch (loadError) {
      setError(normalizeError(loadError));
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Dealer") {
      router.replace(roleHomePath(user.role));
      return;
    }

    void loadOrders();
  }, [isReady, loadOrders, router, token, user]);

  const approveQuotedOrder = async (orderId: string) => {
    if (!token) {
      return;
    }

    setWorkingOrderId(orderId);
    setError(null);
    setSuccess(null);

    try {
      const response = await wamsApi.approveOrder(token, orderId);

      saveLastInvoice({
        orderId,
        invoiceId: response.invoice._id,
        billingDate: response.invoice.billingDate,
        paymentStatus: response.invoice.paymentStatus,
      });

      setSuccess(`Order approved. Invoice ${response.invoice._id.slice(-6).toUpperCase()} created.`);
      await loadOrders();
    } catch (approveError) {
      setError(normalizeError(approveError));
    } finally {
      setWorkingOrderId(null);
    }
  };

  return (
    <AppShell
      requiredRoles={["Dealer"]}
      title="Order History"
      subtitle="Track status, approve quoted orders, and open invoice view for approved orders."
    >
      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      <section className="surface" style={{ padding: "1rem" }}>
        {loading ? (
          <p className="text-soft">Loading your order history...</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders found yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Products</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>{order._id.slice(-6).toUpperCase()}</td>
                    <td>{formatDate(order.createdAt)}</td>
                    <td>
                      <StatusBadge status={order.status} />
                    </td>
                    <td>{formatCurrency(order.totalAmount)}</td>
                    <td>{order.items.map((item) => readProductName(item.product)).join(", ")}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {order.status === "Quoted" ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => approveQuotedOrder(order._id)}
                            disabled={workingOrderId === order._id}
                          >
                            {workingOrderId === order._id ? "Approving..." : "Approve Quote"}
                          </button>
                        ) : null}

                        {order.status === "Approved" || order.status === "Dispatched" ? (
                          <Link href={`/invoice/${order._id}`} className="btn btn-secondary">
                            View Invoice
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
