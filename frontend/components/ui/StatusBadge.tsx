import { toStatusClass } from "@/lib/format";

export const StatusBadge = ({ status }: { status?: string }) => {
  return <span className={`badge ${toStatusClass(status)}`}>{status || "Pending"}</span>;
};
