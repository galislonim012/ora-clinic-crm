import Link from "next/link";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { getSession } from "@/lib/session";
import { loadAppointments, loadTypes } from "@/lib/queries";
import { addDays, dayOfWeek, formatDateLong, formatDay, isValidDate, israelDate, israelDayRange, plural, startOfWeek } from "@/lib/format";
import { AppointmentDialogButton, AppointmentItem } from "@/components/appointments";
import { EmptyState, PageHeader, buttonClass, cn } from "@/components/ui";

export const metadata = { title: "תורים" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; staff?: string; cancelled?: string }>;
}) {
  const sp = await searchParams;
  const { staff, isAdmin, viewAs } = await getSession();
  const today = israelDate();
  const date = isValidDate(sp.date) ? sp.date : today;
  const view = sp.view === "week" ? "week" : "day";
  const staffFilter = sp.staff ?? (isAdmin && viewAs !== "all" ? viewAs : "");
  const showCancelled = sp.cancelled === "1";

  const from = view === "week" ? startOfWeek(date) : date;
  const days = view === "week" ? 6 : 1;
  const range = { start: israelDayRange(from).start, end: israelDayRange(addDays(from, days - 1)).end };

  const [types, appts] = await Promise.all([
    loadTypes(),
    loadAppointments({
      from: range.start,
      to: range.end,
      staffId: staffFilter || undefined,
      status: showCancelled ? undefined : ["future", "done"],
    }),
  ]);

  const therapists = staff.filter((s) => s.is_active && s.role !== "reception" && (!staffFilter || s.id === staffFilter));
  const step = view === "week" ? 7 : 1;
  const link = (p: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { date, view, staff: sp.staff, cancelled: sp.cancelled, ...p };
    Object.entries(merged).forEach(([k, v]) => v && q.set(k, v));
    return `/appointments?${q.toString()}`;
  };
  const prevDate = (() => {
    let d = addDays(date, -step);
    if (view === "day") while (dayOfWeek(d) === 6) d = addDays(d, -1);
    return d;
  })();
  const nextDate = (() => {
    let d = addDays(date, step);
    if (view === "day") while (dayOfWeek(d) === 6) d = addDays(d, 1);
    return d;
  })();

  return (
    <div className="animate-rise">
      <PageHeader
        title="תורים"
        sub={view === "day" ? formatDateLong(`${date}T12:00:00Z`) : `שבוע ${formatDay(`${from}T12:00:00Z`, { weekday: undefined })} עד ${formatDay(`${addDays(from, 5)}T12:00:00Z`, { weekday: undefined })}`}
        actions={<AppointmentDialogButton types={types} staff={staff} />}
      />

      <div data-tour="appointments-toolbar" className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Link href={link({ date: prevDate })} className={buttonClass("secondary", "sm")} aria-label="הקודם">
            <ChevronRight size={16} />
          </Link>
          <Link href={link({ date: today })} className={buttonClass(date === today ? "primary" : "secondary", "sm")}>
            היום
          </Link>
          <Link href={link({ date: nextDate })} className={buttonClass("secondary", "sm")} aria-label="הבא">
            <ChevronLeft size={16} />
          </Link>
        </div>
        <div className="flex rounded-lg border border-line-strong bg-surface p-0.5 text-[14px]">
          {(["day", "week"] as const).map((v) => (
            <Link key={v} href={link({ view: v })} className={cn("inline-flex min-h-10 items-center rounded-md px-3 transition md:min-h-7", view === v ? "bg-sage text-white" : "text-ink-2 hover:text-ink")}>
              {v === "day" ? "יום" : "שבוע"}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 text-[14px]">
          <Link href={link({ staff: undefined })} className={cn("inline-flex min-h-11 items-center rounded-full border px-3.5 transition md:min-h-8", !staffFilter ? "border-sage bg-sage-soft text-sage-ink" : "border-line-strong text-ink-2 hover:text-ink")}>
            כל המטפלות
          </Link>
          {staff
            .filter((s) => s.is_active && s.role !== "reception")
            .map((s) => (
              <Link key={s.id} href={link({ staff: s.id })} className={cn("inline-flex min-h-11 items-center rounded-full border px-3.5 transition md:min-h-8", staffFilter === s.id ? "border-sage bg-sage-soft text-sage-ink" : "border-line-strong text-ink-2 hover:text-ink")}>
                {s.full_name.split(" ")[0]}
              </Link>
            ))}
        </div>
        <Link href={link({ cancelled: showCancelled ? undefined : "1" })} className="ms-auto inline-flex min-h-11 items-center text-[13.5px] md:min-h-0 text-ink-2 underline-offset-4 hover:text-ink hover:underline">
          {showCancelled ? "הסתרת תורים שבוטלו" : "הצגת תורים שבוטלו"}
        </Link>
      </div>

      {view === "day" ? (
        dayOfWeek(date) === 6 ? (
          <div className="rounded-2xl border border-line bg-surface shadow-card">
            <EmptyState icon={CalendarX2} title="שבת: הקליניקה סגורה" action={<Link href={link({ date: nextDate })} className={buttonClass("secondary", "sm")}>ליום ראשון</Link>} />
          </div>
        ) : (
          <div className={cn("grid gap-4", therapists.length > 1 && "lg:grid-cols-3")}>
            {therapists.map((s) => {
              const mine = appts.filter((a) => a.view.staff_id === s.id);
              return (
                <section key={s.id} className="rounded-2xl border border-line bg-surface shadow-card">
                  <header className="flex items-center justify-between border-b border-line px-4 py-3">
                    <h2 className="font-semibold">{s.full_name}</h2>
                    <span className="text-[13px] text-ink-2">{plural(mine.length, "תור אחד", "תורים")}</span>
                  </header>
                  <div className="divide-y divide-line px-4">
                    {mine.length === 0 ? (
                      <EmptyState compact icon={CalendarX2} title="אין תורים" text="היום הזה פנוי." />
                    ) : (
                      mine.map(({ view: a, canEdit }) => <AppointmentItem key={a.id} a={a} canEdit={canEdit} types={types} staff={staff} />)
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => addDays(from, i)).map((d) => {
            const dayAppts = appts.filter((a) => israelDate(a.view.starts_at) === d);
            return (
              <section key={d} className={cn("rounded-2xl border bg-surface shadow-card", d === today ? "border-sage/50" : "border-line")}>
                <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <Link href={link({ date: d, view: "day" })} className="font-semibold hover:text-sage">
                    {formatDay(`${d}T12:00:00Z`, { weekday: "long" })}
                  </Link>
                  <span className="text-[13px] text-ink-2">{dayOfWeek(d) === 5 ? "09:00-13:00 · " : ""}{plural(dayAppts.length, "תור אחד", "תורים")}</span>
                </header>
                <div className="divide-y divide-line px-4">
                  {dayAppts.length === 0 ? (
                    <p className="py-5 text-center text-[14px] text-ink-3">אין תורים</p>
                  ) : (
                    dayAppts.map(({ view: a, canEdit }) => <AppointmentItem key={a.id} a={a} canEdit={canEdit} types={types} staff={staff} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
