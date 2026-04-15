const getStatusClasses = (status?: string) => {
  const normalized = String(status || "Pending").toLowerCase();

  if (["approved", "received", "dispatched", "paid", "normal"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "quoted") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (["rejected", "failed", "high"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
};

export const StatusBadge = ({ status }: { status?: string }) => {
  const label = status || "Pending";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusClasses(status)}`}
    >
      {label}
    </span>
  );
};
