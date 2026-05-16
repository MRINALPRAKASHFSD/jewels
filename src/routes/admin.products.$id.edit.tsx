import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminLoading, AdminState, adminBtn } from "@/components/admin/AdminUI";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProduct } from "@/lib/admin/cms";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/products/$id/edit")({
  head: () => ({ meta: [{ title: "Edit product — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="products" action="update"><EditProduct /></RequireAccess>,
});

function EditProduct() {
  const { id } = Route.useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin", "product-edit", id], queryFn: () => getProduct(id), staleTime: Infinity, gcTime: 0 });
  if (isLoading) return <AdminLoading />;
  if (isError) return <AdminState icon="alert" title="Couldn't load this product" body="Please refresh the page to try again." />;
  if (!data) return <AdminState icon="alert" title="Product not found" body="It may have been removed."><Link to="/admin/products" className={adminBtn}>All products</Link></AdminState>;
  return <ProductForm key={data.id} id={data.id} initial={data.values} initialImages={data.images} />;
}
