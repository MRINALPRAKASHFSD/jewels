// CMS data access + mutations. Browser client acting as the signed-in staff member: RLS is the real gate.
import { supabase } from "@/integrations/supabase/client";

/* ---------------- errors ---------------- */
export function friendly(message: string, error: unknown): never {
  console.error("[cms]", error);
  throw new Error(message);
}
function ok<T>(res: { data: T; error: unknown }, message: string): T {
  if (res.error) friendly(message, res.error);
  return res.data;
}

/* ---------------- storage ---------------- */
export const BUCKETS = ["products", "collections", "lookbook", "homepage", "brand"] as const;
export type Bucket = (typeof BUCKETS)[number];
const BASE = import.meta.env["VITE_SUPABASE_URL"] as string;
const REF_RE = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/;

/** Stored image references use the object URL form so the public site can sign them. */
export const objectUrl = (bucket: string, path: string) => `${BASE}/storage/v1/object/public/${bucket}/${path}`;
export function parseRef(url: string | null | undefined) {
  const m = url ? REF_RE.exec(url) : null;
  return m ? { bucket: m[1]!, path: decodeURIComponent(m[2]!) } : null;
}

/** Signed preview URLs for stored references (private buckets). */
export async function signRefs(urls: (string | null | undefined)[]) {
  const by = new Map<string, Set<string>>();
  for (const u of urls) { const r = parseRef(u); if (r) by.set(r.bucket, (by.get(r.bucket) ?? new Set()).add(r.path)); }
  const out = new Map<string, string>();
  await Promise.all([...by].map(async ([bucket, paths]) => {
    const { data } = await supabase.storage.from(bucket).createSignedUrls([...paths], 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) out.set(objectUrl(bucket, d.path), d.signedUrl);
  }));
  return (u: string | null | undefined) => { const r = parseRef(u); return r ? out.get(objectUrl(r.bucket, r.path)) : undefined; };
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_MB = 10;
export type ImageCheck = { ok: true; width: number; height: number; tip?: string | undefined } | { ok: false; message: string };

export async function validateImage(file: File): Promise<ImageCheck> {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, message: `"${file.name}" isn't supported. Use JPEG, PNG or WebP.` };
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) return { ok: false, message: `"${file.name}" must be smaller than ${MAX_IMAGE_MB} MB.` };
  const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
  if (!dims) return { ok: false, message: `"${file.name}" couldn't be read as an image.` };
  if (dims.w < 600 || dims.h < 600) return { ok: false, message: `"${file.name}" is too small (${dims.w}×${dims.h}). Use at least 600 px on each side.` };
  if (dims.w > 8000 || dims.h > 8000) return { ok: false, message: `"${file.name}" is too large (${dims.w}×${dims.h}). Keep it under 8000 px.` };
  const tip = file.size > 2 * 1024 * 1024 ? "Tip: images under 2 MB (ideally WebP, about 2000 px wide) load faster." : undefined;
  return { ok: true, width: dims.w, height: dims.h, tip };
}

export async function uploadImage(bucket: Bucket, folder: string, file: File) {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (error) friendly(`Couldn't upload "${file.name}". Please try again.`, error);
  await logActivity("MEDIA_UPLOADED", "media", `${bucket}/${path}`, { bucket, name: file.name, size: file.size });
  return { path, url: objectUrl(bucket, path) };
}

/** Best-effort client activity for actions with no table trigger (storage). */
export async function logActivity(action: string, resource: string, resourceId: string, details: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { error } = await supabase.from("audit_logs").insert({ actor_id: data.user.id, actor_email: data.user.email ?? null, action, resource, resource_id: resourceId, details: details as never });
  if (error) console.error("[cms] activity", error);
}

/* ---------------- slugs ---------------- */
export function slugify(s: string) {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export async function slugTaken(table: "products" | "collections", slug: string, excludeId?: string) {
  let q = supabase.from(table).select("id").eq("slug", slug);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.limit(1);
  return (data?.length ?? 0) > 0;
}
async function freeSlug(table: "products" | "collections", base: string) {
  for (let i = 1; i < 50; i++) {
    const s = `${base}-copy${i > 1 ? `-${i}` : ""}`;
    if (!(await slugTaken(table, s))) return s;
  }
  return `${base}-${Date.now()}`;
}

/* ---------------- lookups ---------------- */
export async function fetchLookups() {
  const [cats, cols] = await Promise.all([
    supabase.from("categories").select("id, name, slug").order("sort_order"),
    supabase.from("collections").select("id, name, slug, status").order("sort_order"),
  ]);
  return { categories: ok(cats, "Couldn't load categories.") ?? [], collections: ok(cols, "Couldn't load collections.") ?? [] };
}

/* ---------------- products ---------------- */
export type Status = "draft" | "published" | "archived";
export type ProductListParams = {
  q: string; status: string; category: string; collection: string;
  featured: boolean; isNew: boolean; bestseller: boolean; minPrice: string; maxPrice: string;
  sort: "updated" | "name" | "price-asc" | "price-desc" | "created"; page: number; pageSize: number;
};
export type ProductRow = {
  id: string; slug: string; name: string; price: number | null; price_on_request: boolean; status: Status; updated_at: string;
  category: string | null; collection: string | null; thumbnail?: string | undefined;
};

export async function listProducts(p: ProductListParams) {
  let q = supabase.from("products").select(
    "id, slug, name, price, price_on_request, status, updated_at, categories(name), collections(name), product_images(storage_path, image_url, sort_order, is_primary)",
    { count: "exact" });
  if (p.status !== "all") q = q.eq("status", p.status);
  if (p.category) q = q.eq("category_id", p.category);
  if (p.collection) q = q.eq("collection_id", p.collection);
  if (p.featured) q = q.eq("is_featured", true);
  if (p.isNew) q = q.eq("is_new", true);
  if (p.bestseller) q = q.eq("is_bestseller", true);
  if (p.minPrice && !Number.isNaN(Number(p.minPrice))) q = q.gte("price", Number(p.minPrice));
  if (p.maxPrice && !Number.isNaN(Number(p.maxPrice))) q = q.lte("price", Number(p.maxPrice));
  const term = p.q.trim().toLowerCase().replace(/[%,()*]/g, " ").replace(/\s+/g, " ").slice(0, 60);
  if (term) {
    const { categories, collections } = await fetchLookups();
    const catIds = categories.filter((c) => c.name.toLowerCase().includes(term)).map((c) => c.id);
    const colIds = collections.filter((c) => c.name.toLowerCase().includes(term)).map((c) => c.id);
    const parts = [`name.ilike.%${term}%`, `slug.ilike.%${term}%`, `metal.ilike.%${term}%`, `stone.ilike.%${term}%`];
    if (catIds.length) parts.push(`category_id.in.(${catIds.join(",")})`);
    if (colIds.length) parts.push(`collection_id.in.(${colIds.join(",")})`);
    q = q.or(parts.join(","));
  }
  const order = { updated: ["updated_at", false], created: ["created_at", false], name: ["name", true], "price-asc": ["price", true], "price-desc": ["price", false] } as const;
  const [col, asc] = order[p.sort];
  q = q.order(col, { ascending: asc, nullsFirst: false }).order("id");
  const from = (p.page - 1) * p.pageSize;
  const res = await q.range(from, from + p.pageSize - 1);
  const rows = (ok(res, "Couldn't load products. Please try again.") ?? []) as unknown as Array<Record<string, any>>;
  const firstImg = (r: Record<string, any>) => [...(r["product_images"] ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url as string | undefined;
  const sign = await signRefs(rows.map(firstImg));
  return {
    total: res.count ?? 0,
    rows: rows.map((r): ProductRow => ({
      id: r["id"], slug: r["slug"], name: r["name"], price: r["price"], price_on_request: r["price_on_request"], status: r["status"], updated_at: r["updated_at"],
      category: r["categories"]?.name ?? null, collection: r["collections"]?.name ?? null, thumbnail: sign(firstImg(r)),
    })),
  };
}

export type ProductValues = {
  name: string; slug: string; description: string; category_id: string; collection_id: string;
  price: string; price_on_request: boolean; metal: string; stone: string; weight: string; dimensions: string;
  certification: string; care: string; shipping: string; is_featured: boolean; is_new: boolean; is_bestseller: boolean; status: Status;
};
export const emptyProduct: ProductValues = {
  name: "", slug: "", description: "", category_id: "", collection_id: "", price: "", price_on_request: false, metal: "", stone: "",
  weight: "", dimensions: "", certification: "", care: "", shipping: "", is_featured: false, is_new: false, is_bestseller: false, status: "draft",
};

/** An image in the editor. `file` = not uploaded yet. The first image is always primary. */
export type EditorImage = { key: string; id?: string | undefined; url?: string | undefined; storagePath?: string | undefined; file?: File | undefined; preview: string; alt: string };

export async function getProduct(id: string) {
  const row = ok(await supabase.from("products").select("*, product_images(id, image_url, storage_path, alt_text, sort_order, is_primary)").eq("id", id).maybeSingle(),
    "Couldn't load this product.");
  if (!row) return null;
  const imgs = [...(row.product_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const sign = await signRefs(imgs.map((i) => i.image_url));
  const s = (v: string | null) => v ?? "";
  const values: ProductValues = {
    name: row.name, slug: row.slug, description: s(row.description), category_id: s(row.category_id), collection_id: s(row.collection_id),
    price: row.price == null ? "" : String(row.price), price_on_request: row.price_on_request, metal: s(row.metal), stone: s(row.stone),
    weight: s(row.weight), dimensions: s(row.dimensions), certification: s(row.certification), care: s(row.care), shipping: s(row.shipping),
    is_featured: row.is_featured, is_new: row.is_new, is_bestseller: row.is_bestseller, status: row.status as Status,
  };
  const images: EditorImage[] = imgs.map((i) => ({ key: i.id, id: i.id, url: i.image_url, storagePath: i.storage_path ?? undefined, preview: sign(i.image_url) ?? "", alt: s(i.alt_text) }));
  return { id: row.id, values, images };
}

function productPayload(v: ProductValues) {
  const n = (x: string) => (x.trim() ? x.trim() : null);
  return {
    name: v.name.trim(), slug: v.slug.trim(), description: n(v.description), category_id: v.category_id || null, collection_id: v.collection_id || null,
    price: v.price_on_request || !v.price.trim() ? null : Number(v.price), price_on_request: v.price_on_request,
    metal: n(v.metal), stone: n(v.stone), weight: n(v.weight), dimensions: n(v.dimensions), certification: n(v.certification),
    care: n(v.care), shipping: n(v.shipping), is_featured: v.is_featured, is_new: v.is_new, is_bestseller: v.is_bestseller, status: v.status,
  };
}

export function validateProduct(v: ProductValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.name.trim()) e["name"] = "Enter a product name.";
  if (!SLUG_RE.test(v.slug)) e["slug"] = "Use lowercase letters, numbers and hyphens only.";
  if (!v.category_id) e["category_id"] = "Choose a category.";
  if (!v.price_on_request) {
    const p = Number(v.price);
    if (!v.price.trim() || Number.isNaN(p) || p <= 0) e["price"] = "Enter a price, or mark it as price on request.";
  }
  return e;
}

/** Create or update a product, then sync its images. Never creates a duplicate on edit. */
export async function saveProduct(id: string | null, values: ProductValues, images: EditorImage[], removed: EditorImage[]) {
  if (await slugTaken("products", values.slug, id ?? undefined)) throw new Error("This slug is already used by another product.");
  const payload = productPayload(values);
  let productId = id;
  if (id) {
    ok(await supabase.from("products").update(payload).eq("id", id), "Couldn't save the product. Please try again.");
  } else {
    const row = ok(await supabase.from("products").insert(payload).select("id").single(), "Couldn't save the product. Please try again.");
    productId = row!.id;
  }
  await syncImages(productId!, images, removed);
  return productId!;
}

async function syncImages(productId: string, images: EditorImage[], removed: EditorImage[]) {
  // Removed images: unlink, then delete the file only if no other product still uses it.
  for (const r of removed) {
    if (!r.id) continue;
    ok(await supabase.from("product_images").delete().eq("id", r.id), "Couldn't remove an image. Only administrators can delete images.");
    if (r.storagePath) {
      const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("storage_path", r.storagePath);
      if (!count && r.storagePath.startsWith("uploads/")) {
        const { error } = await supabase.storage.from("products").remove([r.storagePath]);
        if (!error) await logActivity("MEDIA_DELETED", "media", `products/${r.storagePath}`, { bucket: "products" });
      }
    }
  }
  // Clear primary first so the one-primary rule never trips mid-update.
  ok(await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId).eq("is_primary", true), "Couldn't save the images.");
  for (const [i, img] of images.entries()) {
    const fields = { sort_order: i, is_primary: i === 0, alt_text: img.alt.trim() || null };
    if (img.id) {
      ok(await supabase.from("product_images").update(fields).eq("id", img.id), "Couldn't save the images.");
    } else if (img.file) {
      const up = await uploadImage("products", `uploads/${productId}`, img.file);
      const row = ok(await supabase.from("product_images").insert({ product_id: productId, image_url: up.url, storage_path: up.path, ...fields }).select("id").single(),
        "Couldn't save an uploaded image.");
      img.id = row!.id; img.url = up.url; img.storagePath = up.path; delete img.file;
    }
  }
}

export async function setProductStatus(id: string, status: Status) {
  ok(await supabase.from("products").update({ status }).eq("id", id),
    status === "archived" ? "Couldn't archive the product. Only administrators can archive." : "Couldn't update the product. Please try again.");
}

/** Copies the product as a new draft with a fresh slug; image rows reuse the same stored files. */
export async function duplicateProduct(id: string) {
  const src = ok(await supabase.from("products").select("*, product_images(image_url, storage_path, alt_text, sort_order, is_primary)").eq("id", id).single(), "Couldn't duplicate the product.")!;
  const { id: _i, created_at: _c, updated_at: _u, product_images, ...rest } = src;
  const slug = await freeSlug("products", src.slug);
  const row = ok(await supabase.from("products").insert({ ...rest, name: `${src.name} (copy)`, slug, status: "draft" }).select("id").single(), "Couldn't duplicate the product.")!;
  if (product_images?.length) {
    ok(await supabase.from("product_images").insert(product_images.map((p) => ({ ...p, product_id: row.id }))), "The copy was created, but its images couldn't be attached.");
  }
  return row.id;
}

/* ---------------- collections ---------------- */
export type CollectionValues = {
  name: string; slug: string; description: string; tagline: string; hero_image_url: string; banner_image_url: string;
  is_featured: boolean; sort_order: string; status: Status;
};
export const emptyCollection: CollectionValues = { name: "", slug: "", description: "", tagline: "", hero_image_url: "", banner_image_url: "", is_featured: false, sort_order: "0", status: "draft" };

export async function listCollections() {
  const rows = ok(await supabase.from("collections").select("id, slug, name, status, is_featured, sort_order, updated_at, hero_image_url, products(count)").order("sort_order"),
    "Couldn't load collections.") ?? [];
  const sign = await signRefs(rows.map((r) => r.hero_image_url));
  return rows.map((r) => ({ ...r, image: sign(r.hero_image_url), count: (r.products as unknown as { count: number }[])?.[0]?.count ?? 0 }));
}

export async function getCollection(id: string) {
  const r = ok(await supabase.from("collections").select("*").eq("id", id).maybeSingle(), "Couldn't load this collection.");
  if (!r) return null;
  const members = ok(await supabase.from("products").select("id").eq("collection_id", id), "Couldn't load this collection.") ?? [];
  const sign = await signRefs([r.hero_image_url, r.banner_image_url]);
  const values: CollectionValues = {
    name: r.name, slug: r.slug, description: r.description ?? "", tagline: r.tagline ?? "", hero_image_url: r.hero_image_url ?? "",
    banner_image_url: r.banner_image_url ?? "", is_featured: r.is_featured, sort_order: String(r.sort_order), status: r.status as Status,
  };
  return { id: r.id, values, productIds: members.map((m) => m.id), previews: { hero: sign(r.hero_image_url), banner: sign(r.banner_image_url) } };
}

export async function saveCollection(id: string | null, v: CollectionValues, productIds: string[], initialIds: string[]) {
  if (await slugTaken("collections", v.slug, id ?? undefined)) throw new Error("This slug is already used by another collection.");
  const payload = {
    name: v.name.trim(), slug: v.slug.trim(), description: v.description.trim() || null, tagline: v.tagline.trim() || null,
    hero_image_url: v.hero_image_url || null, banner_image_url: v.banner_image_url || null, is_featured: v.is_featured,
    sort_order: Number(v.sort_order) || 0, status: v.status,
  };
  let cid = id;
  if (id) ok(await supabase.from("collections").update(payload).eq("id", id), "Couldn't save the collection. Please try again.");
  else cid = ok(await supabase.from("collections").insert(payload).select("id").single(), "Couldn't create the collection. Only administrators can create collections.")!.id;
  const add = productIds.filter((p) => !initialIds.includes(p));
  const drop = initialIds.filter((p) => !productIds.includes(p));
  if (add.length) ok(await supabase.from("products").update({ collection_id: cid }).in("id", add), "Couldn't assign the products.");
  if (drop.length) ok(await supabase.from("products").update({ collection_id: null }).in("id", drop).eq("collection_id", cid!), "Couldn't update the products.");
  return cid!;
}

export async function setCollectionStatus(id: string, status: Status) {
  ok(await supabase.from("collections").update({ status }).eq("id", id),
    status === "archived" ? "Couldn't archive the collection. Only administrators can archive." : "Couldn't update the collection.");
}

export async function productPicker() {
  return (ok(await supabase.from("products").select("id, name, status, collection_id").neq("status", "archived").order("name"), "Couldn't load products.") ?? []);
}

/* ---------------- lookbook ---------------- */
export async function listLookbook() {
  const rows = ok(await supabase.from("lookbook_items").select("*").order("sort_order"), "Couldn't load the lookbook.") ?? [];
  const sign = await signRefs(rows.map((r) => r.image_url));
  return rows.map((r) => ({ ...r, preview: sign(r.image_url) }));
}
export type LookbookValues = { title: string; description: string; image_url: string; is_featured: boolean; status: Status };
export async function saveLookbook(id: string | null, v: LookbookValues, sortOrder: number) {
  const payload = { title: v.title.trim() || null, description: v.description.trim() || null, image_url: v.image_url, is_featured: v.is_featured, status: v.status };
  if (id) ok(await supabase.from("lookbook_items").update(payload).eq("id", id), "Couldn't save the lookbook item.");
  else ok(await supabase.from("lookbook_items").insert({ ...payload, sort_order: sortOrder }), "Couldn't add the lookbook item.");
}
export async function setLookbookStatus(id: string, status: Status) {
  ok(await supabase.from("lookbook_items").update({ status }).eq("id", id),
    status === "archived" ? "Couldn't archive. Only administrators can archive." : "Couldn't update the lookbook item.");
}
export async function reorderLookbook(ids: string[]) {
  for (const [i, id] of ids.entries()) ok(await supabase.from("lookbook_items").update({ sort_order: i }).eq("id", id), "Couldn't save the new order.");
}

/* ---------------- media library ---------------- */
export type MediaFile = { bucket: Bucket; path: string; name: string; size: number; type: string; created: string; url: string };

async function listFolder(bucket: Bucket, prefix: string, depth: number): Promise<MediaFile[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  if (error) friendly("Couldn't load the media library.", error);
  const out: MediaFile[] = [];
  for (const f of data ?? []) {
    const path = prefix ? `${prefix}/${f.name}` : f.name;
    if (!f.id) { if (depth < 3) out.push(...(await listFolder(bucket, path, depth + 1))); continue; }
    if (f.name.startsWith(".")) continue;
    const meta = (f.metadata ?? {}) as { size?: number; mimetype?: string };
    out.push({ bucket, path, name: f.name, size: meta.size ?? 0, type: meta.mimetype ?? "", created: f.created_at ?? "", url: objectUrl(bucket, path) });
  }
  return out;
}

export async function listMedia(bucket: Bucket | "all") {
  const buckets = bucket === "all" ? [...BUCKETS] : [bucket];
  const files = (await Promise.all(buckets.map((b) => listFolder(b, "", 0)))).flat().sort((a, b) => b.created.localeCompare(a.created));
  const sign = await signRefs(files.map((f) => f.url));
  return files.map((f) => ({ ...f, preview: sign(f.url) }));
}

/** Where an asset is used, so deletion can warn first. */
export async function findReferences(f: { bucket: string; path: string; url: string }) {
  const refs: string[] = [];
  const like = `%/${f.bucket}/${f.path}`;
  const [imgs, cols, looks, home] = await Promise.all([
    supabase.from("product_images").select("products(name)").or(`image_url.like.${like},storage_path.eq.${f.path}`).limit(20),
    supabase.from("collections").select("name").or(`hero_image_url.like.${like},banner_image_url.like.${like}`),
    supabase.from("lookbook_items").select("title").like("image_url", like),
    supabase.from("homepage_sections").select("section_key, content"),
  ]);
  if (f.bucket === "products") for (const r of (imgs.data ?? []) as any[]) refs.push(`Product: ${r.products?.name ?? "unknown"}`);
  for (const r of cols.data ?? []) refs.push(`Collection: ${r.name}`);
  for (const r of looks.data ?? []) refs.push(`Lookbook: ${r.title || "untitled"}`);
  for (const r of home.data ?? []) if (JSON.stringify(r.content).includes(`/${f.bucket}/${f.path}`)) refs.push(`Homepage: ${r.section_key}`);
  return refs;
}

export async function deleteMedia(f: { bucket: Bucket; path: string }) {
  const { data, error } = await supabase.storage.from(f.bucket).remove([f.path]);
  if (error || !data?.length) friendly("Couldn't delete this file. Only administrators can delete media.", error ?? "no rows");
  await logActivity("MEDIA_DELETED", "media", `${f.bucket}/${f.path}`, { bucket: f.bucket });
}

/* ---------------- homepage content ---------------- */
export async function getContentSections() {
  const [pub, drafts] = await Promise.all([
    supabase.from("homepage_sections").select("section_key, content, is_active, updated_at").order("sort_order"),
    supabase.from("homepage_drafts").select("section_key, content, is_active, updated_at"),
  ]);
  const p = ok(pub, "Couldn't load homepage content.") ?? [];
  const d = new Map((ok(drafts, "Couldn't load homepage drafts.") ?? []).map((x) => [x.section_key, x]));
  return p.map((s) => ({
    key: s.section_key,
    published: { content: (s.content ?? {}) as Record<string, string>, active: s.is_active, updatedAt: s.updated_at },
    draft: d.has(s.section_key) ? { content: d.get(s.section_key)!.content as Record<string, string>, active: d.get(s.section_key)!.is_active, updatedAt: d.get(s.section_key)!.updated_at } : null,
  }));
}
export async function saveContentDraft(key: string, content: Record<string, string>, active: boolean) {
  ok(await supabase.from("homepage_drafts").upsert({ section_key: key, content, is_active: active }), "Couldn't save the draft. Please try again.");
}
export async function publishContent(key: string, content: Record<string, string>, active: boolean) {
  ok(await supabase.from("homepage_sections").update({ content, is_active: active }).eq("section_key", key), "Couldn't publish the changes. Please try again.");
  await supabase.from("homepage_drafts").delete().eq("section_key", key);
}
export async function discardContentDraft(key: string) {
  ok(await supabase.from("homepage_drafts").delete().eq("section_key", key), "Couldn't discard the draft.");
}

/* ---------------- enquiries ---------------- */
export async function searchEnquiries(status: string | undefined, term: string) {
  let q = supabase.from("enquiries").select("id, name, email, phone, message, source, status, created_at, updated_at, products(name, slug)").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const t = term.trim().replace(/[%,()*]/g, " ").slice(0, 60);
  if (t) {
    const { data: prods } = await supabase.from("products").select("id").ilike("name", `%${t}%`).limit(50);
    const parts = [`name.ilike.%${t}%`, `email.ilike.%${t}%`, `phone.ilike.%${t}%`];
    if (prods?.length) parts.push(`product_id.in.(${prods.map((p) => p.id).join(",")})`);
    q = q.or(parts.join(","));
  }
  return (ok(await q, "Couldn't load enquiries.") ?? []) as any[];
}
export async function enquiryTimeline(id: string) {
  const [notes, activity] = await Promise.all([
    supabase.from("enquiry_notes").select("id, body, author_email, created_at").eq("enquiry_id", id).order("created_at", { ascending: false }),
    supabase.from("audit_logs").select("id, actor_email, details, created_at").eq("resource", "enquiry").eq("resource_id", id).order("created_at", { ascending: false }),
  ]);
  return { notes: ok(notes, "Couldn't load notes.") ?? [], activity: (ok(activity, "Couldn't load activity.") ?? []) as Array<{ id: string; actor_email: string | null; details: any; created_at: string }> };
}
export async function addEnquiryNote(id: string, body: string, email: string) {
  const { data } = await supabase.auth.getUser();
  ok(await supabase.from("enquiry_notes").insert({ enquiry_id: id, body: body.trim(), author_email: email, author_id: data.user!.id }), "Couldn't save the note.");
}

/* ---------------- recent activity (admins) ---------------- */
export async function recentActivity(limit = 8) {
  return ok(await supabase.from("audit_logs").select("id, actor_email, action, resource, details, created_at").order("created_at", { ascending: false }).limit(limit), "Couldn't load activity.") ?? [];
}
