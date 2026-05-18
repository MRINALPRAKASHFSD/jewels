import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLoading, AdminPageHeader, AdminState, Panel, StatusBadge, adminBtn, adminBtnGhost } from "@/components/admin/AdminUI";
import { ENQUIRY_STATUSES, enquiryDetail, formatDate, SOURCE_LABEL, updateEnquiryStatus, type EnquiryStatus } from "@/lib/admin/data";
import { RequireAccess, useAdminUser } from "@/lib/admin/use-admin";
import { can } from "@/lib/admin/permissions";
import { useState } from "react";
import { addEnquiryNote, enquiryTimeline } from "@/lib/admin/cms";
import { inputCls } from "@/components/admin/cms-ui";

export const Route = createFileRoute("/admin/enquiries/$id")({
  head: () => ({ meta: [{ title: "Enquiry — Élan Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <RequireAccess resource="enquiries"><EnquiryView /></RequireAccess>,
});

function EnquiryView() {
  const { id } = Route.useParams();
  const user = useAdminUser();
  const qc = useQueryClient();
  const { data: e, isLoading, isError } = useQuery(enquiryDetail(id));
  const mutation = useMutation({
    mutationFn: (status: EnquiryStatus) => updateEnquiryStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
  const timeline = useQuery({ queryKey: ["admin", "enquiry-timeline", id], queryFn: () => enquiryTimeline(id) });
  const [note, setNote] = useState("");
  const addNote = useMutation({
    mutationFn: () => addEnquiryNote(id, note, user.email),
    onSuccess: () => { setNote(""); qc.invalidateQueries({ queryKey: ["admin", "enquiry-timeline", id] }); },
  });

  if (isLoading) return <AdminLoading />;
  if (isError) return <AdminState icon="alert" title="Couldn't load this enquiry" body="Please refresh the page to try again." />;
  if (!e) return <AdminState icon="alert" title="Enquiry not found" body="It may have been removed."><Link to="/admin/enquiries" className={adminBtn}>All enquiries</Link></AdminState>;

  const rows: [string, React.ReactNode][] = [
    ["Email", e.email ? <a href={`mailto:${e.email}`} className="underline">{e.email}</a> : "—"],
    ["Phone", e.phone ? <a href={`tel:${e.phone}`} className="underline">{e.phone}</a> : "—"],
    ["Product", e.product ? <Link to="/jewellery/$slug" params={{ slug: e.product.slug }} className="underline">{e.product.name}</Link> : "—"],
    ["Source", SOURCE_LABEL[e.source] ?? e.source],
    ["Received", formatDate(e.createdAt)],
    ["Updated", formatDate(e.updatedAt)],
  ];
  return (
    <div className="space-y-6">
      <AdminPageHeader title={e.name} description="Enquiry details" actions={<Link to="/admin/enquiries" className={adminBtnGhost}>Back</Link>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Panel title="Details" action={<StatusBadge status={e.status} />}>
          <dl className="divide-y divide-border">
            {rows.map(([k, v]) => <div key={k} className="grid grid-cols-3 gap-4 px-5 py-2.5 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="col-span-2 break-words">{v}</dd></div>)}
          </dl>
          <div className="border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">Message</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{e.message || "—"}</p>
          </div>
        </Panel>
        <div className="space-y-6">
        {can(user.role, "enquiries", "update") && (
          <Panel title="Status">
            <div className="space-y-3 p-5">
              <select aria-label="Enquiry status" value={e.status} disabled={mutation.isPending}
                onChange={(ev) => mutation.mutate(ev.target.value as EnquiryStatus)}
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm capitalize">
                {ENQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {mutation.isError && <p role="alert" className="text-xs text-destructive">{(mutation.error as Error).message}</p>}
              {mutation.isSuccess && <p role="status" className="text-xs text-muted-foreground">Status saved.</p>}
            </div>
          </Panel>
        )}
        <Panel title="Activity">
          <ul className="divide-y divide-border text-xs">
            {(timeline.data?.activity ?? []).map((a) => (
              <li key={a.id} className="px-5 py-2.5"><span className="capitalize">{a.details?.previous_status} → {a.details?.status}</span><span className="block text-muted-foreground">{a.actor_email ?? "Staff"} · {new Date(a.created_at).toLocaleString("en-IN")}</span></li>
            ))}
            {!timeline.data?.activity.length && <li className="px-5 py-3 text-muted-foreground">No status changes yet.</li>}
          </ul>
        </Panel>
        </div>
      </div>
      <Panel title="Internal notes" action={<span className="text-xs text-muted-foreground">Only visible to staff</span>}>
        {can(user.role, "enquiries", "update") && (
          <form className="space-y-2 border-b border-border p-5" onSubmit={(ev) => { ev.preventDefault(); if (note.trim()) addNote.mutate(); }}>
            <textarea aria-label="New note" rows={3} maxLength={2000} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Add a note for the team…" className={inputCls} />
            <div className="flex items-center justify-end gap-3">
              {addNote.isError && <p role="alert" className="text-xs text-destructive">{(addNote.error as Error).message}</p>}
              <button className={adminBtn} disabled={!note.trim() || addNote.isPending}>{addNote.isPending ? "Saving…" : "Add note"}</button>
            </div>
          </form>
        )}
        <ul className="divide-y divide-border">
          {(timeline.data?.notes ?? []).map((n) => (
            <li key={n.id} className="px-5 py-3"><p className="whitespace-pre-wrap text-sm">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{n.author_email ?? "Staff"} · {new Date(n.created_at).toLocaleString("en-IN")}</p></li>
          ))}
          {!timeline.data?.notes.length && <li className="px-5 py-4 text-sm text-muted-foreground">No notes yet.</li>}
        </ul>
      </Panel>
    </div>
  );
}
