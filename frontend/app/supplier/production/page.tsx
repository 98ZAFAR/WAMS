"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wamsApi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeError, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Product, Supply } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

/*
Critical supplier-production rule:
Backend only accepts supply requests for products where type === RawMaterial.
This page filters selectable products to RawMaterial before calling
POST /api/suppliers/supplies and reads request history via GET /api/suppliers/supplies.
*/
export default function SupplierProductionPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const rawMaterials = useMemo(() => {
    return products.filter((item) => item.type === "RawMaterial");
  }, [products]);

  const loadData = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [inventoryData, supplyData] = await Promise.all([
        wamsApi.getInventory(token),
        wamsApi.getSupplies(token, { status: statusFilter || undefined }),
      ]);

      setProducts(inventoryData);
      setSupplies(supplyData);
    } catch (loadError) {
      setError(normalizeError(loadError));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Supplier") {
      router.replace(roleHomePath(user.role));
      return;
    }

    void loadData();
  }, [isReady, loadData, router, token, user]);

  const submitSupplyRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      return;
    }

    if (!product) {
      setError("Select a raw material product first.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await wamsApi.createSupplyRequest(token, {
        product,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        expectedDeliveryDate: expectedDeliveryDate || undefined,
      });

      setSuccess(response.message);
      setQuantity("1");
      setUnitCost("0");
      setExpectedDeliveryDate("");
      await loadData();
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      requiredRoles={["Supplier"]}
      title="Production Orders"
      subtitle="Create raw-material supply requests and track lifecycle status."
    >
      {error ? <div className="message error">{error}</div> : null}
      {success ? <div className="message success">{success}</div> : null}

      <section className="split-grid">
        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            New Supply Request
          </h2>
          <form className="stack-md" style={{ marginTop: "0.8rem" }} onSubmit={submitSupplyRequest}>
            <div className="field">
              <label htmlFor="product">Raw Material Product</label>
              <select id="product" className="select" value={product} onChange={(event) => setProduct(event.target.value)}>
                <option value="">Select Raw Material</option>
                {rawMaterials.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="quantity">Quantity</label>
              <input
                id="quantity"
                className="input"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="unitCost">Unit Cost</label>
              <input
                id="unitCost"
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="eta">Expected Delivery Date</label>
              <input
                id="eta"
                className="input"
                type="date"
                value={expectedDeliveryDate}
                onChange={(event) => setExpectedDeliveryDate(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Create Supply Request"}
            </button>
          </form>
        </article>

        <article className="surface" style={{ padding: "1rem" }}>
          <h2 className="headline" style={{ fontSize: "1.45rem" }}>
            System Optimization
          </h2>
          <div className="field" style={{ marginTop: "0.7rem" }}>
            <label htmlFor="statusFilter">Status Filter</label>
            <select
              id="statusFilter"
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <p className="text-soft" style={{ marginTop: "0.6rem" }}>
            Only admin can advance request status to Approved/Received/Rejected.
          </p>
        </article>
      </section>

      <section className="surface" style={{ padding: "1rem" }}>
        {loading ? (
          <p className="text-soft">Loading production orders...</p>
        ) : supplies.length === 0 ? (
          <div className="empty-state">No production orders found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Product</th>
                  <th>Priority</th>
                  <th>Order Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((supply) => (
                  <tr key={supply._id}>
                    <td>{supply._id.slice(-6).toUpperCase()}</td>
                    <td>{readProductName(supply.product)}</td>
                    <td>{supply.quantity > 100 ? "High" : supply.quantity > 50 ? "Medium" : "Normal"}</td>
                    <td>{formatDate(supply.createdAt)}</td>
                    <td>{formatDate(supply.expectedDeliveryDate)}</td>
                    <td>
                      <StatusBadge status={supply.status} />
                    </td>
                    <td>{formatCurrency(supply.totalCost)}</td>
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
