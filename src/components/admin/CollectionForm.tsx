import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, StatusBadge, adminBtn, adminBtnGhost } from "@/components/admin/AdminUI";
import { Check, Confirm, Field, FormSection, ImageField, inputCls, useUnsavedGuard } from "@/components/admin/cms-ui";
import { emptyCollection, productPicker, saveCollection, slugify, slugTaken, SLUG_RE, type CollectionValues, type Status } from "@/lib/admin/cms";
import { can } from "@/lib/admin/permissions";
import { useAdminUser } from "@/lib/admin/use-admin";

export function CollectionForm({ id, initial, initialIds = [], previews }: { id: string | null; initial?: CollectionValues; initialIds?: string[]; previews?: { hero?: string | undefined; banner?: string | undefined } }) {
  const user = useAdminUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [v, setV] = useState(initial ?? emptyCollection);
  const [ids, setIds] = useState<string[]>(initialIds);
  const [baseIds, setBaseIds] = useState<string[]>(initialIds);
  const [prev, setPrev] = useState({ hero: previews?.hero ?? "", banner: previews?.banner ?? "" });
  const [slugEdited, setSlugEdited] = useState(!!id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<Status | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [term, setTerm] = useState("");
  const leaving = useRef(false);
  useUnsavedGuard(dirty && !leaving.current);
  const products = useQuery({ queryKey: ["admin", "picker"], queryFn: productPicker });

  const set = <K extends keyof CollectionValues>(k: K, val: CollectionValues[K]) => {
    setDirty(true);
    setV((p) => ({ ...p, [k]: val, ...(k === "name" && !slugEdited ? { slug: slugify(String(val)) } : {}) }));
  };
  const toggle = (pid: string) => { setDirty(true); setIds((x) => (x.includes(pid) ? x.filter((i) => i !== pid) : [...x, pid])); };
  const shown = useMemo(() => (products.data ?? []).filter((p) => p.name.toLowerCase().includes(term.toLowerCase())), [products.data, term]);

  const submit = async (status: Status) => {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e["name"] = "Enter a collection name.";
    if (!SLUG_RE.test(v.slug)) e["slug"] = "Use lowercase letters, numbers and hyphens only.";
    else if (await slugTaken("collections", v.slug, id ?? undefined)) e["slug"] = "This slug is already used by another collection.";
    setErrors(e);
    if (Object.keys(e).length) { toast.error("Please fix the highlighted fields."); return; }
    setSaving(status);
    try {
      const values = { ...v, status };
      const cid = await saveCollection(id, values, ids, baseIds);
      setDirty(false); setBaseIds(ids); setV(values); leaving.current = true;
      await qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success(status === "published" ? "Collection published." : "Collection saved.");
      if (!id) navigate({ to: "/admin/collections/$id", params: { id: cid }, replace: true }); else leaving.current = false;
    } catch (err) { toast.error((err as Error).message); } finally { setSaving(null); }
  };

  const canUpload = can(user.role, "media", "upload");
  const actions = (
    <>
      <Link to="/admin/collections" className={adminBtnGhost}>Cancel</Link>
      <button type="button" disabled={!!saving} onClick={() => submit(v.status === "archived" ? "archived" : "draft")} className={adminBtnGhost}>{saving === "draft" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</> : v.status === "published" ? "Save as draft (unpublish)" : "Save Draft"}</button>
      <button type="button" disabled={!!saving} onClick={() => (v.status === "published" ? submit("published") : setConfirm(true))} className={adminBtn}>{saving === "published" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Publishing…</> : v.status === "published" ? "Save & keep published" : "Publish"}</button>
    </>
  );

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <AdminPageHeader title={id ? v.name || "Edit collection" : "Create collection"} description={id ? "" : "New collections stay hidden until published."} actions={actions} />
      {id && <div className="flex items-center gap-2 text-xs text-muted-foreground"><StatusBadge status={v.status} />{dirty && <span>Unsaved changes</span>}</div>}
      <FormSection title="Details">
        <Field label="Name" error={errors["name"]}>{(f) => <input id={f} className={inputCls} value={v.name} maxLength={80} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Slug" error={errors["slug"]}>{(f) => <input id={f} className={inputCls} value={v.slug} maxLength={80} onChange={(e) => { setSlugEdited(true); set("slug", e.target.value.toLowerCase()); }} />}</Field>
        <Field label="Tagline" full>{(f) => <input id={f} className={inputCls} value={v.tagline} maxLength={160} onChange={(e) => set("tagline", e.target.value)} />}</Field>
        <Field label="Description" full>{(f) => <textarea id={f} rows={4} className={inputCls} value={v.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} />}</Field>
        <Field label="Sort order" hint="Lower numbers appear first.">{(f) => <input id={f} inputMode="numeric" className={inputCls} value={v.sort_order} onChange={(e) => set("sort_order", e.target.value.replace(/[^\d-]/g, ""))} />}</Field>
        <div className="flex items-end pb-2"><Check label="Featured" checked={v.is_featured} onChange={(b) => set("is_featured", b)} /></div>
      </FormSection>
      <FormSection title="Images">
        <ImageField label="Hero image" bucket="collections" folder={`uploads/${v.slug || "new"}`} value={v.hero_image_url} preview={prev.hero} canUpload={canUpload}
          onChange={(url, p) => { set("hero_image_url", url); setPrev((x) => ({ ...x, hero: p })); }} />
        <ImageField label="Banner image" bucket="collections" folder={`uploads/${v.slug || "new"}`} value={v.banner_image_url} preview={prev.banner} canUpload={canUpload}
          onChange={(url, p) => { set("banner_image_url", url); setPrev((x) => ({ ...x, banner: p })); }} />
      </FormSection>
      <FormSection title={`Products in this collection (${ids.length})`} description="Tick the pieces that belong here. A piece can belong to one collection; ticking it moves it from any other collection.">
        <div className="space-y-3 sm:col-span-2">
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products…" aria-label="Search products" className={inputCls} />
          <ul className="max-h-80 divide-y divide-border overflow-y-auto rounded-sm border border-border">
            {products.isLoading && <li className="px-3 py-3 text-sm text-muted-foreground">Loading…</li>}
            {shown.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary/60">
                  <input type="checkbox" checked={ids.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-foreground" />
                  <span className="flex-1">{p.name}</span>
                  {p.status !== "published" && <StatusBadge status={p.status} />}
                </label>
              </li>
            ))}
            {!products.isLoading && !shown.length && <li className="px-3 py-3 text-sm text-muted-foreground">No products match.</li>}
          </ul>
        </div>
      </FormSection>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">{actions}</div>
      <Confirm open={confirm} onOpenChange={setConfirm} title="Publish this collection?" confirmLabel="Publish" body="It will appear on the public website straight away." onConfirm={() => submit("published")} />
    </form>
  );
}
