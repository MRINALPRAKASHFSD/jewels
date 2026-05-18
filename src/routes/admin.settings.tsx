import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader, AdminState, ComingNext, DataTable, Panel } from "@/components/admin/AdminUI";
import { formatDate, settingsList } from "@/lib/admin/data";
import { RequireAccess } from "@/lib/admin/use-admin";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  // Admin-only screen (settings changes + future /admin/settings/users).
  component: () => <RequireAccess resource="settings" action="update"><SettingsPage /></RequireAccess>,
});

function SettingsPage() {
  const { data, isLoading, isError } = useQuery(settingsList());
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" description="Site-wide settings. Editing arrives in the next phase." />
      <Panel title="Site settings">
        {isError ? <AdminState icon="alert" title="Couldn't load settings" body="Please refresh the page to try again." /> : (
          <DataTable rows={data ?? []} rowKey={(r) => r.key} empty={isLoading ? "Loading…" : "No settings yet."} columns={[
            { header: "Setting", cell: (r) => <span className="font-medium">{r.key}</span> },
            { header: "Value", cell: (r) => <code className="block max-w-[28rem] truncate text-xs text-muted-foreground">{JSON.stringify(r.value)}</code>, className: "hidden sm:table-cell" },
            { header: "Visibility", cell: (r) => (r.is_public ? "Public" : "Private") },
            { header: "Updated", cell: (r) => <span className="text-muted-foreground">{formatDate(r.updated_at)}</span>, className: "hidden md:table-cell" },
          ]} />
        )}
      </Panel>
      <ComingNext title="Admin users" body="Inviting staff and assigning roles will live here. Only administrators will have access." />
    </div>
  );
}
