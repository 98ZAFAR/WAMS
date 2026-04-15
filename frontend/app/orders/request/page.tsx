"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { formatCurrency, normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

/*
Critical order-request contract:
Backend endpoint /api/orders/request only accepts items with { product, quantity }.
Handling instructions are captured for UX parity with stitch design but are not sent
because the current backend schema has no notes field on Order.
*/
export default function OrderRequestPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [inventory, setInventory] = useState<Product[]>([]);
  const [items, setItems] = useState<Array<{ product: string; quantity: number }>>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [handlingNotes, setHandlingNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Dealer") {
      router.replace(roleHomePath(user.role));
      return;
    }

    const loadInventory = async () => {
      setLoading(true);

      try {
        const data = await wamsApi.getInventory(token);
        setInventory(data);
      } catch (loadError) {
        setError(normalizeError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void loadInventory();
  }, [isReady, router, token, user]);

  const inventoryById = useMemo(() => {
    return new Map(inventory.map((product) => [product._id, product]));
  }, [inventory]);

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      const product = inventoryById.get(item.product);
      return acc + (product?.price || 0) * item.quantity;
    }, 0);
  }, [inventoryById, items]);

  const addLineItem = () => {
    setError(null);
    setSuccess(null);

    if (!selectedProduct) {
      setError("Select a product first.");
      return;
    }

    if (quantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    const existing = items.find((entry) => entry.product === selectedProduct);

    if (existing) {
      setItems((previous) =>
        previous.map((entry) =>
          entry.product === selectedProduct
            ? { ...entry, quantity: entry.quantity + quantity }
            : entry,
        ),
      );
    } else {
      setItems((previous) => [...previous, { product: selectedProduct, quantity }]);
    }

    setQuantity(1);
  };

  const removeItem = (productId: string) => {
    setItems((previous) => previous.filter((entry) => entry.product !== productId));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Unauthorized session.");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one product to the request.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await wamsApi.requestOrder(token, items);
      setItems([]);
      setHandlingNotes("");
      setSuccess(`${response.message} (Order: ${response.order._id.slice(-6).toUpperCase()})`);
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      requiredRoles={["Dealer"]}
      title="Create Order Request"
      subtitle="Build your quote request from available inventory products."
    >
      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Product Selection
          </h2>

          {loading ? <p className="mt-3 text-sm text-[#605850]">Loading inventory list...</p> : null}

          <div className="mt-3 grid gap-4 md:grid-cols-12">
            <div className="space-y-2 md:col-span-7">
              <label htmlFor="product">Product Name</label>
              <select
                id="product"
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                value={selectedProduct}
                onChange={(event) => setSelectedProduct(event.target.value)}
              >
                <option value="">Select product</option>
                {inventory.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-3">
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </div>
            <div className="space-y-2 md:col-span-2 md:self-end">
              <button type="button" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60" onClick={addLineItem}>
                Add
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No line items yet.</div>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const product = inventoryById.get(item.product);
                      const subtotal = (product?.price || 0) * item.quantity;

                      return (
                        <tr key={item.product}>
                          <td>{product?.name || item.product}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(subtotal)}</td>
                          <td>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-[#8c3c3c] transition hover:bg-[#fbe8d8]"
                              onClick={() => removeItem(item.product)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes">Handling Instructions</label>
              <textarea
                id="notes"
                className="w-full min-h-30 rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                value={handlingNotes}
                onChange={(event) => setHandlingNotes(event.target.value)}
                placeholder="Special handling notes, delivery windows, or packaging requirements..."
              />
            </div>

            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
            {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

            <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting || items.length === 0}>
              {submitting ? "Submitting..." : "Submit Order Request"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Request Summary
          </h2>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Distinct Items</p>
              <strong>{items.length}</strong>
            </div>
            <div className="rounded-xl border border-[#d8d0c8] bg-[#f7f1e9] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#78706a]">Estimated Total</p>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}

