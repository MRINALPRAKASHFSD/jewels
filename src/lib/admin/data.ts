// Admin data access: browser client acting as the signed-in user, so RLS decides what is returned.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ENQUIRY_STATUSES = ["new", "contacted", "interested", "converted", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export const SOURCE_LABEL: Record<string, string> = { whatsapp: "WhatsApp", contact_form: "Contact form", appointment: "Appointment", product_page: "Product page" };

const FRIENDLY = "We couldn't load this information. Please try again.";
function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) { console.error("[admin]", res.error); throw new Error(FRIENDLY); }
  return res.data;
}
function count(res: { count: number | null; error: unknown }) {
  if (res.error) { console.error("[admin]", res.error); throw new Error(FRIENDLY); }
  return res.count ?? 0;
}

async function signProductPaths(paths: string[]) {
  const out = new Map<string, string>();
  if (!paths.length) return out;
  const { data } = await supabase.storage.from("products").createSignedUrls([...new Set(paths)], 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

type ImgRow = { storage_path: string | null; is_primary: boolean; sort_order: number };
function primaryPath(imgs: ImgRow[] | null) {
  const sorted = [...(imgs ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  return sorted[0]?.storage_path ?? null;
}

const PRODUCT_SELECT = "id, slug, name, price, price_on_request, status, updated_at, created_at, metal, stone, categories(name), collections(name), product_images(storage_path, is_primary, sort_order)";

export type AdminProduct = {
  id: string; slug: string; name: string; price: number | null; priceOnRequest: boolean; status: string;
  updatedAt: string; category: string | null; collection: string | null; metal: string | null; stone: string | null; thumbnail?: string | undefined;
};

async function fetchProducts(limit?: number): Promise<AdminProduct[]> {
  let q = supabase.from("products").select(PRODUCT_SELECT).order("updated_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const rows = check(await q) as unknown as Array<{
    id: string; slug: string; name: string; price: number | null; price_on_request: boolean; status: string; updated_at: string;
    metal: string | null; stone: string | null; categories: { name: string } | null; collections: { name: string } | null; product_images: ImgRow[] | null;
  }>;
  const signed = await signProductPaths(rows.map((r) => primaryPath(r.product_images)).filter(Boolean) as string[]);
  return rows.map((r) => {
    const p = primaryPath(r.product_images);
    return {
      id: r.id, slug: r.slug, name: r.name, price: r.price, priceOnRequest: r.price_on_request, status: r.status,
      updatedAt: r.updated_at, category: r.categories?.name ?? null, collection: r.collections?.name ?? null,
      metal: r.metal, stone: r.stone, thumbnail: p ? signed.get(p) : undefined,
    };
  });
}

export const adminKeys = { all: ["admin"] as const };

export const dashboardStats = () => queryOptions({
  queryKey: ["admin", "stats"],
  queryFn: async () => {
    const [published, drafts, collections, newEnquiries] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("collections").select("id", { count: "exact", head: true }),
      supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);
    return { published: count(published), drafts: count(drafts), collections: count(collections), newEnquiries: count(newEnquiries) };
  },
});

export type AdminEnquiry = {
  id: string; name: string; email: string | null; phone: string | null; message: string | null;
  source: string; status: EnquiryStatus; createdAt: string; updatedAt: string; product: { name: string; slug: string } | null;
};
const ENQ_SELECT = "id, name, email, phone, message, source, status, created_at, updated_at, products(name, slug)";
function mapEnquiry(r: any): AdminEnquiry {
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, message: r.message, source: r.source, status: r.status,
    createdAt: r.created_at, updatedAt: r.updated_at, product: r.products ?? null };
}

export const enquiriesList = (limit?: number, status?: string) => queryOptions({
  queryKey: ["admin", "enquiries", { limit, status }],
  queryFn: async () => {
    let q = supabase.from("enquiries").select(ENQ_SELECT).order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    if (limit) q = q.limit(limit);
    return (check(await q) ?? []).map(mapEnquiry);
  },
});

export const enquiryDetail = (id: string) => queryOptions({
  queryKey: ["admin", "enquiry", id],
  queryFn: async () => {
    const row = check(await supabase.from("enquiries").select(ENQ_SELECT).eq("id", id).maybeSingle());
    return row ? mapEnquiry(row) : null;
  },
});

// The activity entry (who, previous → new status, when) is written by a database trigger.
export async function updateEnquiryStatus(id: string, status: EnquiryStatus, _actorEmail?: string) {
  const { error } = await supabase.from("enquiries").update({ status }).eq("id", id);
  if (error) { console.error("[admin]", error); throw new Error("The status couldn't be saved. Please try again."); }
}

export const productsList = (limit?: number) => queryOptions({
  queryKey: ["admin", "products", { limit }],
  queryFn: () => fetchProducts(limit),
});

export const productDetail = (id: string) => queryOptions({
  queryKey: ["admin", "product", id],
  queryFn: async () => {
    const row = check(await supabase.from("products").select(`${PRODUCT_SELECT}, description, availability, tags`).eq("id", id).maybeSingle()) as any;
    if (!row) return null;
    const p = primaryPath(row.product_images);
    const signed = await signProductPaths(p ? [p] : []);
    return { ...row, thumbnail: p ? signed.get(p) : undefined } as any;
  },
});

export const collectionsList = () => queryOptions({
  queryKey: ["admin", "collections"],
  queryFn: async () => check(await supabase.from("collections").select("id, slug, name, status, updated_at, products(count)").order("sort_order")) as any[],
});

export const settingsList = () => queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async () => check(await supabase.from("site_settings").select("key, value, is_public, updated_at").order("key")) as any[],
});

export function formatPrice(p: Pick<AdminProduct, "price" | "priceOnRequest">) {
  if (p.priceOnRequest || p.price == null) return "On request";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(p.price));
}
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
