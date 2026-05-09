// Central image + copy configuration. Replace these with client photography / CMS data later.
import hero from "@/assets/hero.jpg";
import collection1 from "@/assets/collection-1.jpg";
import story from "@/assets/story.jpg";
import craft from "@/assets/craft.jpg";
import craftDesign from "@/assets/craft-design.jpg";
import craftGems from "@/assets/craft-gems.jpg";
import lookbook1 from "@/assets/lookbook.jpg";
import lookbook2 from "@/assets/lookbook-2.jpg";
import lookbook3 from "@/assets/lookbook-3.jpg";

export const media = {
  heroImage: hero,
  storyImage: story,
  craftsmanshipImage: craft,
  craftStepImages: { design: craftDesign, selection: craftGems, craft, finish: collection1 },
  lookbookImages: [lookbook1, lookbook3, lookbook2],
};

export const homeCopy = {
  hero: { eyebrow: "The Art of Elegance", headline: "Jewellery designed to become part of your story.", cta: "Explore Collection", secondary: "Discover our story" },
  collections: { eyebrow: "The Collections", title: "Pieces created for moments worth remembering." },
  signature: { eyebrow: "Signature Pieces", title: "A study in proportion, light and detail." },
  story: {
    eyebrow: "Our Story",
    title: "Jewellery is not simply worn. It becomes part of the moments we choose to remember.",
    body: "Each Élan piece begins as a single drawing and ends in the hands of the master who made it. We work in small numbers, with ethically sourced gold and stones chosen one by one — so that what you wear carries the patience it was made with.",
  },
  quote: ["Some pieces are worn.", "Some pieces become memories."],
  craft: {
    eyebrow: "Craftsmanship",
    title: "Where every detail has a purpose.",
    steps: [
      { n: "01", title: "Design", text: "Every piece begins as a hand drawing, refined until each line feels inevitable.", key: "design" },
      { n: "02", title: "Selection", text: "Stones are chosen one at a time for light, colour and character.", key: "selection" },
      { n: "03", title: "Craft", text: "A single karigar shapes, sets and assembles each piece by hand.", key: "craft" },
      { n: "04", title: "Finish", text: "Polished, inspected and hallmarked before it leaves the atelier.", key: "finish" },
    ] as const,
  },
  lookbook: { eyebrow: "The Lookbook", title: "Stories told in light, form and detail." },
  appointment: { eyebrow: "Private Appointments", title: "Find your piece", body: "Discover the jewellery that belongs to your story." },
};

// WhatsApp message templates. The number itself lives in site_settings (key: whatsapp_number).
export const whatsapp = {
  defaultMessage: "Hello, I would like to enquire about your jewellery collection.",
  productMessage: (name: string) => `Hello, I am interested in the ${name}. Could you please share more details?`,
};

export function whatsappLink(number: string, productName?: string) {
  const text = productName ? whatsapp.productMessage(productName) : whatsapp.defaultMessage;
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
