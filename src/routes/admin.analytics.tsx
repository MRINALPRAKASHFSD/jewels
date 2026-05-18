import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, ComingNext } from "@/components/admin/AdminUI";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => (
    <RequireAccess resource="analytics">
      <div className="space-y-6">
        <AdminPageHeader title="Analytics" description="Visits, popular pieces and enquiry trends." />
        <ComingNext title="Analytics" body="Analytics reporting arrives in a later phase." />
      </div>
    </RequireAccess>
  ),
});
