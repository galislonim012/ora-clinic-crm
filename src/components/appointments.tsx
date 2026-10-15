"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CalendarPlus, Check, CircleSlash, MessageCircle, Pencil, ThumbsUp, Loader2 } from "lucide-react";
import { getBookingContext, saveAppointment, setAppointmentStatus, setConfirmation } from "@/lib/actions";
import { formatDay, israelDate, israelTime, timeSlots, whatsappLink, nextBusinessDay } from "@/lib/format";
import {
  apptStatusLabel,
  apptTone,
  cancelReasonLabel,
  conditionLabel,
  confirmationLabel,
  confirmationTone,
} from "@/lib/labels";
import type { Appointment, CancelReason, Confirmation, Staff, TreatmentType } from "@/lib/types";
import { Dialog, useRunAction, type DialogHandle } from "./client-kit";
import { ClientPicker, type PickedClient } from "./client-picker";
import { Badge, buttonClass, cn, inputClass, Label, textareaClass } from "./ui";

type BookingContext = Awaited<ReturnType<typeof getBookingContext>>;

// ---------- טופס תור: יצירה ועריכה ----------

export function AppointmentDialogButton({
  types,
  staff,
  client,
  appt,
  label = "קביעת תור",
  variant = "primary",
  size = "md",
  iconOnly,
}: {
  types: TreatmentType[];
  staff: Staff[];
  client?: PickedClient | null;
  appt?: Appointment;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  iconOnly?: boolean;
}) {
  const ref = useRef<DialogHandle>(null);
  const [key, setKey] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setKey((k) => k + 1);
          setTimeout(() => ref.current?.open());
        }}
        className={buttonClass(variant, size)}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
      >
        {appt ? <Pencil size={15} /> : <CalendarPlus size={16} />}
        {!iconOnly && label}
      </button>
      <Dialog ref={ref} title={appt ? "עריכת תור" : "קביעת תור"}>
        <AppointmentForm key={key} types={types} staff={staff} client={client ?? null} appt={appt} onDone={() => ref.current?.close()} />
      </Dialog>
    </>
  );
}

function AppointmentForm({
  types,
  staff,
  client: initialClient,
  appt,
  onDone,
}: {
  types: TreatmentType[];
  staff: Staff[];
  client: PickedClient | null;
  appt?: Appointment;
  onDone: () => void;
}) {
  const { run, pending } = useRunAction();
  const [client, setClient] = useState<PickedClient | null>(initialClient);
  const [typeId, setTypeId] = useState(appt?.treatment_type_id ?? "");
  const type = types.find((t) => t.id === typeId);
  const therapists = staff.filter((s) => s.is_active && s.role !== "reception");
  const defaultStaff = (t?: TreatmentType) =>
    therapists.find((s) => s.specialty === t?.category)?.id ?? therapists.find((s) => s.role === "admin")?.id ?? "";
  const [staffId, setStaffId] = useState(appt?.staff_id ?? "");
  const [ctx, setCtx] = useState<BookingContext | null>(null);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (!client) return setCtx(null);
    let alive = true;
    getBookingContext(client.id).then((c) => alive && setCtx(c));
    return () => {
      alive = false;
    };
  }, [client]);

  const clash = useMemo(
    () => (type && ctx ? ctx.conditions.filter((c) => type.contraindications.includes(c)) : []),
    [type, ctx],
  );
  const packages = ctx?.packages.filter((p) => p.treatment_type_id === typeId) ?? [];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => saveAppointment(fd), { success: appt ? "התור עודכן" : "התור נקבע", onOk: onDone });
      }}
      className="space-y-4"
    >
      {appt && <input type="hidden" name="id" value={appt.id} />}
      <input type="hidden" name="client_id" value={client?.id ?? ""} />
      <input type="hidden" name="needs_ack" value={clash.length ? "1" : "0"} />

      <div>
        <Label>לקוחה</Label>
        {appt ? (
          <p className="font-medium">{client?.full_name}</p>
        ) : (
          <ClientPicker value={client} onChange={setClient} />
        )}
      </div>

      <div>
        <Label htmlFor="treatment_type_id">סוג טיפול</Label>
        <select
          id="treatment_type_id"
          name="treatment_type_id"
          required
          value={typeId}
          onChange={(e) => {
            const t = types.find((x) => x.id === e.target.value);
            setTypeId(e.target.value);
            if (!appt) setStaffId(defaultStaff(t));
            setAck(false);
          }}
          className={inputClass}
        >
          <option value="" disabled>
            בחרי טיפול
          </option>
          {types
            .filter((t) => t.is_active)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.duration_min} דק׳
              </option>
            ))}
        </select>
      </div>

      {clash.length > 0 && (
        <div role="alert" className="animate-rise rounded-xl border border-st-red/30 bg-st-red-soft p-3.5 text-st-red">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={18} /> התוויית נגד לטיפול הזה
          </p>
          <p className="mt-1 text-[14px]">{clash.map((c) => conditionLabel[c] ?? c).join(" · ")}</p>
          <label className="mt-2.5 flex items-center gap-2 text-[14px] font-medium text-ink">
            <input type="checkbox" name="ack" checked={ack} onChange={(e) => setAck(e.target.checked)} className="size-4" />
            בדקתי ואישרתי שאפשר לטפל
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="staff_id">מטפלת</Label>
          <select id="staff_id" name="staff_id" required value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              בחרי
            </option>
            {therapists.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="package_id">שייך לסדרה</Label>
          <select id="package_id" name="package_id" defaultValue={appt?.package_id ?? (packages[0]?.id ?? "")} className={inputClass} disabled={!packages.length && !appt?.package_id}>
            <option value="">לא</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                סדרה ({p.used_sessions}/{p.total_sessions})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="date">תאריך</Label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={appt ? israelDate(appt.starts_at) : nextBusinessDay(israelDate()) }
            className={inputClass}
          />
        </div>
        <div>
          <Label htmlFor="time">שעה</Label>
          <select id="time" name="time" required defaultValue={appt ? israelTime(appt.starts_at) : "10:00"} className={inputClass}>
            {timeSlots().map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[13px] text-ink-2">שעות פעילות: א׳-ה׳ 09:00-19:00, ו׳ 09:00-13:00. משך התור נקבע לפי סוג הטיפול.</p>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className={buttonClass("ghost")}>
          ביטול
        </button>
        <button disabled={pending || !client || (clash.length > 0 && !ack)} className={buttonClass("primary")}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {appt ? "שמירה" : "קביעת התור"}
        </button>
      </div>
    </form>
  );
}

// ---------- שורת תור עם פעולות ----------

export type ApptView = Appointment & {
  client_name: string;
  client_phone: string;
  type_name: string;
  staff_name: string;
  medical_alert: string[];
};

export function reminderText(a: ApptView) {
  const first = a.client_name.split(" ")[0];
  const day = israelDate(a.starts_at) === israelDate() ? "היום" : `ב${formatDay(a.starts_at, { weekday: "long", day: undefined, month: undefined })} (${formatDay(a.starts_at, { weekday: undefined })})`;
  return `היי ${first}, מזכירות ש${day} ב-${israelTime(a.starts_at)} יש לך ${a.type_name} אצל ${a.staff_name.split(" ")[0]} בקליניקת אורה 💛 נשמח לאישור הגעה`;
}

export function AppointmentItem({
  a,
  canEdit,
  types,
  staff,
  showDate,
  showClient = true,
}: {
  a: ApptView;
  canEdit: boolean;
  types: TreatmentType[];
  staff: Staff[];
  showDate?: boolean;
  showClient?: boolean;
}) {
  const { run, pending } = useRunAction();
  const [confirmation, setConf] = useState<Confirmation>(a.confirmation);
  useEffect(() => setConf(a.confirmation), [a.confirmation]);
  const doneRef = useRef<DialogHandle>(null);
  const cancelRef = useRef<DialogHandle>(null);
  const overdue = a.status === "future" && new Date(a.starts_at) < new Date();

  function updateConfirmation(next: Confirmation) {
    const prev = confirmation;
    setConf(next); // מתעדכן מיד, וחוזר אחורה אם השמירה נכשלה
    run(() => setConfirmation(a.id, next), { success: next === "confirmed" ? "סומן: אישרה הגעה" : undefined, onError: () => setConf(prev) });
  }

  return (
    <div className={cn("group flex flex-wrap items-start gap-x-4 gap-y-2 py-3", a.status === "cancelled" && "opacity-70")}>
      <div className="w-[64px] shrink-0">
        <p className="ltr text-[16px] font-semibold leading-6">{israelTime(a.starts_at)}</p>
        {showDate && <p className="text-[12.5px] text-ink-2">{formatDay(a.starts_at)}</p>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {showClient && (
            <Link href={`/clients/${a.client_id}`} className="font-semibold text-ink hover:text-sage hover:underline underline-offset-4">
              {a.client_name}
            </Link>
          )}
          <span className={cn("text-ink-2", !showClient && "font-medium text-ink")}>{a.type_name}</span>
          {a.medical_alert.length > 0 && a.status === "future" && (
            <span title={a.medical_alert.join(" · ")} className="inline-flex items-center gap-1 text-[13px] font-medium text-st-red">
              <AlertTriangle size={14} /> התראה רפואית
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-2">
          <span>{a.staff_name}</span>
          <span aria-hidden>·</span>
          {overdue ? <Badge tone="orange">לעדכון</Badge> : <Badge tone={apptTone[a.status]}>{apptStatusLabel[a.status]}</Badge>}
          {a.status === "future" && <Badge tone={confirmationTone[confirmation]}>{confirmationLabel[confirmation]}</Badge>}
          {a.status === "cancelled" && a.cancel_reason && <span>{cancelReasonLabel[a.cancel_reason]}</span>}
        </div>
        {a.summary && <p className="mt-1.5 text-[14px] text-ink-2">{a.summary}</p>}
      </div>

      {canEdit && a.status === "future" && (
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
          {!overdue && confirmation !== "confirmed" && (
            <>
              <a
                href={whatsappLink(a.client_phone, reminderText(a))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => confirmation === "not_sent" && updateConfirmation("reminder_sent")}
                className={buttonClass("secondary", "sm")}
              >
                <MessageCircle size={15} /> תזכורת
              </a>
              <button type="button" disabled={pending} onClick={() => updateConfirmation("confirmed")} className={buttonClass("secondary", "sm")}>
                <ThumbsUp size={15} /> אישרה
              </button>
            </>
          )}
          {overdue && (
            <button type="button" onClick={() => doneRef.current?.open()} className={buttonClass("primary", "sm")}>
              <Check size={15} /> בוצע
            </button>
          )}
          <button type="button" onClick={() => cancelRef.current?.open()} className={buttonClass("ghost", "sm")} title="ביטול התור">
            <CircleSlash size={15} /> ביטול
          </button>
          <AppointmentDialogButton
            types={types}
            staff={staff}
            appt={a}
            client={{ id: a.client_id, full_name: a.client_name, phone: a.client_phone }}
            variant="ghost"
            size="sm"
            label="עריכה"
            iconOnly
          />
        </div>
      )}

      <Dialog ref={doneRef} title="סימון ״בוצע״">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const summary = String(new FormData(e.currentTarget).get("summary") ?? "");
            run(() => setAppointmentStatus(a.id, "done", { summary }), { success: "התור סומן כבוצע", onOk: () => doneRef.current?.close() });
          }}
          className="space-y-3"
        >
          <p className="text-[14.5px] text-ink-2">
            {a.client_name} · {a.type_name}
          </p>
          <div>
            <Label htmlFor={`summary-${a.id}`}>סיכום הטיפול</Label>
            <textarea id={`summary-${a.id}`} name="summary" placeholder="לדוגמה: מצח + קמטי צחוק, 20 יחידות. העור הגיב טוב." className={textareaClass} />
          </div>
          <div className="flex justify-end gap-2">
            <button disabled={pending} className={buttonClass("primary")}>
              {pending && <Loader2 size={16} className="animate-spin" />} שמירה
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog ref={cancelRef} title="ביטול תור">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const reason = new FormData(e.currentTarget).get("reason") as CancelReason | null;
            if (!reason) return;
            run(() => setAppointmentStatus(a.id, "cancelled", { cancel_reason: reason }), {
              success: "התור בוטל",
              onOk: () => cancelRef.current?.close(),
            });
          }}
          className="space-y-3"
        >
          <p className="text-[14.5px] text-ink-2">
            {a.client_name} · {formatDay(a.starts_at)} {israelTime(a.starts_at)}
          </p>
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[13.5px] font-medium text-ink-2">סיבת הביטול</legend>
            {(Object.keys(cancelReasonLabel) as CancelReason[]).map((r) => (
              <label key={r} className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 has-[:checked]:border-sage has-[:checked]:bg-sage-soft/50">
                <input type="radio" name="reason" value={r} required className="size-4" />
                {cancelReasonLabel[r]}
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end">
            <button disabled={pending} className={buttonClass("danger")}>
              {pending && <Loader2 size={16} className="animate-spin" />} ביטול התור
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
