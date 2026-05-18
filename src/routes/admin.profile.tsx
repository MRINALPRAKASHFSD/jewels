import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, Panel, adminBtn, useSignOut } from "@/components/admin/AdminUI";
import { useAdminUser } from "@/lib/admin/use-admin";
import { ROLE_LABEL } from "@/lib/admin/permissions";

export const Route = createFileRoute("/admin/profile")({
  head: () => ({ meta: [{ title: "Profile — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAdminUser();
  const signOut = useSignOut();
  const rows: [string, string][] = [["Name", user.name], ["Email", user.email], ["Role", ROLE_LABEL[user.role]]];
  return (
    <div className="max-w-xl space-y-6">
      <AdminPageHeader title="Profile" />
      <Panel title="Your account">
        <dl className="divide-y divide-border">
          {rows.map(([k, v]) => <div key={k} className="grid grid-cols-3 gap-4 px-5 py-3 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="col-span-2 break-words">{v}</dd></div>)}
        </dl>
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">Roles are managed by an administrator.</p>
      </Panel>
      <button onClick={signOut} className={adminBtn}>Sign out</button>
    </div>
  );
}
