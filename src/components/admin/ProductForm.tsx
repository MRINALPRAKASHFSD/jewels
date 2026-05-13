import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader, StatusBadge, adminBtn, adminBtnGhost } from "@/components/admin/AdminUI";
import { Check, Confirm, Field, FormSection, inputCls, useUnsavedGuard } from "@/components/admin/cms-ui";
import { ImageManager } from "@/components/admin/ImageManager";
import {
  emptyProduct, fetchLookups, saveProduct, slugify, slugTaken, validateProduct, SLUG_RE, type EditorImage, type ProductValues, type Status,
} from "@/lib/admin/cms";
import { can } from "@/lib/admin/permissions";
import { useAdminUser } from "@/lib/admin/use-admin";

export function ProductForm({ id, initial, initialImages }: { id: string | null; initial?: ProductValues; initialImages?: EditorImage[] }) {
  const user = useAdminUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lookups = useQuery({ queryKey: ["admin", "lookups"], queryFn: fetchLookups });
  const [v, setV] = useState<ProductValues>(initial ?? emptyProduct);
  const [images, setImages] = useState<EditorImage[]>(initialImages ?? []);
  const [removed, setRemoved] = useState<EditorImage[]>([]);
  const [slugEdited, setSlugEdited] = useState(!!id);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState<null | Status>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const leaving = useRef(false);
  useUnsavedGuard(dirty && !leaving.current);

  const set = <K extends keyof ProductValues>(k: K, val: ProductValues[K]) => {
    setDirty(true);
    setV((p) => ({ ...p, [k]: val, ...(k === "name" && !slugEdited ? { slug: slugify(String(val)) } : {}) }));
  };
  const imgChange = (next: EditorImage[]) => { setDirty(true); setImages(next); };

  const checkSlug = async () => {
    if (!SLUG_RE.test(v.slug)) return;
    if (await slugTaken("products", v.slug, id ?? undefined)) setErrors((e) => ({ ...e, slug: "This slug is already used by another product." }));
    else setErrors(({ slug: _s, ...rest }) => rest);
  };

  const submit = async (status: Status) => {
    const values = { ...v, status };
    const errs = validateProduct(values);
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error("Please fix the highlighted fields."); return; }
    setSaving(status);
    try {
      const pid = await saveProduct(id, values, images, removed);
      setRemoved([]); setDirty(false); leaving.current = true;
      await qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success(status === "published" ? "Product published." : status === "archived" ? "Product saved." : "Draft saved.");
      if (!id) navigate({ to: "/admin/products/$id/edit", params: { id: pid }, replace: true });
      else { setV(values); leaving.current = false; }
    } catch (e) {
      toast.error((e as Error).message || "Couldn't save the product. Please try again.");
    } finally { setSaving(null); }
  };

  const canArchive = can(user.role, "products", "delete");
  const busy = saving !== null;
  const actions = (
    <>
      <Link to="/admin/products" className={adminBtnGhost}>Cancel</Link>
      {id && initial?.status === "published" && <a href={`/jewellery/${initial.slug}`} target="_blank" rel="noreferrer" className={adminBtnGhost}><ExternalLink className="h-3.5 w-3.5" />View live</a>}
      <button type="button" disabled={busy} onClick={() => submit(v.status === "archived" ? "archived" : "draft")} className={adminBtnGhost}>
        {saving === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving === "draft" ? "Saving…" : v.status === "published" ? "Save as draft (unpublish)" : "Save Draft"}
      </button>
      <button type="button" disabled={busy} onClick={() => (v.status === "published" ? submit("published") : setConfirmPublish(true))} className={adminBtn}>
        {saving === "published" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saving === "published" ? "Publishing…" : v.status === "published" ? "Save & keep published" : "Publish"}
      </button>
    </>
  );
  const cats = lookups.data?.categories ?? [];
  const cols = (lookups.data?.collections ?? []).filter((c) => c.status !== "archived" || c.id === v.collection_id);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <AdminPageHeader title={id ? v.name || "Edit product" : "Add product"} description={id ? `Status: ${v.status}` : "New pieces start as drafts and stay hidden until published."} actions={actions} />
      {id && <div className="flex items-center gap-2 text-xs text-muted-foreground"><StatusBadge status={v.status} />{dirty && <span>Unsaved changes</span>}</div>}

      <FormSection title="Basic information">
        <Field label="Product name" error={errors["name"]}>{(fid) => <input id={fid} className={inputCls} value={v.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Slug" error={errors["slug"]} hint={<>Web address: /jewellery/{v.slug || "…"}</>}>
          {(fid) => <input id={fid} className={inputCls} value={v.slug} maxLength={80} onBlur={checkSlug} onChange={(e) => { setSlugEdited(true); set("slug", e.target.value.toLowerCase()); }} />}
        </Field>
        <Field label="Description" full>{(fid) => <textarea id={fid} rows={5} className={inputCls} value={v.description} maxLength={3000} onChange={(e) => set("description", e.target.value)} />}</Field>
      </FormSection>

      <FormSection title="Images" description="The first image is used on product cards and as the main gallery image.">
        <ImageManager images={images} onChange={imgChange} onRemove={(img) => img.id && setRemoved((r) => [...r, img])}
          canUpload={can(user.role, "media", "upload")} canDeleteSaved={can(user.role, "media", "delete")} />
      </FormSection>

      <FormSection title="Classification">
        <Field label="Category" error={errors["category_id"]}>
          {(fid) => <select id={fid} className={inputCls} value={v.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">Choose…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        </Field>
        <Field label="Collection">
          {(fid) => <select id={fid} className={inputCls} value={v.collection_id} onChange={(e) => set("collection_id", e.target.value)}><option value="">None</option>{cols.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status !== "published" ? ` (${c.status})` : ""}</option>)}</select>}
        </Field>
      </FormSection>

      <FormSection title="Pricing">
        <Field label="Price (INR)" error={errors["price"]}>{(fid) => <input id={fid} inputMode="decimal" className={inputCls} value={v.price} disabled={v.price_on_request} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} />}</Field>
        <div className="flex items-end pb-2"><Check label="Price on request" checked={v.price_on_request} onChange={(b) => set("price_on_request", b)} /></div>
      </FormSection>

      <FormSection title="Material">
        {(["metal", "stone", "weight", "dimensions", "certification"] as const).map((k) => (
          <Field key={k} label={k[0]!.toUpperCase() + k.slice(1)}>{(fid) => <input id={fid} className={inputCls} value={v[k]} maxLength={120} onChange={(e) => set(k, e.target.value)} />}</Field>
        ))}
      </FormSection>

      <FormSection title="Product information">
        <Field label="Care" full>{(fid) => <textarea id={fid} rows={3} className={inputCls} value={v.care} maxLength={1500} onChange={(e) => set("care", e.target.value)} />}</Field>
        <Field label="Shipping" full>{(fid) => <textarea id={fid} rows={3} className={inputCls} value={v.shipping} maxLength={1500} onChange={(e) => set("shipping", e.target.value)} />}</Field>
      </FormSection>

      <FormSection title="Flags">
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <Check label="Featured" checked={v.is_featured} onChange={(b) => set("is_featured", b)} />
          <Check label="New arrival" checked={v.is_new} onChange={(b) => set("is_new", b)} />
          <Check label="Bestseller" checked={v.is_bestseller} onChange={(b) => set("is_bestseller", b)} />
        </div>
      </FormSection>

      <FormSection title="Publishing" description="Drafts are hidden from the website. Published pieces appear immediately. Archived pieces are hidden and kept for records.">
        <p className="text-sm sm:col-span-2">Current status: <StatusBadge status={v.status} />{v.status === "archived" && !canArchive && <span className="ml-2 text-xs text-muted-foreground">Only administrators can restore archived pieces.</span>}</p>
      </FormSection>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">{actions}</div>

      <Confirm open={confirmPublish} onOpenChange={setConfirmPublish} title="Publish this product?" confirmLabel="Publish"
        body="It will appear on the public website straight away." onConfirm={() => submit("published")} />
    </form>
  );
}
