import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarRange, ChevronRight, FileWarning, Layers, MessageCircle, MessagesSquare, Phone, ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadAppointments, loadCalls, loadTypes } from "@/lib/queries";
import { addDays, formatDateShort, formatDay, formatPhone, israelDate, israelTime, whatsappLink } from "@/lib/format";
import { conditionLabel, sourceLabel } from "@/lib/labels";
import type { Client, MedicalProfile, TreatmentPackage } from "@/lib/types";
import { AppointmentDialogButton, AppointmentItem } from "@/components/appointments";
import { CallCard, CallDialogButton } from "@/components/calls";
import { DeleteClientButton, EditClientButton, MedicalForm, NewPackageButton } from "@/components/client-card-parts";
import { Badge, EmptyState, Panel, buttonClass, cn } from "@/components/ui";

const TABS = [
  { id: "overview", label: "סקירה" },
  { id: "appointments", label: "תורים" },
  { id: "calls", label: "קריאות" },
  { id: "medical", label: "רפואי" },
  { id: "packages", label: "סדרות" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getSession();
  const { data } = await supabase.from("clients").select("full_name").eq("id", id).maybeSingle();
  return { title: data?.full_name ?? "כרטיס לקוחה" };
}

export default async function ClientCard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const { supabase, staff, isAdmin, isClinician } = await getSession();

  const { data: clientRow } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!clientRow) notFound();
  const client = clientRow as Client;

  const [types, appts, calls, { data: med }, { data: pkgs }] = await Promise.all([
    loadTypes(),
    loadAppointments({ clientId: id, order: "desc" }),
    loadCalls({ clientId: id }),
    isClinician ? supabase.from("medical_profiles").select("*").eq("client_id", id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("treatment_packages").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  const medical = med as MedicalProfile | null;
  const packages = (pkgs ?? []) as TreatmentPackage[];

  const tabs = TABS.filter((t) => t.id !== "medical" || isClinician);
  const tab = tabs.some((t) => t.id === rawTab) ? rawTab! : "overview";

  const now = new Date().toISOString();
  const future = appts.filter((a) => a.view.status === "future" && a.view.starts_at >= now).reverse();
  const history = appts.filter((a) => !(a.view.status === "future" && a.view.starts_at >= now));
  const next = future[0];
  const openCalls = calls.filter((c) => c.view.status !== "closed").reverse();
  const conditions = medical?.conditions ?? [];
  const declarationOld = medical?.declaration_signed_at ? medical.declaration_signed_at < addDays(israelDate(), -365) : isClinician;
  const picked = { id: client.id, full_name: client.full_name, phone: client.phone };
  const counts: Record<string, number> = { appointments: appts.length, calls: calls.length, packages: packages.length };

  return (
    <div className="animate-rise">
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink">
        <ChevronRight size={16} /> לקוחות
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.01em]">{client.full_name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14.5px] text-ink-2">
            <a href={`tel:${client.phone}`} className="ltr inline-flex items-center gap-1.5 hover:text-ink">
              <Phone size={14} /> {formatPhone(client.phone)}
            </a>
            {client.source && <span>מקור: {sourceLabel[client.source]}</span>}
            <span>לקוחה מ-{formatDateShort(client.created_at)}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {client.no_show_count >= 2 && <Badge tone="orange">הבריזה {client.no_show_count} פעמים</Badge>}
            {packages.some((p) => p.status === "active") && <Badge tone="sage">סדרה פעילה</Badge>}
            {isClinician && declarationOld && (
              <Badge tone="purple">
                <FileWarning size={12} /> {medical?.declaration_signed_at ? "לחדש הצהרת בריאות" : "חסרה הצהרת בריאות"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2" data-tour="client-actions">
          <AppointmentDialogButton types={types} staff={staff} client={picked} label="תור" />
          <CallDialogButton staff={staff} client={picked} label="קריאה" variant="secondary" />
          <a href={whatsappLink(client.phone)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
            <MessageCircle size={16} /> וואטסאפ
          </a>
        </div>
      </div>

      {isClinician && conditions.length > 0 && (
        <div role="alert" data-tour="client-medical-alert" className="mb-5 flex items-start gap-3 rounded-xl border border-st-red/25 bg-st-red-soft px-4 py-3 text-st-red">
          <ShieldAlert size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">התראה רפואית: {conditions.map((c) => conditionLabel[c] ?? c).join(" · ")}</p>
            {(medical?.allergies || medical?.medications) && (
              <p className="mt-0.5 text-[14px]">{[medical?.allergies && `רגישויות: ${medical.allergies}`, medical?.medications && `תרופות: ${medical.medications}`].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </div>
      )}

      <nav data-tour="client-tabs" className="-mx-4 mb-5 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0" aria-label="לשוניות כרטיס">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/clients/${id}${t.id === "overview" ? "" : `?tab=${t.id}`}`}
              aria-current={tab === t.id ? "page" : undefined}
              scroll={false}
              className={cn(
                "relative whitespace-nowrap px-3.5 py-2.5 text-[14.5px] font-medium transition-colors",
                tab === t.id ? "text-sage-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-sage" : "text-ink-2 hover:text-ink",
              )}
            >
              {t.label}
              {counts[t.id] ? <span className="ms-1.5 text-[12.5px] text-ink-3">{counts[t.id]}</span> : null}
            </Link>
          ))}
        </div>
      </nav>

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <Panel title="התור הבא">
              {next ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[18px] font-semibold">
                      {formatDay(next.view.starts_at, { weekday: "long" })} · <span className="ltr">{israelTime(next.view.starts_at)}</span>
                    </p>
                    <p className="text-ink-2">
                      {next.view.type_name} אצל {next.view.staff_name}
                    </p>
                  </div>
                  <Link href={`/clients/${id}?tab=appointments`} className="text-[14px] font-medium text-sage hover:underline">
                    לכל התורים
                  </Link>
                </div>
              ) : (
                <EmptyState compact icon={CalendarRange} title="אין תור עתידי" text="כדאי לקבוע את התור הבא עוד לפני שהלקוחה יוצאת." action={<AppointmentDialogButton types={types} staff={staff} client={picked} size="sm" />} />
              )}
            </Panel>
            <Panel title="טיפולים אחרונים" bodyClass="py-1 divide-y divide-line">
              {history.length === 0 ? (
                <EmptyState compact icon={CalendarRange} title="עוד אין היסטוריה" />
              ) : (
                history.slice(0, 4).map(({ view, canEdit }) => <AppointmentItem key={view.id} a={view} canEdit={canEdit} types={types} staff={staff} showDate showClient={false} />)
              )}
            </Panel>
          </div>
          <div className="space-y-5">
            {packages.filter((p) => p.status === "active").map((p) => <PackageCard key={p.id} p={p} typeName={types.find((t) => t.id === p.treatment_type_id)?.name} />)}
            <Panel title="קריאות פתוחות" action={<Badge tone={openCalls.length ? "orange" : "gray"}>{openCalls.length}</Badge>} bodyClass="space-y-3">
              {openCalls.length === 0 ? (
                <EmptyState compact icon={MessagesSquare} title="אין קריאות פתוחות" />
              ) : (
                openCalls.map(({ view, canEdit }) => <CallCard key={view.id} call={view} canEdit={canEdit} canReassign={canEdit} staff={staff} showClient={false} compact />)
              )}
            </Panel>
            {client.notes && (
              <Panel title="הערות">
                <p className="whitespace-pre-line text-ink-2">{client.notes}</p>
              </Panel>
            )}
            <div className="flex flex-wrap gap-2">
              <EditClientButton client={client} />
              {isAdmin && <DeleteClientButton client={client} />}
            </div>
          </div>
        </div>
      )}

      {tab === "appointments" && (
        <div className="space-y-5">
          <Panel title="תורים עתידיים" action={<AppointmentDialogButton types={types} staff={staff} client={picked} size="sm" label="תור חדש" />} bodyClass="py-1 divide-y divide-line">
            {future.length === 0 ? (
              <EmptyState compact icon={CalendarRange} title="אין תורים עתידיים" />
            ) : (
              future.map(({ view, canEdit }) => <AppointmentItem key={view.id} a={view} canEdit={canEdit} types={types} staff={staff} showDate showClient={false} />)
            )}
          </Panel>
          <Panel title="היסטוריית תורים" bodyClass="py-1 divide-y divide-line">
            {history.length === 0 ? (
              <EmptyState compact icon={CalendarRange} title="עוד אין היסטוריה" text="תורים שבוצעו או בוטלו יופיעו כאן, מהחדש לישן." />
            ) : (
              history.map(({ view, canEdit }) => <AppointmentItem key={view.id} a={view} canEdit={canEdit} types={types} staff={staff} showDate showClient={false} />)
            )}
          </Panel>
        </div>
      )}

      {tab === "calls" && (
        <Panel title="קריאות שירות" action={<CallDialogButton staff={staff} client={picked} size="sm" label="קריאה חדשה" />} bodyClass="grid gap-3 md:grid-cols-2">
          {calls.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState compact icon={MessagesSquare} title="אין קריאות ללקוחה הזו" />
            </div>
          ) : (
            [...calls].reverse().map(({ view, canEdit }) => <CallCard key={view.id} call={view} canEdit={canEdit} canReassign={canEdit} staff={staff} showClient={false} compact />)
          )}
        </Panel>
      )}

      {tab === "medical" && isClinician && (
        <Panel
          title={
            <span className="flex items-center gap-2">
              <AlertTriangle size={17} className="text-st-red" /> כרטיס רפואי
            </span>
          }
          action={<span className="text-[12.5px] text-ink-2">גלוי למטפלות ולמנהלת בלבד · כל שינוי מתועד</span>}
        >
          <MedicalForm clientId={id} profile={medical} />
        </Panel>
      )}

      {tab === "packages" && (
        <Panel title="סדרות טיפולים" action={isClinician ? <NewPackageButton clientId={id} types={types} /> : undefined} bodyClass="grid gap-3 md:grid-cols-2">
          {packages.length === 0 ? (
            <div className="md:col-span-2">
              <EmptyState compact icon={Layers} title="אין סדרות" text="לקוחה שרוכשת סדרה (למשל 6 טיפולי לייזר) תקבל כאן מעקב: כמה נוצלו וכמה נשארו." />
            </div>
          ) : (
            packages.map((p) => <PackageCard key={p.id} p={p} typeName={types.find((t) => t.id === p.treatment_type_id)?.name} />)
          )}
        </Panel>
      )}
    </div>
  );
}

function PackageCard({ p, typeName }: { p: TreatmentPackage; typeName?: string }) {
  const pct = Math.min(100, Math.round((p.used_sessions / p.total_sessions) * 100));
  const left = p.total_sessions - p.used_sessions;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">סדרה · {typeName}</p>
        {p.status === "completed" ? <Badge tone="green">הושלמה</Badge> : left <= 2 ? <Badge tone="orange">נשארו {left}</Badge> : <Badge tone="sage">פעילה</Badge>}
      </div>
      <p className="mt-2 text-[22px] font-bold tabular-nums">
        {p.used_sessions} <span className="text-[15px] font-medium text-ink-2">מתוך {p.total_sessions} טיפולים</span>
      </p>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-panel" role="progressbar" aria-valuenow={p.used_sessions} aria-valuemin={0} aria-valuemax={p.total_sessions} aria-label="התקדמות הסדרה">
        <div className="h-full rounded-full bg-sage transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
