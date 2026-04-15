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
      <section className="split-grid">
        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Product Selection
          </h2>

          {loading ? <p className="text-soft">Loading inventory list...</p> : null}

          <div className="form-grid" style={{ marginTop: "0.8rem" }}>
            <div className="field" style={{ gridColumn: "span 7" }}>
              <label htmlFor="product">Product Name</label>
              <select
                id="product"
                className="select"
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
            <div className="field" style={{ gridColumn: "span 3" }}>
              <label htmlFor="qty">Quantity</label>
              <input
                id="qty"
                type="number"
                min={1}
                className="input"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </div>
            <div className="field" style={{ gridColumn: "span 2", alignSelf: "end" }}>
              <button type="button" className="btn btn-secondary" onClick={addLineItem}>
                Add
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="stack-md" style={{ marginTop: "0.9rem" }}>
            <div className="table-wrap">
              <table>
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
                        <div className="empty-state">No line items yet.</div>
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
                              className="btn btn-ghost"
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

            <div className="field">
              <label htmlFor="notes">Handling Instructions</label>
              <textarea
                id="notes"
                className="textarea"
                value={handlingNotes}
                onChange={(event) => setHandlingNotes(event.target.value)}
                placeholder="Special handling notes, delivery windows, or packaging requirements..."
              />
            </div>

            {error ? <div className="message error">{error}</div> : null}
            {success ? <div className="message success">{success}</div> : null}

            <button type="submit" className="btn btn-primary" disabled={submitting || items.length === 0}>
              {submitting ? "Submitting..." : "Submit Order Request"}
            </button>
          </form>
        </article>

        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Request Summary
          </h2>
          <div className="stack-sm" style={{ marginTop: "0.7rem" }}>
            <div className="surface-muted" style={{ padding: "0.75rem" }}>
              <p className="kicker">Distinct Items</p>
              <strong>{items.length}</strong>
            </div>
            <div className="surface-muted" style={{ padding: "0.75rem" }}>
              <p className="kicker">Estimated Total</p>
              <strong>{formatCurrency(total)}</strong>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
