import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, Bell, BookOpen, FileText, Gem, Image, Inbox, Layers, LayoutDashboard, Loader2, Lock, LogOut, Menu, Settings, ShieldAlert, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { can, ROLE_LABEL, type AdminRole, type Resource } from "@/lib/admin/permissions";

export type AdminUser = { userId: string; email: string; name: string; role: AdminRole };

type NavItem = { label: string; to: string; search?: Record<string, string>; icon?: typeof Gem; resource?: Resource; exact?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  { items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true }] },
  { label: "Catalogue", items: [
    { label: "Products", to: "/admin/products", icon: Gem, resource: "products" },
    { label: "Collections", to: "/admin/collections", icon: Layers, resource: "collections" },
  ] },
  { label: "Media", items: [
    { label: "Media library", to: "/admin/media", icon: Image, resource: "media" },
    { label: "Lookbook", to: "/admin/lookbook", icon: BookOpen, resource: "lookbook" },
  ] },
  { label: "Customer", items: [{ label: "Enquiries", to: "/admin/enquiries", icon: Inbox, resource: "enquiries" }] },
  { label: "Content", items: [{ label: "Homepage", to: "/admin/content", icon: FileText, resource: "content" }] },
  { items: [
    { label: "Analytics", to: "/admin/analytics", icon: BarChart3, resource: "analytics" },
    { label: "Settings", to: "/admin/settings", icon: Settings, resource: "settings" },
  ] },
];

const TITLES: [string, string][] = [
  ["/admin/products", "Products"], ["/admin/collections", "Collections"], ["/admin/media", "Media library"],
  ["/admin/lookbook", "Lookbook"], ["/admin/enquiries", "Enquiries"], ["/admin/content", "Content"],
  ["/admin/analytics", "Analytics"], ["/admin/settings", "Settings"], ["/admin/profile", "Profile"],
];
function titleFor(path: string) { return TITLES.find(([p]) => path.startsWith(p))?.[1] ?? "Dashboard"; }

function initials(name: string) { return name.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join(""); }

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };
}

export function AdminSidebar({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const location = useRouterState({ select: (s) => s.location });
  const signOut = useSignOut();

  const isActive = (it: NavItem) => {
    if (it.exact) return location.pathname === it.to || location.pathname === `${it.to}/`;
    if (!location.pathname.startsWith(it.to)) return false;
    return true;
  };
  const visible = (it: NavItem) => {
    if (!it.resource) return true;
    if (it.resource === "settings") return can(user.role, "settings", "update");
    return can(user.role, it.resource, "read");
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={onClose} aria-hidden />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/admin" onClick={onClose} className="text-sm font-semibold tracking-[0.2em]">ÉLAN <span className="font-normal text-muted-foreground">ADMIN</span></Link>
          <button className="lg:hidden" onClick={onClose} aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Admin">
          {NAV.map((g, gi) => {
            const items = g.items.filter(visible);
            if (!items.length) return null;
            return (
              <div key={gi}>
                {g.label && <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</p>}
                <div className="space-y-0.5">
                  {items.map((it) => {
                    const active = isActive(it);
                    const Icon = it.icon;
                    return (
                      <Link key={it.label} to={it.to} search={it.search as never} onClick={onClose} aria-current={active ? "page" : undefined}
                        className={cn("flex items-center gap-3 rounded-sm px-3 py-1.5 text-[13px] transition-colors", active ? "bg-sidebar-accent font-medium text-sidebar-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                        {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
                        <span className="flex-1">{it.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-3 border-t border-sidebar-border p-4">
          <Link to="/admin/profile" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">{initials(user.name)}</span>
            <span className="min-w-0"><span className="block truncate text-[13px] font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</span></span>
          </Link>
          <button onClick={signOut} aria-label="Sign out" title="Sign out" className="text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" strokeWidth={1.5} /></button>
        </div>
      </aside>
    </>
  );
}

export function AdminHeader({ user, onMenu }: { user: AdminUser; onMenu: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <button className="lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu className="h-5 w-5" strokeWidth={1.5} /></button>
      <p className="truncate text-sm font-semibold">{titleFor(path)}</p>
      <div className="ml-auto flex items-center gap-4">
        <Link to="/" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">View site ↗</Link>
        <button aria-label="Notifications" title="Notifications (coming soon)" className="text-muted-foreground hover:text-foreground"><Bell className="h-4 w-4" strokeWidth={1.5} /></button>
        <Link to="/admin/profile" aria-label="Your profile" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] font-medium">{initials(user.name)}</Link>
      </div>
    </header>
  );
}

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const badge: Record<string, string> = {
  new: "bg-champagne/25 text-foreground", contacted: "bg-warning/15 text-foreground", interested: "bg-warning/25 text-foreground",
  converted: "bg-success/15 text-success", closed: "bg-muted text-muted-foreground",
  published: "bg-success/15 text-success", draft: "bg-muted text-muted-foreground", archived: "bg-destructive/10 text-destructive",
  active: "bg-success/15 text-success", hidden: "bg-muted text-muted-foreground",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium capitalize", badge[status] ?? "bg-muted text-muted-foreground")}>{status.replace(/[-_]/g, " ")}</span>;
}

export type Column<T> = { header: string; cell: (r: T) => ReactNode; className?: string };
export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty = "Nothing here yet." }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; empty?: string }) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">{columns.map((c) => <th key={c.header} className={cn("px-5 py-2.5 font-medium", c.className)}>{c.header}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
            className={cn("border-b border-border last:border-0 hover:bg-secondary/50", onRowClick && "cursor-pointer")}>
            {columns.map((c) => <td key={c.header} className={cn("whitespace-nowrap px-5 py-3", c.className)}>{c.cell(r)}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-sm border border-border bg-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export const adminBtn = "inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50";
export const adminBtnGhost = "inline-flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary";
export const adminLink = "text-xs text-muted-foreground hover:text-foreground";

/* ---------- States ---------- */
export function AdminLoading({ full }: { full?: boolean }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground", full ? "min-h-screen bg-secondary/40" : "py-16")}>
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

export function AdminState({ icon = "lock", title, body, children, full }: { icon?: "lock" | "alert"; title: string; body: string; children?: ReactNode; full?: boolean }) {
  const Icon = icon === "lock" ? Lock : ShieldAlert;
  return (
    <div className={cn("flex items-center justify-center p-6", full ? "min-h-screen bg-secondary/40 font-sans" : "py-16")}>
      <div className="max-w-sm text-center">
        <Icon className="mx-auto h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="mt-3 text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        {children && <div className="mt-5 flex justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function AccessRestricted() {
  return <AdminState title="Access restricted." body="Your role doesn't include access to this area. Ask an administrator if you need it." />;
}

export function ComingNext({ title, body }: { title: string; body: string }) {
  return (
    <Panel title={title}>
      <p className="px-5 py-10 text-center text-sm text-muted-foreground">{body}</p>
    </Panel>
  );
}

export function useDrawer() { return useState(false); }
