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
      <section className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
        <form className="grid gap-4 md:grid-cols-12" onSubmit={loadSupplies}>
          <div className="space-y-2 md:col-span-4">
            <label htmlFor="status">Status</label>
            <select id="status" className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Received">Received</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-6">
            <label htmlFor="supplierId">Supplier ID (Optional)</label>
            <input
              id="supplierId"
              className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              placeholder="Filter by supplier user id"
            />
          </div>
          <div className="space-y-2 md:col-span-2 md:self-end">
            <button type="submit" className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60">
              Filter
            </button>
          </div>
        </form>

        {error ? <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

        {loading ? (
          <p className="mt-3 text-sm text-[#605850]">Loading supply requests...</p>
        ) : supplies.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[#d8d0c8] bg-[#faf5ee] px-4 py-6 text-sm text-[#78706a]">No supply requests found.</div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-xl border border-[#d8d0c8]/70">
            <table className="min-w-full text-sm">
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={workingSupplyId === supply._id}
                          onClick={() => updateStatus(supply._id, "Approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg border border-[#d8d0c8] bg-white px-4 py-2 text-sm font-semibold text-[#3a302a] transition hover:bg-[#f2ece4] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={workingSupplyId === supply._id}
                          onClick={() => updateStatus(supply._id, "Received")}
                        >
                          Receive
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium text-[#8c3c3c] transition hover:bg-[#fbe8d8]"
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

