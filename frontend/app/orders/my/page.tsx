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
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

      <section className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
        {loading ? (
          <p className="text-sm text-[#605850]">Loading your order history...</p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No orders found yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
            <table className="min-w-full text-sm">
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
                      <div className="flex flex-wrap gap-2">
                        {order.status === "Quoted" ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => approveQuotedOrder(order._id)}
                            disabled={workingOrderId === order._id}
                          >
                            {workingOrderId === order._id ? "Approving..." : "Approve Quote"}
                          </button>
                        ) : null}

                        {order.status === "Approved" || order.status === "Dispatched" ? (
                          <Link href={`/invoice/${order._id}`} className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
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

