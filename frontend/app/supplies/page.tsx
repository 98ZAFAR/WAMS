"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { wamsApi } from "@/lib/api";
import { formatCurrency, formatDate, normalizeError, readProductName } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Supply } from "@/lib/types";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

export default function SuppliesPage() {
  const router = useRouter();
  const { isReady, token, user } = useAuth();

  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [workingSupplyId, setWorkingSupplyId] = useState<string | null>(null);

  const loadSupplies = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();

    if (!token) {
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const data = await wamsApi.getSupplies(token, {
        status: statusFilter || undefined,
        supplierId: supplierId.trim() || undefined,
      });

      setSupplies(data);
    } catch (loadError) {
      setError(normalizeError(loadError));
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, supplierId, token]);

  useEffect(() => {
    if (!isReady || !user || !token) {
      return;
    }

    if (user.role !== "Admin") {
      router.replace(roleHomePath(user.role));
      return;
    }

    void loadSupplies();
  }, [isReady, loadSupplies, router, token, user]);

  const updateStatus = async (supplyId: string, status: "Approved" | "Received" | "Rejected") => {
    if (!token) {
      return;
    }

    setWorkingSupplyId(supplyId);
    setError(null);
    setSuccess(null);

    try {
      const response = await wamsApi.updateSupplyStatus(token, supplyId, status);
      setSuccess(response.message);
      await loadSupplies();
    } catch (updateError) {
      setError(normalizeError(updateError));
    } finally {
      setWorkingSupplyId(null);
    }
  };

  return (
    <AppShell
      requiredRoles={["Admin"]}
      title="Supplier Supplies"
      subtitle="Review supplier submissions and control approval/receiving states."
    >
      <section className="surface" style={{ padding: "1rem" }}>
        <form className="form-grid" onSubmit={loadSupplies}>
          <div className="field" style={{ gridColumn: "span 4" }}>
            <label htmlFor="status">Status</label>
            <select id="status" className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "span 6" }}>
            <label htmlFor="supplierId">Supplier ID (Optional)</label>
            <input
              id="supplierId"
              className="input"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              placeholder="Filter by supplier user id"
            />
          </div>
          <div className="field" style={{ gridColumn: "span 2", alignSelf: "end" }}>
            <button type="submit" className="btn btn-secondary">
              Filter
            </button>
          </div>
        </form>

        {error ? <div className="message error" style={{ marginTop: "0.7rem" }}>{error}</div> : null}
        {success ? <div className="message success" style={{ marginTop: "0.7rem" }}>{success}</div> : null}

        {loading ? (
          <p className="text-soft" style={{ marginTop: "0.75rem" }}>Loading supply requests...</p>
        ) : supplies.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "0.75rem" }}>No supply requests found.</div>
        ) : (
          <div className="table-wrap" style={{ marginTop: "0.75rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total Cost</th>
                  <th>Status</th>
                  <th>Expected Delivery</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {supplies.map((supply) => (
                  <tr key={supply._id}>
                    <td>{supply._id.slice(-6).toUpperCase()}</td>
                    <td>{typeof supply.supplier === "string" ? supply.supplier : supply.supplier.name}</td>
                    <td>{readProductName(supply.product)}</td>
                    <td>{supply.quantity}</td>
                    <td>{formatCurrency(supply.totalCost)}</td>
                    <td>
                      <StatusBadge status={supply.status} />
                    </td>
                    <td>{formatDate(supply.expectedDeliveryDate)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={workingSupplyId === supply._id}
                          onClick={() => updateStatus(supply._id, "Approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={workingSupplyId === supply._id}
                          onClick={() => updateStatus(supply._id, "Received")}
                        >
                          Receive
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={workingSupplyId === supply._id}
                          onClick={() => updateStatus(supply._id, "Rejected")}
                        >
                          Reject
                        </button>
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
