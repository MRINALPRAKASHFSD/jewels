// Catalogue types, filter/sort configuration and pure display helpers.
// Data itself lives in the database — see src/lib/catalog.functions.ts.

export type CategorySlug = "rings" | "necklaces" | "earrings" | "bracelets" | "bangles" | "pendants" | "bridal" | "mens";
export type Metal = "18K Gold" | "22K Gold" | "Platinum" | "Rose Gold" | "White Gold";
export type Stone = "Diamond" | "Emerald" | "Ruby" | "Sapphire" | "Pearl" | "Other";
export type Occasion = "Everyday" | "Bridal" | "Anniversary" | "Engagement" | "Statement" | "Gifting";
export type Availability = "in-stock" | "made-to-order" | "sold-out";

/** Fields a ProductCard needs (listing queries fetch only these). */
export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  category: string; // category slug
  collection: string; // collection slug
  price: number | null;
  priceOnRequest: boolean;
  metal: string;
  stone: string;
  availability: Availability;
  isNew: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isLimited: boolean;
  thumbnail?: string | undefined;
  secondaryImage?: string | undefined;
};

/** Full product for the detail page. */
export type CatalogProduct = ProductSummary & {
  description: string;
  occasions: string[];
  weight: string;
  dimensions: string;
  certification: string;
  care: string | null;
  shipping: string | null;
  images: string[];
  tags: string[];
};

export type CollectionItem = { id: string; slug: string; name: string; tagline: string; description: string; image?: string | undefined; pieces: number };
export type LookbookItem = { id: string; title: string; image: string };

// "All" and "New Arrivals" are frontend concepts; the rest mirror the categories table.
export const categories: { slug: CategorySlug | "all" | "new"; label: string }[] = [
  { slug: "all", label: "All" },
  { slug: "rings", label: "Rings" },
  { slug: "necklaces", label: "Necklaces" },
  { slug: "earrings", label: "Earrings" },
  { slug: "bracelets", label: "Bracelets" },
  { slug: "bangles", label: "Bangles" },
  { slug: "pendants", label: "Pendants" },
  { slug: "bridal", label: "Bridal" },
  { slug: "mens", label: "Men's" },
  { slug: "new", label: "New Arrivals" },
];

export const collectionOptions = [
  { slug: "celestial", label: "Celestial" },
  { slug: "heritage", label: "Heritage" },
  { slug: "aurum", label: "Aurum" },
];

export const filterConfig = {
  metal: ["18K Gold", "22K Gold", "Platinum", "Rose Gold", "White Gold"] as Metal[],
  stone: ["Diamond", "Emerald", "Ruby", "Sapphire", "Pearl", "Other"] as Stone[],
  occasion: ["Everyday", "Bridal", "Anniversary", "Engagement", "Statement", "Gifting"] as Occasion[],
  price: [
    { id: "u25", label: "Under ₹25,000", min: 0, max: 25000 },
    { id: "25-50", label: "₹25,000 – ₹50,000", min: 25000, max: 50000 },
    { id: "50-100", label: "₹50,000 – ₹1,00,000", min: 50000, max: 100000 },
    { id: "100-250", label: "₹1,00,000 – ₹2,50,000", min: 100000, max: 250000 },
    { id: "250+", label: "₹2,50,000+", min: 250000, max: Infinity },
  ],
  availability: [
    { id: "in-stock", label: "In stock" },
    { id: "made-to-order", label: "Made to order" },
  ],
};

export const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low → High" },
  { id: "price-desc", label: "Price: High → Low" },
] as const;
export type SortId = (typeof sortOptions)[number]["id"];

export type CatalogFilters = {
  category: string;
  q: string;
  collection: string[];
  metal: string[];
  stone: string[];
  occasion: string[];
  price: string[];
  availability: string[];
  sort: SortId;
};

/* ---------- Display helpers ---------- */

type Priced = Pick<ProductSummary, "price">;
export const getCategoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;
export const getCollectionLabel = (slug: string) => collectionOptions.find((c) => c.slug === slug)?.label ?? slug;
export const materialLine = (p: Pick<ProductSummary, "metal" | "stone">) => (!p.stone || p.stone === "Other" ? p.metal : `${p.metal} · ${p.stone}`);
export const formatProductPrice = (p: Priced) => (p.price === null ? "Price on Request" : "₹" + p.price.toLocaleString("en-IN"));
export const productLabel = (p: Pick<ProductSummary, "isLimited" | "isNew" | "isBestseller">) => (p.isLimited ? "Limited" : p.isNew ? "New" : p.isBestseller ? "Bestseller" : undefined);

export const productDetails = (p: CatalogProduct) => [
  { label: "Metal", value: p.metal },
  { label: "Stone", value: p.stone === "Other" ? "—" : p.stone },
  { label: "Weight", value: p.weight },
  { label: "Dimensions", value: p.dimensions },
  { label: "Certification", value: p.certification },
  { label: "Availability", value: p.availability === "made-to-order" ? "Made to order · 4–6 weeks" : p.availability === "sold-out" ? "Currently unavailable" : "Ready to ship" },
];
