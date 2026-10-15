import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadTypes } from "@/lib/queries";
import { categoryLabel, conditionLabel, roleLabel } from "@/lib/labels";
import { ResetDemoButton, StaffControls, TreatmentTypeRow } from "@/components/team-parts";
import { Badge, PageHeader, Panel } from "@/components/ui";

export const metadata = { title: "צוות והרשאות" };

export default async function TeamPage() {
  const { staff, isAdmin, me } = await getSession();
  if (!isAdmin) redirect("/");
  const types = await loadTypes();

  return (
    <div className="animate-rise space-y-5">
      <PageHeader title="צוות והרשאות" sub="ההרשאות נאכפות בבסיס הנתונים עצמו, לא רק במסך." actions={<ResetDemoButton />} />

      <Panel title="משתמשות" bodyClass="py-1 divide-y divide-line">
        {staff.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold">
                {s.full_name} {!s.is_active && <Badge tone="gray">מושבתת</Badge>}
              </p>
              <p className="text-[13.5px] text-ink-2">
                {roleLabel[s.role]}
                {s.specialty && ` · ${categoryLabel[s.specialty]}`}
              </p>
            </div>
            <StaffControls s={s} isMe={s.id === me.id} />
          </div>
        ))}
      </Panel>

      <Panel title="סוגי טיפול" bodyClass="py-1 divide-y divide-line">
        {types.map((t) => (
          <div key={t.id}>
            <TreatmentTypeRow t={t} />
            {t.contraindications.length > 0 && (
              <p className="-mt-1 pb-3 text-[13px] text-ink-2">התוויות נגד: {t.contraindications.map((c) => conditionLabel[c] ?? c).join(" · ")}</p>
            )}
          </div>
        ))}
      </Panel>

      <Panel title="מה כל תפקיד יכול לעשות">
        <ul className="space-y-1.5 text-[14.5px] text-ink-2">
          <li>
            <b className="text-ink">מנהלת:</b> הכל, כולל מחיקת לקוחות, העברת כל קריאה, ניהול צוות ואיפוס נתונים.
          </li>
          <li>
            <b className="text-ink">מטפלת:</b> רואה את כל היומן והקריאות. מעדכנת תורים שלה או שקבעה, וקריאות שמשויכות אליה. רואה מידע רפואי.
          </li>
          <li>
            <b className="text-ink">קבלה:</b> לקוחות, תורים וקריאות, בלי מידע רפואי ובלי מחיקה.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
