import Link from "next/link";
import { Inbox, PartyPopper } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadCalls } from "@/lib/queries";
import { callStatusLabel, callTone } from "@/lib/labels";
import type { CallStatus } from "@/lib/types";
import { CallCard, CallDialogButton } from "@/components/calls";
import { Badge, EmptyState, PageHeader, cn } from "@/components/ui";

export const metadata = { title: "קריאות שירות" };

const STATUSES: CallStatus[] = ["new", "in_progress", "closed"];

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ scope?: string; assignee?: string; view?: string; status?: string }> }) {
  const sp = await searchParams;
  const { me, staff, isAdmin, viewAs } = await getSession();
  const view = sp.view === "list" ? "list" : "board";
  const assignee = sp.assignee ?? (isAdmin ? (viewAs !== "all" ? viewAs : undefined) : sp.scope === "all" ? undefined : me.id);
  const statusFilter = STATUSES.includes(sp.status as CallStatus) ? (sp.status as CallStatus) : undefined;

  const all = await loadCalls({ assigneeId: assignee });
  const calls = all.filter((c) => !statusFilter || c.view.status === statusFilter);
  // חדשות: הוותיקה למעלה. סגורות: האחרונה למעלה.
  const byStatus = (s: CallStatus) => {
    const list = calls.filter((c) => c.view.status === s);
    return s === "closed" ? list.reverse().slice(0, 12) : list;
  };

  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    Object.entries({ view: sp.view, scope: sp.scope, assignee: sp.assignee, status: sp.status, ...p }).forEach(([k, v]) => v && q.set(k, v));
    return `/calls?${q.toString()}`;
  };
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-[14px] transition", active ? "border-sage bg-sage-soft text-sage-ink" : "border-line-strong text-ink-2 hover:text-ink");

  return (
    <div className="animate-rise">
      <PageHeader
        title="קריאות שירות"
        sub={assignee ? `האחראית: ${staff.find((s) => s.id === assignee)?.full_name}` : "כל הקריאות של הצוות"}
        actions={<CallDialogButton staff={staff} />}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {!isAdmin && (
          <>
            <Link href={link({ scope: undefined, assignee: undefined })} className={chip(assignee === me.id)}>
              שלי
            </Link>
            <Link href={link({ scope: "all", assignee: undefined })} className={chip(!assignee)}>
              כולן
            </Link>
          </>
        )}
        {isAdmin && (
          <>
            <Link href={link({ assignee: undefined })} className={chip(!sp.assignee && viewAs === "all")}>
              כל הצוות
            </Link>
            {staff
              .filter((s) => s.is_active)
              .map((s) => (
                <Link key={s.id} href={link({ assignee: s.id })} className={chip(assignee === s.id)}>
                  {s.full_name.split(" ")[0]}
                </Link>
              ))}
          </>
        )}
        <div className="ms-auto flex rounded-lg border border-line-strong bg-surface p-0.5 text-[14px]">
          {(["board", "list"] as const).map((v) => (
            <Link key={v} href={link({ view: v === "board" ? undefined : v })} className={cn("rounded-md px-3 py-1 transition", view === v ? "bg-sage text-white" : "text-ink-2 hover:text-ink")}>
              {v === "board" ? "לוח" : "רשימה"}
            </Link>
          ))}
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState icon={PartyPopper} title="אין קריאות כאן" text="כשתיפתח קריאה חדשה היא תופיע כאן, עם שעון שמראה כמה זמן היא מחכה." action={<CallDialogButton staff={staff} variant="secondary" />} />
        </div>
      ) : view === "board" ? (
        <div data-tour="calls-board" className="grid gap-4 lg:grid-cols-3">
          {STATUSES.filter((s) => !statusFilter || s === statusFilter).map((s) => {
            const list = byStatus(s);
            return (
              <section key={s} className="rounded-2xl bg-panel/70 p-3">
                <header className="mb-3 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Badge tone={callTone[s]}>{callStatusLabel[s]}</Badge>
                  </h2>
                  <span className="text-[13px] text-ink-2">{calls.filter((c) => c.view.status === s).length}</span>
                </header>
                <div className="space-y-3">
                  {list.length === 0 ? (
                    <EmptyState compact icon={Inbox} title={s === "new" ? "אין קריאות חדשות" : s === "in_progress" ? "אין קריאות בטיפול" : "עוד לא נסגרו קריאות"} />
                  ) : (
                    list.map(({ view, canEdit }) => <CallCard key={view.id} call={view} canEdit={canEdit} canReassign={canEdit} staff={staff} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div data-tour="calls-board" className="space-y-3">
          {[...calls]
            .sort((a, b) => STATUSES.indexOf(a.view.status) - STATUSES.indexOf(b.view.status) || a.view.created_at.localeCompare(b.view.created_at))
            .map(({ view, canEdit }) => (
              <div key={view.id} className="grid gap-2 md:grid-cols-[110px_1fr] md:items-start">
                <Badge tone={callTone[view.status]} className="w-fit md:mt-4">
                  {callStatusLabel[view.status]}
                </Badge>
                <CallCard call={view} canEdit={canEdit} canReassign={canEdit} staff={staff} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
