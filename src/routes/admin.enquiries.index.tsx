import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { AdminPageHeader, AdminState, DataTable, Panel, StatusBadge } from "@/components/admin/AdminUI";
import { inputCls } from "@/components/admin/cms-ui";
import { searchEnquiries } from "@/lib/admin/cms";
import { ENQUIRY_STATUSES, formatDate, SOURCE_LABEL } from "@/lib/admin/data";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/enquiries/")({
  validateSearch: z.object({ status: z.enum(ENQUIRY_STATUSES).optional() }),
  head: () => ({ meta: [{ title: "Enquiries — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="enquiries"><EnquiriesPage /></RequireAccess>,
});

function EnquiriesPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => { const t = setTimeout(() => setQ(term), 350); return () => clearTimeout(t); }, [term]);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "enquiries-cms", status, q], queryFn: () => searchEnquiries(status, q), placeholderData: keepPreviousData });
  const tabs = [undefined, ...ENQUIRY_STATUSES];
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Enquiries" description="Client requests from WhatsApp, the contact form and appointments." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t ?? "all"} onClick={() => navigate({ to: "/admin/enquiries", search: { status: t } })}
              className={cn("whitespace-nowrap rounded-sm px-3 py-1.5 text-xs capitalize", status === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}>{t ?? "All"}</button>
          ))}
        </div>
        <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, phone, email, product…" aria-label="Search enquiries" className={`${inputCls} sm:max-w-xs`} />
      </div>
      <Panel title={`${data?.length ?? 0} enquiries`}>
        {isError ? <AdminState icon="alert" title="Couldn't load enquiries" body="Please refresh the page to try again." /> : (
          <DataTable rows={data ?? []} rowKey={(r) => r.id} empty={isLoading ? "Loading…" : "No enquiries here yet."}
            onRowClick={(r) => navigate({ to: "/admin/enquiries/$id", params: { id: r.id } })}
            columns={[
              { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
              { header: "Phone", cell: (r) => r.phone ?? "—", className: "hidden md:table-cell" },
              { header: "Email", cell: (r) => r.email ?? "—", className: "hidden xl:table-cell" },
              { header: "Product", cell: (r) => r.products?.name ?? "—", className: "hidden lg:table-cell" },
              { header: "Source", cell: (r) => SOURCE_LABEL[r.source] ?? r.source, className: "hidden sm:table-cell" },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              { header: "Created", cell: (r) => <span className="text-muted-foreground">{formatDate(r.created_at)}</span>, className: "hidden lg:table-cell" },
              { header: "Updated", cell: (r) => <span className="text-muted-foreground">{formatDate(r.updated_at)}</span>, className: "hidden 2xl:table-cell" },
            ]} />
        )}
      </Panel>
    </div>
  );
}
