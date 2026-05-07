// Server-only helpers for public catalogue reads (publishable key, RLS applies as visitor).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { Availability, CatalogProduct, ProductSummary } from "@/data/catalog";

export type PublicDb = SupabaseClient<Database>;

export function publicDb(): PublicDb {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      // Publishable keys are opaque (not JWTs): send as apikey only.
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Never leak raw database errors to visitors. */
export function fail(context: string, error: unknown): never {
  console.error(`[catalog] ${context}`, error);
  throw new Error("We couldn't load this right now.");
}

const SIGN_TTL = 60 * 60 * 24 * 7;
const STORAGE_RE = /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/;

/**
 * Image buckets are private (workspace policy), readable via a public SELECT policy.
 * Convert stored object URLs into signed URLs in one batch per bucket.
 */
export async function signUrls(db: PublicDb, urls: (string | null | undefined)[]): Promise<Map<string, string>> {
  const byBucket = new Map<string, Set<string>>();
  for (const u of urls) {
    const m = u && STORAGE_RE.exec(u);
    if (!m) continue;
    const set = byBucket.get(m[1]!) ?? new Set<string>();
    set.add(decodeURIComponent(m[2]!));
    byBucket.set(m[1]!, set);
  }
  const out = new Map<string, string>();
  await Promise.all([...byBucket].map(async ([bucket, paths]) => {
    const { data, error } = await db.storage.from(bucket).createSignedUrls([...paths], SIGN_TTL);
    if (error) { console.error("[catalog] sign", error); return; }
    for (const d of data ?? []) if (d.signedUrl && d.path) out.set(`${bucket}/${d.path}`, d.signedUrl);
  }));
  return out;
}

export function resolveUrl(signed: Map<string, string>, u: string | null | undefined): string | undefined {
  if (!u) return undefined;
  const m = STORAGE_RE.exec(u);
  if (!m) return u;
  return signed.get(`${m[1]}/${decodeURIComponent(m[2]!)}`);
}

export const SUMMARY_SELECT =
  "id, slug, name, price, price_on_request, metal, stone, availability, is_new, is_featured, is_bestseller, is_limited, created_at, category:categories!inner(slug), collection:collections(slug), product_images(image_url, sort_order)";

export const DETAIL_SELECT =
  "id, slug, name, description, price, price_on_request, metal, stone, occasions, availability, weight, dimensions, certification, care, shipping, tags, is_new, is_featured, is_bestseller, is_limited, category:categories(slug), collection:collections(slug), product_images(image_url, alt_text, sort_order)";

type ImgRow = { image_url: string; sort_order: number };
type BaseRow = {
  id: string; slug: string; name: string; price: number | null; price_on_request: boolean; metal: string | null; stone: string | null;
  availability: string; is_new: boolean; is_featured: boolean; is_bestseller: boolean; is_limited: boolean;
  category: { slug: string } | null; collection: { slug: string } | null; product_images: ImgRow[] | null;
};

const sortedImages = (r: BaseRow) => [...(r.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url);

export function imageUrlsOf(rows: BaseRow[], max?: number) {
  return rows.flatMap((r) => sortedImages(r).slice(0, max));
}

export function toSummary(r: BaseRow, signed: Map<string, string>): ProductSummary {
  const imgs = sortedImages(r).map((u) => resolveUrl(signed, u)).filter((u): u is string => !!u);
  return {
    id: r.id, slug: r.slug, name: r.name,
    category: r.category?.slug ?? "", collection: r.collection?.slug ?? "",
    price: r.price === null ? null : Number(r.price), priceOnRequest: r.price_on_request,
    metal: r.metal ?? "", stone: r.stone ?? "Other", availability: r.availability as Availability,
    isNew: r.is_new, isFeatured: r.is_featured, isBestseller: r.is_bestseller, isLimited: r.is_limited,
    thumbnail: imgs[0], secondaryImage: imgs[1],
  };
}

type DetailRow = BaseRow & {
  description: string | null; occasions: string[]; weight: string | null; dimensions: string | null; certification: string | null;
  care: string | null; shipping: string | null; tags: string[];
};

export function toDetail(r: DetailRow, signed: Map<string, string>): CatalogProduct {
  const s = toSummary(r, signed);
  return {
    ...s,
    description: r.description ?? "", occasions: r.occasions ?? [], weight: r.weight ?? "—", dimensions: r.dimensions ?? "—",
    certification: r.certification ?? "—", care: r.care, shipping: r.shipping, tags: r.tags ?? [],
    images: sortedImages(r).map((u) => resolveUrl(signed, u)).filter((u): u is string => !!u),
  };
}
