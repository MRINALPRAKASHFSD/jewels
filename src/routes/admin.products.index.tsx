import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, Archive, Pencil, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, AdminState, DataTable, Panel, StatusBadge, adminBtn, adminBtnGhost } from "@/components/admin/AdminUI";
import { Check, Confirm, inputCls } from "@/components/admin/cms-ui";
import { duplicateProduct, fetchLookups, listProducts, setProductStatus, type ProductListParams, type ProductRow, type Status } from "@/lib/admin/cms";
import { formatDate, formatPrice } from "@/lib/admin/data";
import { can } from "@/lib/admin/permissions";
import { RequireAccess, useAdminUser } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/products/")({
  head: () => ({ meta: [{ title: "Products — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="products"><ProductsPage /></RequireAccess>,
});

const DEFAULTS: ProductListParams = { q: "", status: "all", category: "", collection: "", featured: false, isNew: false, bestseller: false, minPrice: "", maxPrice: "", sort: "updated", page: 1, pageSize: 20 };
type Pending = { row: ProductRow; status: Status } | null;

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

function ProductsPage() {
  const user = useAdminUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [p, setP] = useState(DEFAULTS);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const params = { ...p, q };
  useEffect(() => setP((x) => ({ ...x, page: 1 })), [q]);
  const lookups = useQuery({ queryKey: ["admin", "lookups"], queryFn: fetchLookups });
  const { data, isLoading, isError, isFetching } = useQuery({ queryKey: ["admin", "products-cms", params], queryFn: () => listProducts(params), placeholderData: keepPreviousData });
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const upd = (patch: Partial<ProductListParams>) => setP((x) => ({ ...x, page: 1, ...patch }));
  const filtersOn = search || JSON.stringify({ ...p, page: 1 }) !== JSON.stringify(DEFAULTS);
  const canArchive = can(user.role, "products", "delete");
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / p.pageSize));

  const changeStatus = async (row: ProductRow, status: Status) => {
    setBusy(row.id);
    try {
      await setProductStatus(row.id, status);
      toast.success(status === "published" ? "Product published." : status === "archived" ? "Product archived." : "Product unpublished.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const duplicate = async (row: ProductRow) => {
    setBusy(row.id);
    try {
      const id = await duplicateProduct(row.id);
      toast.success("Duplicated as a new draft.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
      navigate({ to: "/admin/products/$id/edit", params: { id } });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  const icon = "inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40";
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Products" description="Every piece in the catalogue, including drafts and archived pieces."
        actions={can(user.role, "products", "create") && <Link to="/admin/products/new" className={adminBtn}><Plus className="h-3.5 w-3.5" />Add Product</Link>} />

      <div className="space-y-3 rounded-sm border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, slug, category, collection, metal, stone…" aria-label="Search products" className={inputCls} />
          <select aria-label="Status" className={inputCls} value={p.status} onChange={(e) => upd({ status: e.target.value })}>
            {["all", "draft", "published", "archived"].map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s[0]!.toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select aria-label="Category" className={inputCls} value={p.category} onChange={(e) => upd({ category: e.target.value })}>
            <option value="">All categories</option>{lookups.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Collection" className={inputCls} value={p.collection} onChange={(e) => upd({ collection: e.target.value })}>
            <option value="">All collections</option>{lookups.data?.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select aria-label="Sort" className={inputCls} value={p.sort} onChange={(e) => upd({ sort: e.target.value as ProductListParams["sort"] })}>
            <option value="updated">Recently updated</option><option value="created">Newest</option><option value="name">Name A–Z</option>
            <option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Check label="Featured" checked={p.featured} onChange={(b) => upd({ featured: b })} />
          <Check label="New" checked={p.isNew} onChange={(b) => upd({ isNew: b })} />
          <Check label="Bestseller" checked={p.bestseller} onChange={(b) => upd({ bestseller: b })} />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Price</span>
            <input inputMode="numeric" placeholder="Min" aria-label="Minimum price" className={`${inputCls} w-24 py-1.5`} value={p.minPrice} onChange={(e) => upd({ minPrice: e.target.value.replace(/\D/g, "") })} />
            <span>–</span>
            <input inputMode="numeric" placeholder="Max" aria-label="Maximum price" className={`${inputCls} w-24 py-1.5`} value={p.maxPrice} onChange={(e) => upd({ maxPrice: e.target.value.replace(/\D/g, "") })} />
          </div>
          {filtersOn && <button onClick={() => { setSearch(""); setP(DEFAULTS); }} className="text-xs underline underline-offset-2">Clear filters</button>}
        </div>
      </div>

      <Panel title={`${data?.total ?? 0} products${isFetching && !isLoading ? " · updating…" : ""}`}>
        {isError ? <AdminState icon="alert" title="Couldn't load products" body="Please refresh the page to try again." /> : (
          <DataTable rows={data?.rows ?? []} rowKey={(r) => r.id} empty={isLoading ? "Loading…" : filtersOn ? "No products match these filters." : "No products yet."}
            columns={[
              { header: "Image", cell: (r) => r.thumbnail ? <img src={r.thumbnail} alt="" className="h-12 w-10 object-cover" /> : <div className="h-12 w-10 bg-secondary" /> },
              { header: "Product", cell: (r) => <Link to="/admin/products/$id/edit" params={{ id: r.id }} className="font-medium hover:underline">{r.name}<span className="block text-xs font-normal text-muted-foreground">{r.slug}</span></Link> },
              { header: "Category", cell: (r) => r.category ?? "—", className: "hidden md:table-cell" },
              { header: "Collection", cell: (r) => r.collection ?? "—", className: "hidden lg:table-cell" },
              { header: "Price", cell: (r) => <span className="tabular-nums">{formatPrice({ price: r.price, priceOnRequest: r.price_on_request })}</span>, className: "hidden sm:table-cell" },
              { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
              { header: "Updated", cell: (r) => <span className="text-muted-foreground">{formatDate(r.updated_at)}</span>, className: "hidden xl:table-cell" },
              { header: "Actions", className: "text-right", cell: (r) => (
                <div className="flex justify-end gap-0.5">
                  <Link to="/admin/products/$id/edit" params={{ id: r.id }} className={icon} title="Edit" aria-label={`Edit ${r.name}`}><Pencil className="h-3.5 w-3.5" /></Link>
                  {can(user.role, "products", "create") && <button className={icon} disabled={busy === r.id} onClick={() => duplicate(r)} title="Duplicate" aria-label={`Duplicate ${r.name}`}><Copy className="h-3.5 w-3.5" /></button>}
                  {r.status !== "published" && (r.status !== "archived" || canArchive) && <button className={icon} disabled={busy === r.id} onClick={() => setPending({ row: r, status: "published" })} title="Publish" aria-label={`Publish ${r.name}`}><Eye className="h-3.5 w-3.5" /></button>}
                  {r.status === "published" && <button className={icon} disabled={busy === r.id} onClick={() => setPending({ row: r, status: "draft" })} title="Unpublish" aria-label={`Unpublish ${r.name}`}><EyeOff className="h-3.5 w-3.5" /></button>}
                  {canArchive && r.status !== "archived" && <button className={icon} disabled={busy === r.id} onClick={() => setPending({ row: r, status: "archived" })} title="Archive" aria-label={`Archive ${r.name}`}><Archive className="h-3.5 w-3.5" /></button>}
                </div>) },
            ]} />
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs">
            <span className="text-muted-foreground">Page {p.page} of {pages}</span>
            <div className="flex gap-2">
              <button className={adminBtnGhost} disabled={p.page <= 1} onClick={() => setP((x) => ({ ...x, page: x.page - 1 }))}>Previous</button>
              <button className={adminBtnGhost} disabled={p.page >= pages} onClick={() => setP((x) => ({ ...x, page: x.page + 1 }))}>Next</button>
            </div>
          </div>
        )}
      </Panel>

      <Confirm open={!!pending} onOpenChange={(o) => !o && setPending(null)}
        title={pending?.status === "published" ? "Publish this product?" : pending?.status === "archived" ? "Archive this product?" : "Unpublish this product?"}
        body={pending?.status === "published" ? `"${pending.row.name}" will appear on the public website.` : pending?.status === "archived" ? `"${pending?.row.name}" will be hidden from the website and kept for records. It is not deleted.` : `"${pending?.row.name}" will be hidden from the website and kept as a draft.`}
        confirmLabel={pending?.status === "published" ? "Publish" : pending?.status === "archived" ? "Archive" : "Unpublish"}
        destructive={pending?.status === "archived"}
        onConfirm={() => pending && changeStatus(pending.row, pending.status)} />
    </div>
  );
}
