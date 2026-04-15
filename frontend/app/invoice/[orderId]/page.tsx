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
      {error ? <div className="message error">{error}</div> : null}

      <section className="surface" style={{ padding: "1.2rem" }}>
        {loading ? (
          <p className="text-soft">Loading invoice data...</p>
        ) : !order ? (
          <div className="empty-state">No invoice data available.</div>
        ) : (
          <div className="stack-md">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
              <div>
                <p className="kicker">Invoice ID</p>
                <h2 className="headline" style={{ fontSize: "1.6rem" }}>
                  {invoiceInfo.invoiceId}
                </h2>
              </div>
              <div className="stack-sm">
                <div>
                  <span className="text-soft">Billing Date: </span>
                  <strong>{formatDate(invoiceInfo.billingDate)}</strong>
                </div>
                <div>
                  <span className="text-soft">Payment Status: </span>
                  <strong>{invoiceInfo.paymentStatus}</strong>
                </div>
              </div>
            </div>

            <div className="surface-muted" style={{ padding: "0.9rem" }}>
              <p className="kicker">Billed To</p>
              <p style={{ margin: "0.2rem 0 0" }}>
                {typeof order.dealer === "string"
                  ? order.dealer
                  : `${order.dealer.name} (${order.dealer.businessName || "No business name"})`}
              </p>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={`${order._id}-${index}`}>
                      <td>{readProductName(item.product)}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ justifySelf: "end", textAlign: "right" }}>
              <p className="kicker">Total Amount</p>
              <h3 className="headline" style={{ fontSize: "1.6rem" }}>
                {formatCurrency(order.totalAmount)}
              </h3>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
