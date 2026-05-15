import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader } from "@/components/site/PageShell";

export const Route = createFileRoute("/_site/craftsmanship")({
  head: () => ({
    meta: [
      { title: "Craftsmanship — Élan Fine Jewellery" },
      { name: "description", content: "Inside the atelier — the hands, tools and hours behind every Élan piece." },
      { property: "og:title", content: "Craftsmanship — Élan Fine Jewellery" },
      { property: "og:description", content: "Inside the atelier — the hands, tools and hours behind every Élan piece." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageHeader eyebrow="Craftsmanship" title="The Atelier" intro="Inside the atelier — the hands, tools and hours behind every Élan piece.">
      <ComingSoon note="The atelier opens its doors soon" />
    </PageHeader>
  );
}
