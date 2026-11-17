// Admin dashboard placeholders and fallback mock catalogue for local development.
import { media } from "./content";
import {
  filterConfig,
  type CatalogFilters,
  type CatalogProduct,
  type CollectionItem,
  type LookbookItem,
  type ProductSummary,
} from "./catalog";

export type EnquiryStatus = "new" | "in-progress" | "closed";
export const enquiries: {
  id: string;
  name: string;
  product: string;
  channel: string;
  date: string;
  status: EnquiryStatus;
}[] = [
  {
    id: "E-1042",
    name: "Ananya Rao",
    product: "Celestial Ring",
    channel: "WhatsApp",
    date: "2 Oct 2026",
    status: "new",
  },
  {
    id: "E-1041",
    name: "Vikram Sethi",
    product: "Heritage Jhumka",
    channel: "Form",
    date: "1 Oct 2026",
    status: "in-progress",
  },
  {
    id: "E-1040",
    name: "Meera Krishnan",
    product: "Solitaire Pendant",
    channel: "WhatsApp",
    date: "29 Sep 2026",
    status: "new",
  },
  {
    id: "E-1039",
    name: "Rohan Mehta",
    product: "Aurum Bangles",
    channel: "Appointment",
    date: "28 Sep 2026",
    status: "closed",
  },
  {
    id: "E-1038",
    name: "Divya Nair",
    product: "Celestial Ring",
    channel: "WhatsApp",
    date: "26 Sep 2026",
    status: "in-progress",
  },
  {
    id: "E-1037",
    name: "Kabir Anand",
    product: "Custom Bridal Commission",
    channel: "Appointment",
    date: "24 Sep 2026",
    status: "closed",
  },
];

export const enquiryTrend = [
  { month: "May", count: 18 },
  { month: "Jun", count: 24 },
  { month: "Jul", count: 21 },
  { month: "Aug", count: 32 },
  { month: "Sep", count: 38 },
  { month: "Oct", count: 44 },
];

export const topProducts = [
  { name: "Celestial Ring", views: 3840, enquiries: 19 },
  { name: "Solitaire Pendant", views: 2910, enquiries: 14 },
  { name: "Heritage Jhumka", views: 1872, enquiries: 9 },
  { name: "Aurum Bangles", views: 1420, enquiries: 7 },
];

export const mockCategories = [
  { id: "cat-1", name: "Rings", slug: "rings", sort_order: 1 },
  { id: "cat-2", name: "Necklaces", slug: "necklaces", sort_order: 2 },
  { id: "cat-3", name: "Earrings", slug: "earrings", sort_order: 3 },
  { id: "cat-4", name: "Bracelets", slug: "bracelets", sort_order: 4 },
  { id: "cat-5", name: "Bangles", slug: "bangles", sort_order: 5 },
  { id: "cat-6", name: "Pendants", slug: "pendants", sort_order: 6 },
  { id: "cat-7", name: "Bridal", slug: "bridal", sort_order: 7 },
  { id: "cat-8", name: "Men's", slug: "mens", sort_order: 8 },
];

const lookbook1 = media.lookbookImages[0] ?? media.heroImage;
const lookbook2 = media.lookbookImages[1] ?? media.heroImage;
const lookbook3 = media.lookbookImages[2] ?? media.heroImage;

export const mockCollections: CollectionItem[] = [
  {
    id: "col-celestial",
    slug: "celestial",
    name: "Celestial",
    tagline: "Light, held in gold.",
    description: "Fluid silhouettes and diamonds that catch the light.",
    image: media.heroImage,
    pieces: 6,
  },
  {
    id: "col-heritage",
    slug: "heritage",
    name: "Heritage",
    tagline: "Where tradition meets modern form.",
    description: "Temple motifs, polki and pearls, reconsidered.",
    image: lookbook1,
    pieces: 5,
  },
  {
    id: "col-aurum",
    slug: "aurum",
    name: "Aurum",
    tagline: "The quiet statement.",
    description: "Sculptural gold, coloured stones, few words.",
    image: media.craftsmanshipImage,
    pieces: 5,
  },
];

export const mockLookbook: LookbookItem[] = [
  { id: "look-1", title: "Lookbook I", image: lookbook1 },
  { id: "look-2", title: "Lookbook II", image: lookbook2 },
  { id: "look-3", title: "Lookbook III", image: lookbook3 },
];

export const mockSiteSettings = {
  brandName: "Élan",
  whatsappNumber: "910000000000",
  currency: "INR",
  contactEmail: "hello@elan.example",
  socialLinks: { instagram: "#", facebook: "#", pinterest: "#" },
};

export const mockProducts: CatalogProduct[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    slug: "celestial-diamond-ring",
    name: "Celestial Ring",
    category: "rings",
    collection: "celestial",
    price: 84500,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Diamond",
    occasions: ["Engagement", "Anniversary"],
    availability: "in-stock",
    weight: "3.8 g",
    dimensions: "Band 1.8 mm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Clean with mild warm soapy water and a soft-bristled brush.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["rings", "18k gold", "diamond", "engagement", "anniversary"],
    isNew: false,
    isFeatured: true,
    isBestseller: true,
    isLimited: false,
    description:
      "Designed around a fluid silhouette, the Celestial Ring balances warm 18K gold with a carefully set natural diamond, flanked by two smaller stones that catch the light as the hand moves.",
    images: [media.craftStepImages.finish, media.storyImage, media.craftsmanshipImage],
    thumbnail: media.craftStepImages.finish,
    secondaryImage: media.storyImage,
  },
  {
    id: "03551aae-5cd8-4a56-9b4a-5f5691fd3297",
    slug: "heritage-pearl-jhumka",
    name: "Heritage Jhumka",
    category: "earrings",
    collection: "heritage",
    price: 126000,
    priceOnRequest: false,
    metal: "22K Gold",
    stone: "Pearl",
    occasions: ["Statement", "Bridal"],
    availability: "in-stock",
    weight: "18.4 g",
    dimensions: "48 mm drop",
    certification: "BIS Hallmarked",
    care: "Avoid contact with perfumes and cosmetics.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["earrings", "22k gold", "pearl", "statement", "bridal"],
    isNew: false,
    isFeatured: true,
    isBestseller: true,
    isLimited: false,
    description:
      "A temple-bell jhumka reconsidered: hand-pierced 22K gold, a crown of polki, and a fringe of keshi pearls that moves softly with every turn.",
    images: [lookbook1, media.craftsmanshipImage, media.storyImage],
    thumbnail: lookbook1,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    slug: "solitaire-diamond-pendant",
    name: "Solitaire Pendant",
    category: "pendants",
    collection: "celestial",
    price: 98000,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Diamond",
    occasions: ["Everyday", "Gifting"],
    availability: "in-stock",
    weight: "2.6 g",
    dimensions: "Chain 45 cm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Clean periodically with warm soapy water.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["pendants", "18k gold", "diamond", "everyday", "gifting"],
    isNew: false,
    isFeatured: true,
    isBestseller: false,
    isLimited: false,
    description:
      "A single round brilliant held in four slender claws, suspended from a fine cable chain. Made to be worn every day and rarely taken off.",
    images: [media.heroImage, media.craftsmanshipImage, media.storyImage],
    thumbnail: media.heroImage,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    slug: "aurum-engraved-bangles",
    name: "Aurum Bangles",
    category: "bangles",
    collection: "aurum",
    price: null,
    priceOnRequest: true,
    metal: "22K Gold",
    stone: "Other",
    occasions: ["Statement", "Bridal"],
    availability: "made-to-order",
    weight: "32.0 g (pair)",
    dimensions: "2.4 / 2.6",
    certification: "BIS Hallmarked",
    care: "Store wrapped in soft chamois cloth.",
    shipping: "Made to order · dispatched in 3 to 4 weeks.",
    tags: ["bangles", "22k gold", "other", "statement", "bridal"],
    isNew: false,
    isFeatured: true,
    isBestseller: false,
    isLimited: true,
    description:
      "A pair of slim bangles, each hand-engraved with a woven pattern drawn from old Banarasi borders. Made to order in your size.",
    images: [media.craftStepImages.selection, media.storyImage, media.craftsmanshipImage],
    thumbnail: media.craftStepImages.selection,
    secondaryImage: media.storyImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440005",
    slug: "verdant-emerald-ring",
    name: "Verdant Ring",
    category: "rings",
    collection: "aurum",
    price: 168000,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Emerald",
    occasions: ["Engagement", "Statement"],
    availability: "in-stock",
    weight: "4.2 g",
    dimensions: "Stone 9 × 7 mm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Clean gently by hand only.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["rings", "18k gold", "emerald", "engagement", "statement"],
    isNew: true,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "An oval Zambian emerald, its colour deep and even, framed by clusters of small diamonds on a tapered 18K band.",
    images: [lookbook2, media.craftsmanshipImage, media.storyImage],
    thumbnail: lookbook2,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440006",
    slug: "rani-ruby-studs",
    name: "Rani Studs",
    category: "earrings",
    collection: "heritage",
    price: 42000,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Ruby",
    occasions: ["Everyday", "Gifting"],
    availability: "in-stock",
    weight: "1.9 g",
    dimensions: "5 mm",
    certification: "BIS Hallmarked",
    care: "Store in a separate pouch to prevent scratching.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["earrings", "18k gold", "ruby", "everyday", "gifting"],
    isNew: true,
    isFeatured: false,
    isBestseller: true,
    isLimited: false,
    description:
      "Two round rubies in four-claw settings, small enough for every day and saturated enough to be noticed.",
    images: [lookbook2, media.craftsmanshipImage, media.storyImage],
    thumbnail: lookbook2,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440007",
    slug: "moonlight-pearl-strand",
    name: "Moonlight Strand",
    category: "necklaces",
    collection: "celestial",
    price: 74000,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Pearl",
    occasions: ["Everyday", "Anniversary"],
    availability: "in-stock",
    weight: "28.0 g",
    dimensions: "42 cm",
    certification: "BIS Hallmarked",
    care: "Wipe clean with a damp cloth after wearing.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["necklaces", "18k gold", "pearl", "everyday", "anniversary"],
    isNew: false,
    isFeatured: false,
    isBestseller: true,
    isLimited: false,
    description:
      "Hand-knotted akoya pearls, matched for lustre and closed with a fluted 18K gold clasp.",
    images: [media.heroImage, lookbook1, media.craftsmanshipImage],
    thumbnail: media.heroImage,
    secondaryImage: lookbook1,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440008",
    slug: "lumiere-tennis-bracelet",
    name: "Lumière Bracelet",
    category: "bracelets",
    collection: "celestial",
    price: 245000,
    priceOnRequest: false,
    metal: "White Gold",
    stone: "Diamond",
    occasions: ["Anniversary", "Gifting"],
    availability: "in-stock",
    weight: "9.6 g",
    dimensions: "17 cm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Periodic prong check recommended annually.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["bracelets", "white gold", "diamond", "anniversary", "gifting"],
    isNew: true,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "Forty-four round diamonds set in an unbroken line of white gold, with a hidden box clasp.",
    images: [media.craftStepImages.finish, media.storyImage, media.craftsmanshipImage],
    thumbnail: media.craftStepImages.finish,
    secondaryImage: media.storyImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440009",
    slug: "monarch-onyx-signet",
    name: "Monarch Signet",
    category: "mens",
    collection: "aurum",
    price: 92000,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Other",
    occasions: ["Everyday", "Gifting"],
    availability: "made-to-order",
    weight: "11.2 g",
    dimensions: "Face 14 mm",
    certification: "BIS Hallmarked",
    care: "Clean with a soft cloth.",
    shipping: "Made to order · dispatched in 2 to 3 weeks.",
    tags: ["mens", "18k gold", "other", "everyday", "gifting"],
    isNew: false,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "A substantial signet in polished 18K gold with a domed black onyx face. Can be engraved on the inner band.",
    images: [media.craftsmanshipImage, media.storyImage, media.craftStepImages.design],
    thumbnail: media.craftsmanshipImage,
    secondaryImage: media.storyImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440010",
    slug: "maharani-bridal-choker",
    name: "Maharani Choker",
    category: "bridal",
    collection: "heritage",
    price: null,
    priceOnRequest: true,
    metal: "22K Gold",
    stone: "Emerald",
    occasions: ["Bridal", "Statement"],
    availability: "made-to-order",
    weight: "96.0 g",
    dimensions: "Adjustable",
    certification: "IGI certified · BIS Hallmarked",
    care: "Store flat in bespoke wooden box provided.",
    shipping: "Bespoke commission · 8 to 12 weeks craft time.",
    tags: ["bridal", "22k gold", "emerald", "bridal", "statement"],
    isNew: false,
    isFeatured: true,
    isBestseller: false,
    isLimited: true,
    description:
      "Uncut polki in kundan settings, carved emerald beads, and a fringe of pearls. A bridal heirloom made over twelve weeks by a single karigar.",
    images: [lookbook1, media.craftsmanshipImage, media.storyImage],
    thumbnail: lookbook1,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440011",
    slug: "nila-sapphire-pendant",
    name: "Nila Pendant",
    category: "pendants",
    collection: "celestial",
    price: 136000,
    priceOnRequest: false,
    metal: "Platinum",
    stone: "Sapphire",
    occasions: ["Anniversary", "Gifting"],
    availability: "in-stock",
    weight: "3.1 g",
    dimensions: "Stone 10 × 7 mm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Clean with mild warm water.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["pendants", "platinum", "sapphire", "anniversary", "gifting"],
    isNew: true,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "A pear-cut Ceylon sapphire in a three-claw platinum setting, on a fine platinum chain.",
    images: [media.heroImage, media.craftsmanshipImage, media.storyImage],
    thumbnail: media.heroImage,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440012",
    slug: "dune-rose-gold-hoops",
    name: "Dune Hoops",
    category: "earrings",
    collection: "aurum",
    price: 58000,
    priceOnRequest: false,
    metal: "Rose Gold",
    stone: "Other",
    occasions: ["Everyday", "Statement"],
    availability: "in-stock",
    weight: "8.4 g",
    dimensions: "28 mm",
    certification: "BIS Hallmarked",
    care: "Clean with dry microfiber cloth.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["earrings", "rose gold", "other", "everyday", "statement"],
    isNew: true,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "Sculptural hoops in rose gold, twisted like wind-shaped sand. Light to wear, bold to look at.",
    images: [lookbook2, media.craftsmanshipImage, media.storyImage],
    thumbnail: lookbook2,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440013",
    slug: "panna-emerald-drop-necklace",
    name: "Panna Necklace",
    category: "necklaces",
    collection: "aurum",
    price: 112000,
    priceOnRequest: false,
    metal: "22K Gold",
    stone: "Emerald",
    occasions: ["Anniversary", "Gifting"],
    availability: "in-stock",
    weight: "5.4 g",
    dimensions: "Chain 45 cm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Avoid moisture and perfumes.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["necklaces", "22k gold", "emerald", "anniversary", "gifting"],
    isNew: false,
    isFeatured: false,
    isBestseller: true,
    isLimited: false,
    description:
      "A pear-shaped emerald in a bezel of 22K gold, crowned with a single diamond and hung on a fine trace chain.",
    images: [lookbook3, media.craftsmanshipImage, media.storyImage],
    thumbnail: lookbook3,
    secondaryImage: media.craftsmanshipImage,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440014",
    slug: "solace-diamond-band",
    name: "Solace Band",
    category: "rings",
    collection: "celestial",
    price: 22500,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Diamond",
    occasions: ["Everyday", "Gifting"],
    availability: "in-stock",
    weight: "1.6 g",
    dimensions: "Band 1.4 mm",
    certification: "IGI certified · BIS Hallmarked",
    care: "Clean with gentle jewelry cleanser.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["rings", "18k gold", "diamond", "everyday", "gifting"],
    isNew: false,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "A whisper-thin band set with a single small diamond. Designed to be stacked, or worn alone.",
    images: [media.storyImage, media.craftStepImages.finish, media.craftsmanshipImage],
    thumbnail: media.storyImage,
    secondaryImage: media.craftStepImages.finish,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440015",
    slug: "vivaah-bridal-chandbali",
    name: "Vivaah Chandbali",
    category: "bridal",
    collection: "heritage",
    price: 285000,
    priceOnRequest: false,
    metal: "22K Gold",
    stone: "Pearl",
    occasions: ["Bridal"],
    availability: "made-to-order",
    weight: "34.0 g (pair)",
    dimensions: "72 mm drop",
    certification: "BIS Hallmarked",
    care: "Store wrapped in muslin.",
    shipping: "Made to order · dispatched in 4 to 6 weeks.",
    tags: ["bridal", "22k gold", "pearl", "bridal"],
    isNew: false,
    isFeatured: false,
    isBestseller: true,
    isLimited: false,
    description:
      "Crescent chandbalis in hand-worked 22K gold, edged with seed pearls and finished with pearl drops.",
    images: [lookbook1, media.craftStepImages.finish, media.craftsmanshipImage],
    thumbnail: lookbook1,
    secondaryImage: media.craftStepImages.finish,
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440016",
    slug: "keystone-gold-cuff",
    name: "Keystone Cuff",
    category: "bracelets",
    collection: "aurum",
    price: 48000,
    priceOnRequest: false,
    metal: "18K Gold",
    stone: "Other",
    occasions: ["Everyday", "Statement"],
    availability: "in-stock",
    weight: "12.8 g",
    dimensions: "6 mm wide",
    certification: "BIS Hallmarked",
    care: "Clean with polishing cloth.",
    shipping: "Complimentary insured delivery within 3 to 5 business days.",
    tags: ["bracelets", "18k gold", "other", "everyday", "statement"],
    isNew: false,
    isFeatured: false,
    isBestseller: false,
    isLimited: false,
    description:
      "An open cuff in brushed 18K gold with a softly squared profile. Shapes gently to the wrist.",
    images: [media.craftStepImages.selection, media.storyImage, media.craftsmanshipImage],
    thumbnail: media.craftStepImages.selection,
    secondaryImage: media.storyImage,
  },
];

export function toProductSummary(p: CatalogProduct): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    collection: p.collection,
    price: p.price,
    priceOnRequest: p.priceOnRequest,
    metal: p.metal,
    stone: p.stone,
    availability: p.availability,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    isBestseller: p.isBestseller,
    isLimited: p.isLimited,
    thumbnail: p.thumbnail,
    secondaryImage: p.secondaryImage,
  };
}

export function queryMockCatalog(
  filters: CatalogFilters,
  limit = 12,
): { items: ProductSummary[]; total: number } {
  let list = [...mockProducts];

  if (filters.category === "new") {
    list = list.filter((p) => p.isNew);
  } else if (filters.category && filters.category !== "all") {
    list = list.filter((p) => p.category === filters.category);
  }

  if (filters.collection?.length) {
    list = list.filter((p) => filters.collection.includes(p.collection));
  }
  if (filters.metal?.length) {
    list = list.filter((p) => filters.metal.includes(p.metal));
  }
  if (filters.stone?.length) {
    list = list.filter((p) => filters.stone.includes(p.stone));
  }
  if (filters.occasion?.length) {
    list = list.filter((p) => p.occasions.some((o) => filters.occasion.includes(o)));
  }
  if (filters.availability?.length) {
    list = list.filter((p) => filters.availability.includes(p.availability));
  }
  if (filters.price?.length) {
    const ranges = filterConfig.price.filter((r) => filters.price.includes(r.id));
    if (ranges.length) {
      list = list.filter((p) => {
        if (p.price === null) return false;
        return ranges.some((r) => p.price! >= r.min && p.price! < r.max);
      });
    }
  }

  if (filters.q?.trim()) {
    const qLower = filters.q.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(qLower) ||
        p.metal.toLowerCase().includes(qLower) ||
        p.stone.toLowerCase().includes(qLower) ||
        p.tags.some((t) => t.toLowerCase().includes(qLower)),
    );
  }

  switch (filters.sort) {
    case "newest":
      list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      break;
    case "price-asc":
      list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      break;
    case "price-desc":
      list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      break;
    default:
      list.sort(
        (a, b) =>
          (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) ||
          (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0),
      );
  }

  const total = list.length;
  const items = list.slice(0, limit).map(toProductSummary);
  return { items, total };
}

export function getMockFeaturedProducts(limit = 4): ProductSummary[] {
  return mockProducts
    .filter((p) => p.isFeatured)
    .sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0))
    .slice(0, limit)
    .map(toProductSummary);
}

export function getMockProductBySlug(
  slug: string,
): { product: CatalogProduct; related: ProductSummary[] } | null {
  const p = mockProducts.find((item) => item.slug === slug);
  if (!p) return null;

  const related = mockProducts
    .filter(
      (item) =>
        item.id !== p.id && (item.category === p.category || item.collection === p.collection),
    )
    .slice(0, 4)
    .map(toProductSummary);

  return { product: p, related };
}

export function getMockProductsBySlugs(slugs: string[]): ProductSummary[] {
  return slugs
    .map((s) => mockProducts.find((p) => p.slug === s))
    .filter((p): p is CatalogProduct => !!p)
    .map(toProductSummary);
}
