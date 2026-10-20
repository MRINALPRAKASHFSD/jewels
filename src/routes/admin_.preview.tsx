import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { AdminLoading, AdminState, adminBtn } from "@/components/admin/AdminUI";
import { HomeView } from "@/components/site/HomeView";
import { mergeHome, type HomeSections } from "@/data/home";
import { getContentSections, signRefs } from "@/lib/admin/cms";
import { loadAdminSession } from "@/lib/admin/session";
import { collectionsQuery, featuredProductsQuery, lookbookQuery } from "@/lib/catalog.queries";

// Staff-only preview of the homepage with unpublished drafts. Nothing here is visible to visitors.
export const Route = createFileRoute("/admin_/preview")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const admin = await loadAdminSession();
    if (admin.status === "signed-out") throw redirect({ to: "/admin/login", search: { redirect: location.href } });
    return { admin };
  },
  head: () => ({ meta: [{ title: "Homepage preview — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  pendingComponent: () => <AdminLoading full />,
  component: Preview,
});

async function draftSections(): Promise<HomeSections> {
  const rows = await getContentSections();
  const pick = rows.map((r) => ({ key: r.key, ...(r.draft ?? r.published) }));
  const imageUrls: string[] = [];
  for (const r of pick) {
    for (const [k, v] of Object.entries(r.content)) {
      if (typeof v === "string" && (k.toLowerCase().includes("image") || v.includes("/storage/v1/object/"))) {
        imageUrls.push(v);
      }
    }
  }
  const sign = await signRefs(imageUrls);
  return Object.fromEntries(
    pick.map((r) => {
      const content = { ...r.content };
      for (const [k, v] of Object.entries(content)) {
        if (typeof v === "string" && (k.toLowerCase().includes("image") || v.includes("/storage/v1/object/"))) {
          content[k] = sign(v) ?? "";
        }
      }
      return [r.key, { active: r.active, content }];
    }),
  );
}

function Preview() {
  const { admin } = Route.useRouteContext();
  const content = useQuery({ queryKey: ["admin", "preview"], queryFn: draftSections, enabled: admin.status === "ok" });
  if (admin.status !== "ok") return <AdminState full title="Access denied" body="Only staff can preview drafts."><Link to="/admin" className={adminBtn}>Back</Link></AdminState>;
  if (content.isLoading) return <AdminLoading full />;
  if (content.isError || !content.data) return <AdminState full icon="alert" title="Couldn't load the preview" body="Please try again." />;
  return (
    <div>
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-foreground px-4 py-2 font-sans text-xs text-background">
        <span>Preview: this is how the homepage will look with your drafts. It isn't published.</span>
        <Link to="/admin/content" className="underline">Back to editor</Link>
      </div>
      <Suspense fallback={<AdminLoading />}><Body content={content.data} /></Suspense>
    </div>
  );
}

function Body({ content }: { content: HomeSections }) {
  const { data: collections } = useSuspenseQuery(collectionsQuery());
  const { data: products } = useSuspenseQuery(featuredProductsQuery(4));
  const { data: lookbook } = useSuspenseQuery(lookbookQuery());
  return <HomeView home={mergeHome(content)} collections={collections} products={products} lookbook={lookbook} />;
}
