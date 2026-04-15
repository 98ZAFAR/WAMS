"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { readLastInvoice } from "@/lib/auth-storage";
import { wamsApi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeError, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Order } from "@/lib/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function InvoiceViewPage() {
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderId = params.orderId;

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (!["Dealer", "Admin"].includes(user.role)) {
      router.replace(roleHomePath(user.role));
      return;
    }

    const loadOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const dealerId =
          user.role === "Dealer" ? user.id : searchParams.get("dealerId") || "";

        if (!dealerId) {
          setError("Admin invoice view requires dealerId query parameter.");
          setLoading(false);
          return;
        }

        const orders = await wamsApi.getDealerOrders(token, dealerId);
        const selected = orders.find((entry) => entry._id === orderId) || null;

        if (!selected) {
          setError("Order not found in dealer history.");
          setLoading(false);
          return;
        }

        setOrder(selected);
      } catch (loadError) {
        setError(normalizeError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [isReady, orderId, router, searchParams, token, user]);

  const invoiceInfo = useMemo(() => {
    const fallback = {
      invoiceId: `INV-${orderId.slice(-6).toUpperCase()}`,
      billingDate: order?.updatedAt || order?.createdAt || new Date().toISOString(),
      paymentStatus: "Pending",
    };

    const cached = readLastInvoice();

    if (!cached || cached.orderId !== orderId) {
      return fallback;
    }

    return {
      invoiceId: cached.invoiceId || fallback.invoiceId,
      billingDate: cached.billingDate || fallback.billingDate,
      paymentStatus: cached.paymentStatus || fallback.paymentStatus,
    };
  }, [order?.createdAt, order?.updatedAt, orderId]);

  return (
    <AppShell
      requiredRoles={["Dealer", "Admin"]}
      title="Invoice"
      subtitle="Printable invoice view based on approved order details."
    >
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-5 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
        {loading ? (
          <p className="text-sm text-[#605850]">Loading invoice data...</p>
        ) : !order ? (
          <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">
            No invoice data available.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Invoice ID</p>
                <h2 className="font-serif text-[1.6rem] font-bold text-[#3a302a]">
                  {invoiceInfo.invoiceId}
                </h2>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-[#605850]">Billing Date: </span>
                  <strong>{formatDate(invoiceInfo.billingDate)}</strong>
                </div>
                <div>
                  <span className="text-sm text-[#605850]">Payment Status: </span>
                  <strong>{invoiceInfo.paymentStatus}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Billed To</p>
              <p className="mt-1">
                {typeof order.dealer === "string"
                  ? order.dealer
                  : `${order.dealer.name} (${order.dealer.businessName || "No business name"})`}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-[#ece6de] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#78706a]">
                      Item Description
                    </th>
                    <th className="border-b border-[#ece6de] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#78706a]">
                      Qty
                    </th>
                    <th className="border-b border-[#ece6de] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#78706a]">
                      Unit Price
                    </th>
                    <th className="border-b border-[#ece6de] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#78706a]">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${order._id}-${index}`}>
                      <td className="border-b border-[#f2ece4] px-4 py-3">{readProductName(item.product)}</td>
                      <td className="border-b border-[#f2ece4] px-4 py-3">{item.quantity}</td>
                      <td className="border-b border-[#f2ece4] px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                      <td className="border-b border-[#f2ece4] px-4 py-3">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Total Amount</p>
              <h3 className="font-serif text-[1.6rem] font-bold text-[#3a302a]">
                {formatCurrency(order.totalAmount)}
              </h3>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
