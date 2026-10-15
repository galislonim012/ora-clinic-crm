"use client";

import { useRef } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { resetDemo, updateStaff, updateTreatmentType } from "@/lib/actions";
import { roleLabel } from "@/lib/labels";
import type { Staff, StaffRole, TreatmentType } from "@/lib/types";
import { Dialog, useRunAction, type DialogHandle } from "./client-kit";
import { buttonClass, cn, inputClass } from "./ui";

export function StaffControls({ s, isMe }: { s: Staff; isMe: boolean }) {
  const { run, pending } = useRunAction();
  if (isMe) return <span className="text-[13px] text-ink-2">זו את</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={s.role}
        disabled={pending}
        onChange={(e) => run(() => updateStaff(s.id, { role: e.target.value as StaffRole }), { success: "התפקיד עודכן" })}
        className="h-8 rounded-md border border-line-strong bg-surface px-2 text-[13.5px]"
        aria-label={`תפקיד של ${s.full_name}`}
      >
        {(Object.keys(roleLabel) as StaffRole[]).map((r) => (
          <option key={r} value={r}>
            {roleLabel[r]}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => updateStaff(s.id, { is_active: !s.is_active }), { success: s.is_active ? "המשתמשת הושבתה" : "המשתמשת הופעלה" })}
        className={buttonClass(s.is_active ? "ghost" : "secondary", "sm")}
      >
        {s.is_active ? "השבתה" : "הפעלה"}
      </button>
    </div>
  );
}

export function TreatmentTypeRow({ t }: { t: TreatmentType }) {
  const { run, pending } = useRunAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => updateTreatmentType(fd), { success: `״${t.name}״ עודכן` });
      }}
      className="grid items-center gap-2 py-3 sm:grid-cols-[1fr_110px_130px_auto]"
    >
      <input type="hidden" name="id" value={t.id} />
      <span className="font-medium">{t.name}</span>
      <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
        <input name="duration_min" type="number" min={10} max={240} defaultValue={t.duration_min} className={cn(inputClass, "h-8 w-16 px-2 text-[14px]")} />
        דק׳
      </label>
      <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
        חידוש
        <input name="renewal_days" type="number" min={1} defaultValue={t.renewal_days ?? ""} placeholder="-" className={cn(inputClass, "h-8 w-16 px-2 text-[14px]")} />
        ימים
      </label>
      <button disabled={pending} className={buttonClass("secondary", "sm")}>
        {pending && <Loader2 size={14} className="animate-spin" />} שמירה
      </button>
    </form>
  );
}

export function ResetDemoButton() {
  const ref = useRef<DialogHandle>(null);
  const { run, pending } = useRunAction();
  return (
    <>
      <button type="button" onClick={() => ref.current?.open()} className={buttonClass("secondary")}>
        <RotateCcw size={16} /> איפוס נתוני ההדגמה
      </button>
      <Dialog ref={ref} title="לאפס את נתוני ההדגמה?">
        <p className="text-[14.5px] text-ink-2">
          כל הלקוחות, התורים והקריאות יוחלפו בנתוני ההדגמה המקוריים, עם תאריכים מעודכנים להיום. שינויים שנעשו במערכת יימחקו.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className={buttonClass("ghost")}>
            ביטול
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => resetDemo(), { success: "נתוני ההדגמה אופסו", onOk: () => ref.current?.close() })}
            className={buttonClass("primary")}
          >
            {pending && <Loader2 size={16} className="animate-spin" />} איפוס
          </button>
        </div>
      </Dialog>
    </>
  );
}
