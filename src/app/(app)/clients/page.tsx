import Link from "next/link";
import { AlertTriangle, Search, UserPlus, UserRoundSearch } from "lucide-react";
import { getSession } from "@/lib/session";
import { formatDay, formatPhone, normalizePhone } from "@/lib/format";
import { sourceLabel } from "@/lib/labels";
import type { Client, ClientSource } from "@/lib/types";
import { Badge, ButtonLink, EmptyState, PageHeader, cn, inlineSelectClass, inputClass } from "@/components/ui";

export const metadata = { title: "לקוחות" };

type Row = Client & {
  appointments: { starts_at: string; status: string }[];
  service_calls: { status: string }[];
  treatment_packages: { status: string }[];
};

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; source?: string; sort?: string }> }) {
  const { q = "", source = "", sort = "name" } = await searchParams;
  const { supabase, isClinician } = await getSession();

  let query = supabase
    .from("clients")
    .select("*, appointments(starts_at, status), service_calls(status), treatment_packages(status)")
    .limit(200);
  const term = q.trim();
  const digits = normalizePhone(term);
  if (term) query = digits.length >= 3 ? query.ilike("phone", `%${digits}%`) : query.ilike("full_name", `%${term}%`);
  if (source) query = query.eq("source", source);
  query = sort === "recent" ? query.order("created_at", { ascending: false }) : query.order("full_name");

  const [{ data }, { data: med }] = await Promise.all([
    query,
    isClinician ? supabase.from("medical_profiles").select("client_id, conditions") : Promise.resolve({ data: [] as { client_id: string; conditions: string[] }[] }),
  ]);
  const alerts = new Set((med ?? []).filter((m) => m.conditions?.length).map((m) => m.client_id));
  const now = new Date().toISOString();

  const rows = ((data ?? []) as Row[]).map((c) => {
    const active = c.appointments.filter((a) => a.status !== "cancelled");
    const next = active.filter((a) => a.status === "future" && a.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    const last = active.filter((a) => a.status === "done").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
    return {
      c,
      next,
      last,
      openCalls: c.service_calls.filter((s) => s.status !== "closed").length,
      series: c.treatment_packages.some((p) => p.status === "active"),
    };
  });

  return (
    <div className="animate-rise">
      <PageHeader
        title="לקוחות"
        sub={`${rows.length} לקוחות${term ? ` שמתאימות לחיפוש ״${term}״` : ""}`}
        actions={
          <ButtonLink href={`/clients/new${digits.length >= 9 ? `?phone=${digits}` : ""}`} variant="primary">
            <UserPlus size={16} /> לקוחה חדשה
          </ButtonLink>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-2" />
          <input name="q" defaultValue={q} placeholder="טלפון (גם חלקי, עם או בלי מקף) או שם" className={cn(inputClass, "ps-9")} aria-label="חיפוש" />
        </div>
        <select name="source" defaultValue={source} className={inlineSelectClass} aria-label="מקור הגעה">
          <option value="">כל המקורות</option>
          {(Object.keys(sourceLabel) as ClientSource[]).map((s) => (
            <option key={s} value={s}>
              {sourceLabel[s]}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className={inlineSelectClass} aria-label="מיון">
          <option value="name">לפי שם</option>
          <option value="recent">הצטרפו לאחרונה</option>
        </select>
        <button className="h-10 rounded-lg bg-ink px-4 text-[14.5px] font-medium text-white transition hover:bg-ink-2 active:scale-[0.97]">חיפוש</button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={UserRoundSearch}
            title={term ? `לא מצאנו לקוחה עם ״${term}״` : "עדיין אין לקוחות"}
            text={term ? "אפשר לבדוק את המספר או ליצור לקוחה חדשה." : "הלקוחה הראשונה שתיכנס תופיע כאן."}
            action={
              <ButtonLink href={`/clients/new${digits.length >= 9 ? `?phone=${digits}` : ""}`} variant="primary">
                <UserPlus size={16} /> {digits.length >= 9 ? "ליצור לקוחה עם המספר הזה" : "לקוחה חדשה"}
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          {/* מחשב: טבלה */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:block">
            <table className="w-full text-[14.5px]">
              <thead className="bg-panel/60 text-[12.5px] text-ink-2">
                <tr>
                  <th className="px-5 py-3 text-start font-medium">שם</th>
                  <th className="px-3 py-3 text-start font-medium">טלפון</th>
                  <th className="px-3 py-3 text-start font-medium">תור הבא</th>
                  <th className="px-3 py-3 text-start font-medium">טיפול אחרון</th>
                  <th className="px-3 py-3 text-start font-medium">קריאות פתוחות</th>
                  <th className="px-5 py-3 text-start font-medium">מקור</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, next, last, openCalls, series }) => (
                  <tr key={c.id} className="group border-t border-line transition-colors hover:bg-canvas">
                    <td className="px-5 py-3">
                      <Link href={`/clients/${c.id}`} className="font-semibold hover:underline underline-offset-4 group-hover:text-sage">
                        {c.full_name}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {alerts.has(c.id) && (
                          <Badge tone="red">
                            <AlertTriangle size={12} /> רפואי
                          </Badge>
                        )}
                        {c.no_show_count >= 2 && <Badge tone="orange">הבריזה {c.no_show_count} פעמים</Badge>}
                        {series && <Badge tone="sage">סדרה פעילה</Badge>}
                      </div>
                    </td>
                    <td className="ltr px-3 py-3 text-ink-2">{formatPhone(c.phone)}</td>
                    <td className="px-3 py-3">{next ? formatDay(next.starts_at) : <span className="text-ink-3">—</span>}</td>
                    <td className="px-3 py-3 text-ink-2">{last ? formatDay(last.starts_at, { year: "2-digit" }) : <span className="text-ink-3">—</span>}</td>
                    <td className="px-3 py-3">{openCalls ? <Badge tone="orange">{openCalls}</Badge> : <span className="text-ink-3">—</span>}</td>
                    <td className="px-5 py-3 text-ink-2">{c.source ? sourceLabel[c.source] : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* טלפון: כרטיסים */}
          <ul className="space-y-2 md:hidden">
            {rows.map(({ c, next, openCalls, series }) => (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="block rounded-xl border border-line bg-surface p-4 shadow-card transition active:scale-[0.99]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{c.full_name}</span>
                    <span className="ltr text-[14px] text-ink-2">{formatPhone(c.phone)}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-2">
                    <span>תור הבא: {next ? formatDay(next.starts_at) : "—"}</span>
                    {alerts.has(c.id) && <Badge tone="red">רפואי</Badge>}
                    {c.no_show_count >= 2 && <Badge tone="orange">הבריזה {c.no_show_count}</Badge>}
                    {series && <Badge tone="sage">סדרה</Badge>}
                    {openCalls > 0 && <Badge tone="orange">{openCalls} קריאות</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
