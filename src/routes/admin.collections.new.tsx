import { createFileRoute } from "@tanstack/react-router";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/collections/new")({
  head: () => ({ meta: [{ title: "Create collection — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="collections" action="create"><CollectionForm id={null} /></RequireAccess>,
});
