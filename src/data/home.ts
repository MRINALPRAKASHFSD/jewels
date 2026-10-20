// Homepage content model: fixed layout, editable fields only. Defaults keep the page complete if a field is empty.
import { homeCopy, media } from "./content";

export type FieldType = "text" | "textarea" | "image";
export type SectionDef = { key: string; label: string; hideable: boolean; fields: { name: string; label: string; type: FieldType }[] };

export const HOME_SECTIONS: SectionDef[] = [
  { key: "hero", label: "Hero", hideable: false, fields: [
    { name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "textarea" },
    { name: "description", label: "Description (optional)", type: "textarea" },
    { name: "primaryCta", label: "Primary button", type: "text" }, { name: "secondaryCta", label: "Secondary link", type: "text" }, { name: "image", label: "Image", type: "image" }] },
  { key: "collections", label: "Collections", hideable: true, fields: [{ name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "textarea" }] },
  { key: "signature", label: "Signature Pieces", hideable: true, fields: [{ name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "textarea" }] },
  { key: "story", label: "Our Story", hideable: true, fields: [
    { name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "textarea" }, { name: "body", label: "Body", type: "textarea" },
    { name: "cta", label: "Link text", type: "text" }, { name: "image", label: "Image", type: "image" }] },
  { key: "quote", label: "Quote", hideable: true, fields: [{ name: "quote", label: "Quote", type: "text" }, { name: "supporting", label: "Supporting line", type: "text" }] },
  { key: "craftsmanship", label: "Craftsmanship", hideable: true, fields: [
    { name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "textarea" }, { name: "description", label: "Description", type: "textarea" },
    { name: "image", label: "Workshop image", type: "image" },
    { name: "step1Title", label: "Step 1 title", type: "text" }, { name: "step1", label: "Step 1 description", type: "textarea" }, { name: "step1Image", label: "Step 1 image", type: "image" },
    { name: "step2Title", label: "Step 2 title", type: "text" }, { name: "step2", label: "Step 2 description", type: "textarea" }, { name: "step2Image", label: "Step 2 image", type: "image" },
    { name: "step3Title", label: "Step 3 title", type: "text" }, { name: "step3", label: "Step 3 description", type: "textarea" }, { name: "step3Image", label: "Step 3 image", type: "image" },
    { name: "step4Title", label: "Step 4 title", type: "text" }, { name: "step4", label: "Step 4 description", type: "textarea" }, { name: "step4Image", label: "Step 4 image", type: "image" }] },
  { key: "lookbook", label: "Lookbook", hideable: true, fields: [{ name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "textarea" }] },
  { key: "appointment", label: "Find Your Piece", hideable: true, fields: [
    { name: "eyebrow", label: "Eyebrow", type: "text" }, { name: "heading", label: "Heading", type: "text" }, { name: "body", label: "Body", type: "textarea" },
    { name: "details", label: "Visit details (optional)", type: "textarea" }, { name: "cta", label: "Button text", type: "text" }] },
];

const steps = homeCopy.craft.steps as readonly { title: string; text: string; key: keyof typeof media.craftStepImages }[];
export const HOME_DEFAULTS: Record<string, Record<string, string>> = {
  hero: { eyebrow: homeCopy.hero.eyebrow, heading: homeCopy.hero.headline, description: "", primaryCta: homeCopy.hero.cta, secondaryCta: homeCopy.hero.secondary, image: media.heroImage },
  collections: { eyebrow: homeCopy.collections.eyebrow, heading: homeCopy.collections.title },
  signature: { eyebrow: homeCopy.signature.eyebrow, heading: homeCopy.signature.title },
  story: { eyebrow: homeCopy.story.eyebrow, heading: homeCopy.story.title, body: homeCopy.story.body, cta: "Discover our story", image: media.storyImage },
  quote: { quote: homeCopy.quote[0]!, supporting: homeCopy.quote[1]! },
  craftsmanship: {
    eyebrow: homeCopy.craft.eyebrow, heading: homeCopy.craft.title, description: "Four stages, one pair of hands. Nothing leaves the atelier until it is right.", image: media.craftsmanshipImage,
    step1Title: steps[0]!.title, step1: steps[0]!.text, step1Image: media.craftStepImages.design,
    step2Title: steps[1]!.title, step2: steps[1]!.text, step2Image: media.craftStepImages.selection,
    step3Title: steps[2]!.title, step3: steps[2]!.text, step3Image: media.craftStepImages.craft,
    step4Title: steps[3]!.title, step4: steps[3]!.text, step4Image: media.craftStepImages.finish,
  },
  lookbook: { eyebrow: homeCopy.lookbook.eyebrow, heading: homeCopy.lookbook.title },
  appointment: {
    eyebrow: homeCopy.appointment.eyebrow, heading: homeCopy.appointment.title, body: homeCopy.appointment.body,
    details: homeCopy.appointment.details, cta: homeCopy.appointment.cta,
  },
};

/** Section content with image fields already resolved to displayable URLs. */
export type HomeSections = Record<string, { active: boolean; content: Record<string, string> }>;

export type HomeView = Record<string, { active: boolean; f: Record<string, string> }>;
export function mergeHome(sections: HomeSections): HomeView {
  const out: HomeView = {};
  for (const [key, defs] of Object.entries(HOME_DEFAULTS)) {
    const s = sections[key];
    const f: Record<string, string> = {};
    for (const [name, d] of Object.entries(defs)) {
      const v = s?.content[name];
      f[name] = typeof v === "string" && v.trim() ? v : name === "description" && key === "hero" ? "" : d;
    }
    out[key] = { active: key === "hero" ? true : s ? s.active : true, f };
  }
  return out;
}
