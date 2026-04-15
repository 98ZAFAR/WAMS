"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { formatCurrency, normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

/*
Critical inventory contract:
- Product creation uses POST /api/inventory with { name, type, price, currentStock, minThreshold }.
- Stock adjustment uses PUT /api/inventory/:id/stock with signed quantityChange (positive or negative).
- Backend enforces Admin role for both write operations.
*/
export default function InventoryPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "RawMaterial" | "FinishedGood">("All");
  const [stockChanges, setStockChanges] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [type, setType] = useState<"RawMaterial" | "FinishedGood">("RawMaterial");
  const [price, setPrice] = useState("0");
  const [currentStock, setCurrentStock] = useState("0");
  const [minThreshold, setMinThreshold] = useState("0");

  const loadInventory = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await wamsApi.getInventory(token);
      setProducts(data);
    } catch (loadError) {
      setError(normalizeError(loadError));
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

    void loadInventory();
  }, [isReady, loadInventory, router, token, user]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchType = typeFilter === "All" || product.type === typeFilter;
      const term = search.trim().toLowerCase();
      const matchSearch = !term || product.name.toLowerCase().includes(term);
      return matchType && matchSearch;
    });
  }, [products, search, typeFilter]);

  const addProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await wamsApi.addProduct(token, {
        name,
        type,
        price: Number(price),
        currentStock: Number(currentStock),
        minThreshold: Number(minThreshold),
      });

      setSuccess(response.message);
      setName("");
      setType("RawMaterial");
      setPrice("0");
      setCurrentStock("0");
      setMinThreshold("0");
      await loadInventory();
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const applyStockChange = async (productId: string) => {
    if (!token) {
      return;
    }

    const rawValue = stockChanges[productId] || "0";
    const delta = Number(rawValue);

    if (!Number.isFinite(delta) || delta === 0) {
      setError("Stock adjustment must be a non-zero number.");
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await wamsApi.updateStock(token, productId, delta);
      setSuccess(response.message);
      setStockChanges((previous) => ({ ...previous, [productId]: "0" }));
      await loadInventory();
    } catch (updateError) {
      setError(normalizeError(updateError));
    }
  };

  return (
    <AppShell
      requiredRoles={["Admin"]}
      title="Inventory Control"
      subtitle="Create products, monitor thresholds, and update stock in real time."
    >
      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      <section className="split-grid">
        <article className="surface" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", flexWrap: "wrap" }}>
            <h2 className="headline" style={{ fontSize: "1.45rem" }}>
              Product Catalog
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                className="input"
                placeholder="Search inventory..."
                style={{ width: "220px" }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="select"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "All" | "RawMaterial" | "FinishedGood")}
              >
                <option value="All">All</option>
                <option value="RawMaterial">Raw Materials</option>
                <option value="FinishedGood">Finished Goods</option>
              </select>
            </div>
          </div>

          {loading ? (
            <p className="text-soft">Loading inventory table...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "0.8rem" }}>
              No products match your filter.
            </div>
          ) : (
            <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Stock Level</th>
                    <th>Threshold</th>
                    <th>Adjust</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product._id}>
                      <td>{product.name}</td>
                      <td>{product.type}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <strong>{product.currentStock}</strong>
                      </td>
                      <td>{product.minThreshold}</td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          style={{ width: "105px" }}
                          value={stockChanges[product._id] || "0"}
                          onChange={(event) =>
                            setStockChanges((previous) => ({
                              ...previous,
                              [product._id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => applyStockChange(product._id)}
                        >
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            Add New Product
          </h2>
          <form className="stack-md" style={{ marginTop: "0.8rem" }} onSubmit={addProduct}>
            <div className="field">
              <label htmlFor="name">Product Name</label>
              <input id="name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="type">Category</label>
              <select id="type" className="select" value={type} onChange={(event) => setType(event.target.value as "RawMaterial" | "FinishedGood")}> 
                <option value="RawMaterial">RawMaterial</option>
                <option value="FinishedGood">FinishedGood</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="price">Unit Price</label>
              <input
                id="price"
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="stock">Initial Stock</label>
              <input
                id="stock"
                className="input"
                type="number"
                min={0}
                value={currentStock}
                onChange={(event) => setCurrentStock(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="threshold">Alert Threshold</label>
              <input
                id="threshold"
                className="input"
                type="number"
                min={0}
                value={minThreshold}
                onChange={(event) => setMinThreshold(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Create Product"}
            </button>
          </form>
        </article>
      </section>
    </AppShell>
  );
}
