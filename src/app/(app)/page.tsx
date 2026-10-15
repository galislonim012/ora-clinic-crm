import Link from "next/link";
import { CalendarCheck2, CalendarClock, Inbox, MessageCircle, PartyPopper, RefreshCcw, Sparkles } from "lucide-react";
import { getSession, firstName } from "@/lib/session";
import { loadAppointments, loadCalls, loadTypes } from "@/lib/queries";
import { addDays, elapsed, formatDateLong, formatDay, israelDate, israelDayRange, minutesSince, nextBusinessDay, whatsappLink } from "@/lib/format";
import { AppointmentItem } from "@/components/appointments";
import { CallDialogButton } from "@/components/calls";
import { Badge, ButtonLink, EmptyState, Panel, cn } from "@/components/ui";

export const metadata = { title: "ראשי" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "בוקר טוב" : h < 17 ? "צהריים טובים" : "ערב טוב";
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const { supabase, me, staff, isAdmin, viewAs } = await getSession();
  const focusId = isAdmin ? (viewAs === "all" ? undefined : viewAs) : scope === "all" ? undefined : me.id;
  const focusName = focusId ? staff.find((s) => s.id === focusId)?.full_name : undefined;

  const today = israelDate();
  const tomorrow = nextBusinessDay(today);
  const todayRange = israelDayRange(today);
  const tomorrowRange = israelDayRange(tomorrow);

  const [types, todayAppts, tomorrowAppts, overdueAppts, calls, renewalRows] = await Promise.all([
    loadTypes(),
    loadAppointments({ from: todayRange.start, to: todayRange.end, staffId: focusId, status: ["future", "done"] }),
    loadAppointments({ from: tomorrowRange.start, to: tomorrowRange.end, staffId: focusId, status: ["future"] }),
    loadAppointments({ to: new Date().toISOString(), staffId: focusId, status: ["future"], from: israelDayRange(addDays(today, -60)).start }),
    loadCalls({ open: true }),
    supabase
      .from("appointments")
      .select("client_id, treatment_type_id, staff_id, starts_at, status, clients(full_name, phone), treatment_types(name, renewal_days)")
      .in("status", ["done", "future"])
      .gte("starts_at", new Date(Date.now() - 400 * 864e5).toISOString()),
  ]);

  const focusCalls = focusId ? calls.filter((c) => c.view.assignee_id === focusId) : calls;
  const newCalls = focusCalls.filter((c) => c.view.status === "new");
  const inProgress = focusCalls.filter((c) => c.view.status === "in_progress");
  const unconfirmed = tomorrowAppts.filter((a) => a.view.confirmation !== "confirmed");
  const todayActive = todayAppts.filter((a) => !overdueAppts.some((o) => o.view.id === a.view.id));

  // הגיע זמן לחזור: הטיפול האחרון + זמן החידוש, בלי תור עתידי מאותו סוג
  type RenewalRow = {
    client_id: string;
    treatment_type_id: string;
    staff_id: string;
    starts_at: string;
    status: string;
    clients: { full_name: string; phone: string } | null;
    treatment_types: { name: string; renewal_days: number | null } | null;
  };
  const rows = ((renewalRows.data ?? []) as unknown as RenewalRow[]).filter((r) => r.treatment_types?.renewal_days);
  const lastDone = new Map<string, RenewalRow>();
  const hasFuture = new Set<string>();
  for (const r of rows) {
    const key = `${r.client_id}:${r.treatment_type_id}`;
    if (r.status === "future") hasFuture.add(key);
    else if (!lastDone.get(key) || lastDone.get(key)!.starts_at < r.starts_at) lastDone.set(key, r);
  }
  const horizon = addDays(today, 14);
  const renewals = [...lastDone.entries()]
    .filter(([key]) => !hasFuture.has(key))
    .map(([, r]) => ({ ...r, due: addDays(israelDate(r.starts_at), r.treatment_types!.renewal_days!) }))
    .filter((r) => r.due <= horizon && (!focusId || r.staff_id === focusId))
    .sort((a, b) => a.due.localeCompare(b.due));

  // פניות פתוחות לפי אחראית
  const byAssignee = staff
    .filter((s) => s.is_active && (!focusId || s.id === focusId))
    .map((s) => {
      const mine = calls.filter((c) => c.view.assignee_id === s.id);
      const news = mine.filter((c) => c.view.status === "new");
      const oldest = news.reduce<string | null>((acc, c) => (!acc || c.view.created_at < acc ? c.view.created_at : acc), null);
      return { s, news: news.length, progress: mine.length - news.length, oldest };
    });

  const kpis = [
    { label: "פניות חדשות", value: newCalls.length, href: "/calls?status=new", tone: newCalls.length ? "text-st-orange" : "text-ink" },
    { label: "בטיפול", value: inProgress.length, href: "/calls", tone: "text-ink" },
    { label: "תורים היום", value: todayAppts.length, href: "/appointments", tone: "text-ink" },
    { label: `${formatDay(tomorrow, { day: undefined, month: undefined })}, לא אושרו`, value: unconfirmed.length, href: `/appointments?date=${tomorrow}`, tone: unconfirmed.length ? "text-st-purple" : "text-ink" },
  ];

  return (
    <div className="animate-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em]">
            {greeting()}, {firstName(me.full_name)}
          </h1>
          <p className="mt-1 text-ink-2">
            {formatDateLong(new Date())}
            {focusName && !isAdmin && " · מציג את שלך"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isAdmin && (
            <div className="flex rounded-lg border border-line-strong bg-surface p-0.5 text-[14px]">
              <Link href="/" className={cn("rounded-md px-3 py-1.5 transition", focusId ? "bg-sage text-white" : "text-ink-2 hover:text-ink")}>
                שלי
              </Link>
              <Link href="/?scope=all" className={cn("rounded-md px-3 py-1.5 transition", !focusId ? "bg-sage text-white" : "text-ink-2 hover:text-ink")}>
                כל הצוות
              </Link>
            </div>
          )}
          <CallDialogButton staff={staff} />
        </div>
      </div>

      <div data-tour="dashboard-kpis" className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:grid-cols-4">
        {kpis.map((k, i) => (
          <Link
            key={k.label}
            href={k.href}
            className={cn(
              "group px-5 py-4 transition-colors hover:bg-sage-soft/40",
              i % 2 === 1 && "border-s border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-s",
            )}
          >
            <p className="text-[13.5px] text-ink-2">{k.label}</p>
            <p className={cn("mt-0.5 text-[30px] font-bold leading-tight tabular-nums", k.tone)}>{k.value}</p>
          </Link>
        ))}
      </div>

      {overdueAppts.length > 0 && (
        <Panel
          className="mb-5 border-st-orange/30"
          title={
            <span className="flex items-center gap-2">
              <CalendarClock size={18} className="text-st-orange" /> לעדכון: תורים שעברו ועדיין מסומנים ״עתידי״
            </span>
          }
          bodyClass="py-1 divide-y divide-line"
        >
          {overdueAppts.map(({ view, canEdit }) => (
            <AppointmentItem key={view.id} a={view} canEdit={canEdit} types={types} staff={staff} showDate />
          ))}
        </Panel>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Panel tour="dashboard-calls" title="פניות פתוחות לפי אחראית" action={<Link href="/calls" className="text-[13.5px] font-medium text-sage hover:underline">לכל הקריאות</Link>} bodyClass="p-0">
          {byAssignee.every((r) => r.news + r.progress === 0) ? (
            <EmptyState compact icon={PartyPopper} title="אין פניות פתוחות" text="כל הפניות טופלו. כשתיכנס פנייה חדשה היא תופיע כאן." />
          ) : (
            <table className="w-full text-[14.5px]">
              <thead>
                <tr className="text-[12.5px] text-ink-2">
                  <th className="px-5 py-2.5 text-start font-medium">אחראית</th>
                  <th className="px-2 py-2.5 text-start font-medium">חדשות</th>
                  <th className="px-2 py-2.5 text-start font-medium">בטיפול</th>
                  <th className="px-5 py-2.5 text-start font-medium">הוותיקה מחכה</th>
                </tr>
              </thead>
              <tbody>
                {byAssignee.map(({ s, news, progress, oldest }) => {
                  const mins = oldest ? minutesSince(oldest) : 0;
                  return (
                    <tr key={s.id} className="border-t border-line transition-colors hover:bg-canvas">
                      <td className="px-5 py-3">
                        <Link href={`/calls?assignee=${s.id}`} className="font-medium hover:text-sage">
                          {s.full_name}
                        </Link>
                      </td>
                      <td className={cn("px-2 py-3 font-semibold tabular-nums", news ? "text-st-orange" : "text-ink-3")}>{news}</td>
                      <td className="px-2 py-3 tabular-nums text-ink-2">{progress}</td>
                      <td className="px-5 py-3">
                        {oldest ? <Badge tone={mins <= 30 ? "green" : mins <= 60 ? "orange" : "red"}>{elapsed(oldest)}</Badge> : <span className="text-ink-3">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel
          tour="dashboard-unconfirmed"
          title={`${formatDay(tomorrow, { day: undefined, month: undefined })} · תורים שלא אושרו`}
          action={<Badge tone="purple">{unconfirmed.length}</Badge>}
          bodyClass="py-1 divide-y divide-line"
        >
          {unconfirmed.length === 0 ? (
            <EmptyState compact icon={CalendarCheck2} title="כל התורים אושרו" text="אין תורים ביום העבודה הבא שמחכים לאישור הגעה." />
          ) : (
            unconfirmed.map(({ view, canEdit }) => <AppointmentItem key={view.id} a={view} canEdit={canEdit} types={types} staff={staff} />)
          )}
        </Panel>

        <Panel title="תורי היום" action={<Link href="/appointments" className="text-[13.5px] font-medium text-sage hover:underline">ליומן</Link>} bodyClass="py-1 divide-y divide-line">
          {todayActive.length === 0 ? (
            <EmptyState compact icon={Inbox} title="אין עוד תורים היום" text="אפשר לקבוע תור מתוך כרטיס לקוחה או מהיומן." action={<ButtonLink href="/appointments" size="sm">ליומן</ButtonLink>} />
          ) : (
            todayActive.map(({ view, canEdit }) => <AppointmentItem key={view.id} a={view} canEdit={canEdit} types={types} staff={staff} />)
          )}
        </Panel>

        <Panel
          tour="dashboard-renewals"
          title={
            <span className="flex items-center gap-2">
              <RefreshCcw size={17} className="text-nude-ink" /> הגיע זמן לחזור
            </span>
          }
          action={<Badge tone="sage">{renewals.length}</Badge>}
          bodyClass="py-1 divide-y divide-line"
        >
          {renewals.length === 0 ? (
            <EmptyState compact icon={Sparkles} title="אין חידושים בשבועיים הקרובים" text="לקוחות שהגיע זמן החידוש שלהן (בוטוקס, מילוי) יופיעו כאן." />
          ) : (
            renewals.map((r) => {
              const late = r.due < today;
              const first = r.clients?.full_name.split(" ")[0];
              const text = `היי ${first}, עברו כמה חודשים מה${r.treatment_types?.name.split(" ")[0]} האחרון שלך בקליניקת אורה 💛 רוצה שנקבע תור לחידוש?`;
              return (
                <div key={`${r.client_id}${r.treatment_type_id}`} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/clients/${r.client_id}`} className="font-semibold hover:text-sage hover:underline underline-offset-4">
                      {r.clients?.full_name}
                    </Link>
                    <p className="text-[13px] text-ink-2">
                      {r.treatment_types?.name} · טיפול אחרון {formatDay(r.starts_at)} ·{" "}
                      <span className={late ? "font-medium text-st-red" : ""}>{late ? `חידוש עבר ב-${formatDay(r.due)}` : `חידוש ב-${formatDay(r.due)}`}</span>
                    </p>
                  </div>
                  <a href={whatsappLink(r.clients?.phone ?? "", text)} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13.5px] font-medium transition hover:-translate-y-px hover:border-sage/50 hover:bg-sage-soft/40 active:scale-[0.97]">
                    <MessageCircle size={15} /> וואטסאפ
                  </a>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}
