"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Clock3, Loader2, MessageSquarePlus, PlayCircle, CheckCircle2, RotateCcw, Pencil } from "lucide-react";
import { reassignCall, saveCall, setCallStatus } from "@/lib/actions";
import { elapsed, formatDateShort, minutesSince } from "@/lib/format";
import { callStatusLabel, callTone, categoryLabel, channelLabel, suggestedAssignee } from "@/lib/labels";
import type { CallChannel, CallStatus, Category, ServiceCall, Staff } from "@/lib/types";
import { Dialog, useRunAction, type DialogHandle } from "./client-kit";
import { ClientPicker, type PickedClient } from "./client-picker";
import { Badge, buttonClass, cn, inputClass, Label, textareaClass } from "./ui";

export type CallView = ServiceCall & { client_name: string; client_phone: string; assignee_name: string };

// ---------- טופס קריאה ----------

export function CallDialogButton({
  staff,
  client,
  call,
  label = "קריאה חדשה",
  variant = "primary",
  size = "md",
}: {
  staff: Staff[];
  client?: PickedClient | null;
  call?: CallView;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
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
        title={call ? "עריכת קריאה" : undefined}
        aria-label={call ? "עריכת קריאה" : undefined}
      >
        {call ? <Pencil size={15} /> : <MessageSquarePlus size={16} />}
        {!call && label}
      </button>
      <Dialog ref={ref} title={call ? "עריכת קריאה" : "קריאת שירות חדשה"}>
        {key > 0 && <CallForm key={key} staff={staff} client={client ?? null} call={call} onDone={() => ref.current?.close()} />}
      </Dialog>
    </>
  );
}

function CallForm({ staff, client: initial, call, onDone }: { staff: Staff[]; client: PickedClient | null; call?: CallView; onDone: () => void }) {
  const { run, pending } = useRunAction();
  const active = staff.filter((s) => s.is_active);
  const [client, setClient] = useState<PickedClient | null>(initial);
  const [topic, setTopic] = useState<Category | "">(call?.topic ?? "");
  const [assignee, setAssignee] = useState(call?.assignee_id ?? suggestedAssignee(active, null) ?? "");
  const [touchedAssignee, setTouched] = useState(Boolean(call));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => saveCall(fd), { success: call ? "הקריאה עודכנה" : "הקריאה נפתחה", onOk: onDone });
      }}
      className="space-y-4"
    >
      {call && <input type="hidden" name="id" value={call.id} />}
      <input type="hidden" name="client_id" value={client?.id ?? ""} />
      <div>
        <Label>לקוחה</Label>
        {call ? <p className="font-medium">{call.client_name}</p> : <ClientPicker value={client} onChange={setClient} />}
      </div>
      <div>
        <Label htmlFor="description">תיאור הפנייה</Label>
        <textarea
          id="description"
          name="description"
          required
          minLength={3}
          defaultValue={call?.description}
          placeholder="לדוגמה: שואלת אם לייזר מתאים לעור כהה"
          className={textareaClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="topic">נושא</Label>
          <select
            id="topic"
            name="topic"
            value={topic}
            onChange={(e) => {
              const t = e.target.value as Category | "";
              setTopic(t);
              if (!touchedAssignee) setAssignee(suggestedAssignee(active, t || null) ?? "");
            }}
            className={inputClass}
          >
            <option value="">כללי</option>
            {(Object.keys(categoryLabel) as Category[]).map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="channel">ערוץ</Label>
          <select id="channel" name="channel" defaultValue={call?.channel ?? ""} className={inputClass}>
            <option value="">לא ידוע</option>
            {(Object.keys(channelLabel) as CallChannel[]).map((c) => (
              <option key={c} value={c}>
                {channelLabel[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="assignee_id" hint={!touchedAssignee && topic ? "(הוצע לפי הנושא)" : undefined}>
          אחראית
        </Label>
        <select
          id="assignee_id"
          name="assignee_id"
          required
          value={assignee}
          onChange={(e) => {
            setAssignee(e.target.value);
            setTouched(true);
          }}
          className={inputClass}
        >
          {active.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className={buttonClass("ghost")}>
          ביטול
        </button>
        <button disabled={pending || !client} className={buttonClass("primary")}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {call ? "שמירה" : "פתיחת קריאה"}
        </button>
      </div>
    </form>
  );
}

// ---------- שעון המתנה ----------

export function WaitBadge({ call }: { call: CallView }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  if (call.status !== "new") {
    return call.first_response_at ? (
      <span className="text-[12.5px] text-ink-2">תגובה ראשונה אחרי {elapsed(call.created_at, new Date(call.first_response_at))}</span>
    ) : null;
  }
  const mins = minutesSince(call.created_at);
  const tone = mins <= 30 ? "green" : mins <= 60 ? "orange" : "red";
  return (
    <Badge tone={tone} className="font-semibold">
      <Clock3 size={13} /> מחכה {elapsed(call.created_at)}
    </Badge>
  );
}

// ---------- כרטיס קריאה ----------

export function CallCard({
  call,
  canEdit,
  canReassign,
  staff,
  showClient = true,
  compact,
}: {
  call: CallView;
  canEdit: boolean;
  canReassign: boolean;
  staff: Staff[];
  showClient?: boolean;
  compact?: boolean;
}) {
  const { run, pending } = useRunAction();
  const closeRef = useRef<DialogHandle>(null);
  const [status, setStatus] = useState<CallStatus>(call.status);
  useEffect(() => setStatus(call.status), [call.status]);

  function move(next: CallStatus) {
    const prev = status;
    setStatus(next);
    run(() => setCallStatus(call.id, next), { success: `הקריאה עברה ל״${callStatusLabel[next]}״`, onError: () => setStatus(prev) });
  }

  return (
    <article className={cn("animate-rise rounded-xl border border-line bg-surface", compact ? "p-3.5" : "p-4 shadow-card")}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        {showClient ? (
          <Link href={`/clients/${call.client_id}?tab=calls`} className="font-semibold hover:text-sage hover:underline underline-offset-4">
            {call.client_name}
          </Link>
        ) : (
          <Badge tone={callTone[status]}>{callStatusLabel[status]}</Badge>
        )}
        <WaitBadge call={{ ...call, status }} />
      </div>
      <p className="text-[14.5px] leading-6 text-ink">{call.description}</p>
      {call.resolution && status === "closed" && (
        <p className="mt-1.5 rounded-lg bg-st-green-soft px-3 py-1.5 text-[13.5px] text-st-green">סיכום: {call.resolution}</p>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-2">
        {call.topic && <span>{categoryLabel[call.topic]}</span>}
        {call.channel && (
          <>
            <span aria-hidden>·</span>
            <span>{channelLabel[call.channel]}</span>
          </>
        )}
        <span aria-hidden>·</span>
        <span>נפתחה {formatDateShort(call.created_at)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {canReassign ? (
          <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
            אחראית
            <select
              value={call.assignee_id}
              disabled={pending}
              onChange={(e) => run(() => reassignCall(call.id, e.target.value), { success: "האחראית עודכנה" })}
              className="h-8 rounded-md border border-line-strong bg-surface px-2 text-[13.5px] text-ink"
            >
              {staff
                .filter((s) => s.is_active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <span className="text-[13px] text-ink-2">
            אחראית: <b className="font-medium text-ink">{call.assignee_name}</b>
          </span>
        )}
        {canEdit && (
          <div className="ms-auto flex gap-1.5">
            {status === "new" && (
              <button type="button" disabled={pending} onClick={() => move("in_progress")} className={buttonClass("secondary", "sm")}>
                <PlayCircle size={15} /> לטיפול
              </button>
            )}
            {status !== "closed" && (
              <button type="button" onClick={() => closeRef.current?.open()} className={buttonClass("secondary", "sm")}>
                <CheckCircle2 size={15} /> סגירה
              </button>
            )}
            {status === "closed" && (
              <button type="button" disabled={pending} onClick={() => move("in_progress")} className={buttonClass("ghost", "sm")}>
                <RotateCcw size={15} /> פתיחה מחדש
              </button>
            )}
            {status !== "closed" && <CallDialogButton staff={staff} call={call} variant="ghost" size="sm" />}
          </div>
        )}
      </div>

      <Dialog ref={closeRef} title="סגירת קריאה">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const resolution = String(new FormData(e.currentTarget).get("resolution") ?? "");
            run(() => setCallStatus(call.id, "closed", resolution), { success: "הקריאה נסגרה", onOk: () => closeRef.current?.close() });
          }}
          className="space-y-3"
        >
          <p className="text-[14.5px] text-ink-2">{call.description}</p>
          <div>
            <Label htmlFor={`res-${call.id}`}>מה נעשה בפועל?</Label>
            <textarea
              id={`res-${call.id}`}
              name="resolution"
              required
              minLength={2}
              placeholder="לדוגמה: נקבע טיפול ניסיון ליום ג׳"
              className={textareaClass}
            />
          </div>
          <div className="flex justify-end">
            <button disabled={pending} className={buttonClass("primary")}>
              {pending && <Loader2 size={16} className="animate-spin" />} סגירת הקריאה
            </button>
          </div>
        </form>
      </Dialog>
    </article>
  );
}
