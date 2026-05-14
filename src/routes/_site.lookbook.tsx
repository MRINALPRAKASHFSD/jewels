import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/site/PageShell";
import { Container, ImageReveal, Reveal } from "@/components/site/primitives";
import { lookbookQuery } from "@/lib/catalog.queries";

export const Route = createFileRoute("/_site/lookbook")({
  head: () => ({
    meta: [
      { title: "Lookbook — Élan Fine Jewellery" },
      { name: "description", content: "Editorial stories on gold, silk and stillness from the Élan lookbook." },
      { property: "og:title", content: "Lookbook — Élan Fine Jewellery" },
      { property: "og:description", content: "Editorial stories on gold, silk and stillness from the Élan lookbook." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(lookbookQuery()),
  component: Page,
});

function Page() {
  const { data: items } = useSuspenseQuery(lookbookQuery());
  return (
    <PageHeader eyebrow="Lookbook" title="Lookbook" intro="Editorial stories on gold, silk and stillness from the Élan lookbook.">
      <Container className="grid grid-cols-1 gap-x-6 gap-y-14 py-20 sm:grid-cols-2 lg:py-28">
        {items.map((it, i) => (
          <Reveal key={it.id} delay={(i % 2) * 0.1} className={i % 2 === 1 ? "sm:mt-24" : ""}>
            <ImageReveal src={it.image} alt={it.title || "Élan lookbook image"} ratio="portrait" />
            {it.title && <p className="eyebrow mt-5 text-muted-foreground">{it.title}</p>}
          </Reveal>
        ))}
        {!items.length && <p className="text-muted-foreground">New stories are coming soon.</p>}
      </Container>
    </PageHeader>
  );
}
