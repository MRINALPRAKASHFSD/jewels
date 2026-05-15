import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { AdminHeader, AdminLoading, AdminSidebar, AdminState, adminBtn, adminBtnGhost, useDrawer, useSignOut } from "@/components/admin/AdminUI";
import { loadAdminSession } from "@/lib/admin/session";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/admin")({
  // The session lives in browser storage, so the guard only runs in the browser — nothing renders before it resolves.
  ssr: false,
  beforeLoad: async ({ location }) => {
    const admin = await loadAdminSession();
    if (admin.status === "signed-out") {
      throw redirect({ to: "/admin/login", search: { redirect: location.href } });
    }
    return { admin };
  },
  head: () => ({ meta: [{ title: "Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  pendingComponent: () => <AdminLoading full />,
  pendingMs: 0,
  errorComponent: () => (
    <AdminState full icon="alert" title="Something went wrong" body="We couldn't load the admin area. Please refresh, or sign in again.">
      <Link to="/admin/login" className={adminBtn}>Go to sign in</Link>
    </AdminState>
  ),
  notFoundComponent: () => (
    <AdminState icon="alert" title="Page not found" body="This admin page doesn't exist.">
      <Link to="/admin" className={adminBtn}>Back to dashboard</Link>
    </AdminState>
  ),
  component: AdminLayout,
});

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  const [open, setOpen] = useDrawer();
  const signOut = useSignOut();

  if (admin.status !== "ok") {
    const copy = {
      forbidden: { title: "Access denied", body: "This account doesn't have access to the ÉLAN admin." },
      "no-profile": { title: "Account not set up", body: "Your account profile isn't available. Please contact an administrator." },
      error: { title: "We couldn't verify your access", body: "Please try again in a moment." },
    }[admin.status];
    return (
      <AdminState full title={copy.title} body={copy.body}>
        <button onClick={signOut} className={adminBtn}>Sign out</button>
        <Link to="/" className={adminBtnGhost}>View site</Link>
      </AdminState>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40 font-sans">
      <AdminSidebar user={admin} open={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 lg:pl-60">
        <AdminHeader user={admin} onMenu={() => setOpen(true)} />
        <main className="min-w-0 p-4 sm:p-6 lg:p-8"><Outlet /></main>
        <Toaster position="bottom-right" />
      </div>
    </div>
  );
}
