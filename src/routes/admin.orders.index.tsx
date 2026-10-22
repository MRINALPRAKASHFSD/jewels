import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  AdminPageHeader,
  AdminState,
  DataTable,
  Panel,
  StatusBadge,
} from "@/components/admin/AdminUI";
import { inputCls } from "@/components/admin/cms-ui";
import { formatDate, ordersList } from "@/lib/admin/data";
import { RequireAccess } from "@/lib/admin/use-admin";

const ORDER_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "cancelled",
  "refunded",
] as const;

export const Route = createFileRoute("/admin/orders/")({
  validateSearch: z.object({ status: z.enum(ORDER_STATUSES).optional() }),
  head: () => ({
    meta: [{ title: "Orders — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <RequireAccess resource="orders">
      <OrdersPage />
    </RequireAccess>
  ),
});

function OrdersPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const { data, isLoading, isError } = useQuery(ordersList(status));

  const filtered = (data ?? []).filter((o) => {
    if (!term) return true;
    const t = term.toLowerCase();
    return (
      o.customerName.toLowerCase().includes(t) ||
      o.customerEmail.toLowerCase().includes(t) ||
      o.customerPhone.includes(t) ||
      o.id.toLowerCase().includes(t) ||
      (o.cfOrderId && o.cfOrderId.toLowerCase().includes(t))
    );
  });

  const tabs = [undefined, ...ORDER_STATUSES];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Online orders processed through Cashfree (UPI, Debit & Credit Cards)."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => navigate({ to: "/admin/orders", search: { status: t } })}
              className={cn(
                "whitespace-nowrap rounded-sm px-3 py-1.5 text-xs capitalize",
                status === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {t ?? "All"}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search order ID, name, email…"
          aria-label="Search orders"
          className={`${inputCls} sm:max-w-xs`}
        />
      </div>
      <Panel title={`${filtered.length} orders`}>
        {isError ? (
          <AdminState
            icon="alert"
            title="Couldn't load orders"
            body="Please refresh the page to try again."
          />
        ) : (
          <DataTable
            rows={filtered}
            rowKey={(r) => r.id}
            empty={isLoading ? "Loading…" : "No orders found."}
            columns={[
              {
                header: "Order ID",
                cell: (r) => (
                  <span className="font-mono text-xs font-medium" title={r.id}>
                    {r.id.slice(0, 8)}…
                  </span>
                ),
              },
              {
                header: "Customer",
                cell: (r) => (
                  <div>
                    <span className="font-medium block">{r.customerName}</span>
                    <span className="text-xs text-muted-foreground block">{r.customerEmail}</span>
                  </div>
                ),
              },
              {
                header: "Amount",
                cell: (r) => (
                  <span className="font-medium tabular-nums">
                    ₹{r.amount.toLocaleString("en-IN")}
                  </span>
                ),
              },
              {
                header: "Payment Status",
                cell: (r) => <StatusBadge status={r.paymentStatus ?? r.orderStatus} />,
              },
              {
                header: "Order Status",
                cell: (r) => <StatusBadge status={r.orderStatus} />,
                className: "hidden sm:table-cell",
              },
              {
                header: "Method",
                cell: (r) => (
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {r.paymentMethod ?? "—"}
                  </span>
                ),
                className: "hidden md:table-cell",
              },
              {
                header: "Date",
                cell: (r) => (
                  <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                ),
                className: "hidden lg:table-cell",
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
