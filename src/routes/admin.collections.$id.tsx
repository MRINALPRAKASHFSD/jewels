import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLoading, AdminState, adminBtn } from "@/components/admin/AdminUI";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getCollection } from "@/lib/admin/cms";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/collections/$id")({
  head: () => ({ meta: [{ title: "Edit collection — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="collections" action="update"><EditCollection /></RequireAccess>,
});

function EditCollection() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "collection-edit", id], queryFn: () => getCollection(id), staleTime: Infinity, gcTime: 0 });
  if (isLoading) return <AdminLoading />;
  if (isError) return <AdminState icon="alert" title="Couldn't load this collection" body="Please refresh the page to try again." />;
  if (!data) return <AdminState icon="alert" title="Collection not found" body="It may have been removed."><Link to="/admin/collections" className={adminBtn}>All collections</Link></AdminState>;
  return <CollectionForm key={data.id} id={data.id} initial={data.values} initialIds={data.productIds} previews={data.previews} />;
}
