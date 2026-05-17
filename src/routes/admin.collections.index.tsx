import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminState, DataTable, Panel, StatusBadge, adminBtn } from "@/components/admin/AdminUI";
import { Confirm } from "@/components/admin/cms-ui";
import { listCollections, setCollectionStatus, type Status } from "@/lib/admin/cms";
import { formatDate } from "@/lib/admin/data";
import { can } from "@/lib/admin/permissions";
import { RequireAccess, useAdminUser } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/collections/")({
  head: () => ({ meta: [{ title: "Collections — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="collections"><CollectionsPage /></RequireAccess>,
});

type Row = Awaited<ReturnType<typeof listCollections>>[number];

function CollectionsPage() {
  const user = useAdminUser();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "collections-cms"], queryFn: listCollections });
  const [pending, setPending] = useState<{ row: Row; status: Status } | null>(null);
  const change = async (row: Row, status: Status) => {
    try {
      await setCollectionStatus(row.id, status);
      toast.success(status === "published" ? "Collection published." : status === "archived" ? "Collection archived." : "Collection unpublished.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { toast.error((e as Error).message); }
  };
  const icon = "inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground";
  const canArchive = can(user.role, "collections", "delete");
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Collections" description="Group pieces into collections shown on the website."
        actions={can(user.role, "collections", "create") && <Link to="/admin/collections/new" className={adminBtn}><Plus className="h-3.5 w-3.5" />Create collection</Link>} />
      <Panel title={`${data?.length ?? 0} collections`}>
        {isError ? <AdminState icon="alert" title="Couldn't load collections" body="Please refresh the page to try again." /> : (
          <DataTable rows={data ?? []} rowKey={(r) => r.id} empty={isLoading ? "Loading…" : "No collections yet."}
            columns={[
              { header: "Image", cell: (r) => r.image ? <img src={r.image} alt="" className="h-12 w-16 object-cover" /> : <div className="h-12 w-16 bg-secondary" /> },
              { header: "Collection", cell: (r) => <Link to="/admin/collections/$id" params={{ id: r.id }} className="font-medium hover:underline">{r.name}</Link> },
              { header: "Products", cell: (r) => <span className="tabular-nums">{r.count}</span>, className: "hidden sm:table-cell" },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              { header: "Featured", cell: (r) => (r.is_featured ? "Yes" : "—"), className: "hidden md:table-cell" },
              { header: "Updated", cell: (r) => <span className="text-muted-foreground">{formatDate(r.updated_at)}</span>, className: "hidden lg:table-cell" },
              { header: "Actions", className: "text-right", cell: (r) => (
                <div className="flex justify-end gap-0.5">
                  <Link to="/admin/collections/$id" params={{ id: r.id }} className={icon} aria-label={`Edit ${r.name}`} title="Edit"><Pencil className="h-3.5 w-3.5" /></Link>
                  {r.status !== "published" && (r.status !== "archived" || canArchive) && <button className={icon} onClick={() => setPending({ row: r, status: "published" })} aria-label={`Publish ${r.name}`} title="Publish"><Eye className="h-3.5 w-3.5" /></button>}
                  {r.status === "published" && <button className={icon} onClick={() => setPending({ row: r, status: "draft" })} aria-label={`Unpublish ${r.name}`} title="Unpublish"><EyeOff className="h-3.5 w-3.5" /></button>}
                  {canArchive && r.status !== "archived" && <button className={icon} onClick={() => setPending({ row: r, status: "archived" })} aria-label={`Archive ${r.name}`} title="Archive"><Archive className="h-3.5 w-3.5" /></button>}
                </div>) },
            ]} />
        )}
      </Panel>
      <Confirm open={!!pending} onOpenChange={(o) => !o && setPending(null)}
        title={pending?.status === "published" ? "Publish this collection?" : pending?.status === "archived" ? "Archive this collection?" : "Unpublish this collection?"}
        body={pending?.status === "published" ? "It will appear on the public website." : "It will be hidden from the website. Its products stay as they are."}
        confirmLabel={pending?.status === "published" ? "Publish" : pending?.status === "archived" ? "Archive" : "Unpublish"} destructive={pending?.status === "archived"}
        onConfirm={() => pending && change(pending.row, pending.status)} />
    </div>
  );
}
