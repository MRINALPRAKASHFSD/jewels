import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon, PageHeader } from "@/components/site/PageShell";

export const Route = createFileRoute("/_site/about")({
  head: () => ({
    meta: [
      { title: "About — Élan Fine Jewellery" },
      { name: "description", content: "A house of fine jewellery rooted in Indian craft and modern restraint." },
      { property: "og:title", content: "About — Élan Fine Jewellery" },
      { property: "og:description", content: "A house of fine jewellery rooted in Indian craft and modern restraint." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageHeader eyebrow="About" title="Our Story" intro="A house of fine jewellery rooted in Indian craft and modern restraint.">
      <ComingSoon note="The full story arrives soon" />
    </PageHeader>
  );
}
