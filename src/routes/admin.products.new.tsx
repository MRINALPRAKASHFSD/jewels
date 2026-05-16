import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/ProductForm";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/products/new")({
  head: () => ({ meta: [{ title: "Add product — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="products" action="create"><ProductForm id={null} /></RequireAccess>,
});
