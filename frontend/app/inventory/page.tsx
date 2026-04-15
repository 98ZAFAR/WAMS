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
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
              Product Catalog
            </h2>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <input
                placeholder="Search inventory..."
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20 sm:w-56"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20 sm:w-44"
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
            <p className="mt-3 text-sm text-[#605850]">Loading inventory table...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">
              No products match your filter.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
              <table className="min-w-full text-sm">
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
                          type="number"
                          className="w-24 rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
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
                          className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60"
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

        <article className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
          <h2 className="font-serif text-2xl font-bold text-[#3a302a]">
            Add New Product
          </h2>
          <form className="mt-3 space-y-4" onSubmit={addProduct}>
            <div className="space-y-2">
              <label htmlFor="name">Product Name</label>
              <input id="name" className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="type">Category</label>
              <select id="type" className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" value={type} onChange={(event) => setType(event.target.value as "RawMaterial" | "FinishedGood")}> 
                <option value="RawMaterial">RawMaterial</option>
                <option value="FinishedGood">FinishedGood</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="price">Unit Price</label>
              <input
                id="price"
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="stock">Initial Stock</label>
              <input
                id="stock"
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                type="number"
                min={0}
                value={currentStock}
                onChange={(event) => setCurrentStock(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="threshold">Alert Threshold</label>
              <input
                id="threshold"
                className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
                type="number"
                min={0}
                value={minThreshold}
                onChange={(event) => setMinThreshold(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
              {submitting ? "Saving..." : "Create Product"}
            </button>
          </form>
        </article>
      </section>
    </AppShell>
  );
}

