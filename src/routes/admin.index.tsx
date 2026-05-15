import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AdminPageHeader, AdminState, DataTable, Panel, StatCard, StatusBadge, adminBtn, adminBtnGhost, adminLink } from "@/components/admin/AdminUI";
import { dashboardStats, enquiriesList, formatDate, formatPrice, productsList, SOURCE_LABEL } from "@/lib/admin/data";
import { useAdminUser } from "@/lib/admin/use-admin";
import { can } from "@/lib/admin/permissions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Dashboard,
});

const pad = (n: number) => String(n).padStart(2, "0");

function Dashboard() {
  const user = useAdminUser();
  const navigate = useNavigate();
  const stats = useQuery(dashboardStats());
  const enquiries = useQuery(enquiriesList(6));
  const products = useQuery(productsList(6));
  const s = stats.data;
  const v = (n?: number) => (stats.isLoading ? "—" : s ? pad(n ?? 0) : "—");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Welcome, ${user.name}`}
        description="Overview of your catalogue and client activity."
        actions={<>
          {can(user.role, "products", "create") && <Link to="/admin/products/new" className={adminBtn}><Plus className="h-3.5 w-3.5" />Add Product</Link>}
          {can(user.role, "collections", "create") && <Link to="/admin/collections/new" className={adminBtnGhost}><Plus className="h-3.5 w-3.5" />Add Collection</Link>}
          {can(user.role, "media", "upload") && <Link to="/admin/media" className={adminBtnGhost}><Plus className="h-3.5 w-3.5" />Upload Media</Link>}
          <Link to="/admin/enquiries" className={adminBtnGhost}>View Enquiries</Link>
        </>}
      />

      {stats.isError ? (
        <Panel title="Overview"><AdminState icon="alert" title="Couldn't load figures" body="Please refresh the page to try again." /></Panel>
      ) : (
        <div className="grid grid-cols-2 rounded-sm border border-border bg-card lg:grid-cols-4 lg:divide-x lg:divide-border [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-border lg:[&>*]:border-b-0">
          <StatCard label="Published products" value={v(s?.published)} />
          <StatCard label="Draft products" value={v(s?.drafts)} />
          <StatCard label="Collections" value={v(s?.collections)} />
          <StatCard label="New enquiries" value={v(s?.newEnquiries)} />
        </div>
      )}

      <Panel title="Recent Enquiries" action={<Link to="/admin/enquiries" className={adminLink}>View all</Link>}>
        {enquiries.isError ? <AdminState icon="alert" title="Couldn't load enquiries" body="Please refresh the page to try again." /> : (
          <DataTable rows={enquiries.data ?? []} rowKey={(r) => r.id} empty={enquiries.isLoading ? "Loading…" : "No enquiries yet. New ones will appear here."}
            onRowClick={(r) => navigate({ to: "/admin/enquiries/$id", params: { id: r.id } })}
            columns={[
              { header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
              { header: "Product", cell: (r) => r.product?.name ?? <span className="text-muted-foreground">—</span>, className: "hidden md:table-cell" },
              { header: "Source", cell: (r) => SOURCE_LABEL[r.source] ?? r.source, className: "hidden sm:table-cell" },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              { header: "Date", cell: (r) => <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>, className: "hidden lg:table-cell" },
            ]} />
        )}
      </Panel>

      <Panel title="Recently Updated Products" action={<Link to="/admin/products" className={adminLink}>All products</Link>}>
        {products.isError ? <AdminState icon="alert" title="Couldn't load products" body="Please refresh the page to try again." /> : (
          <DataTable rows={products.data ?? []} rowKey={(r) => r.id} empty={products.isLoading ? "Loading…" : "No products yet."}
            onRowClick={(r) => navigate({ to: "/admin/products/$id/edit", params: { id: r.id } })}
            columns={[
              { header: "Product", cell: (r) => (
                <div className="flex items-center gap-3">
                  {r.thumbnail ? <img src={r.thumbnail} alt="" className="h-10 w-8 object-cover" /> : <div className="h-10 w-8 bg-secondary" />}
                  <span className="font-medium">{r.name}</span>
                </div>) },
              { header: "Category", cell: (r) => r.category ?? "—", className: "hidden sm:table-cell" },
              { header: "Price", cell: (r) => <span className="tabular-nums">{formatPrice(r)}</span>, className: "hidden md:table-cell" },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              { header: "Updated", cell: (r) => <span className="text-muted-foreground">{formatDate(r.updatedAt)}</span>, className: "hidden lg:table-cell" },
            ]} />
        )}
      </Panel>
    </div>
  );
}
