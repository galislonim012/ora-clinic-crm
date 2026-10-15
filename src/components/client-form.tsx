"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveClient } from "@/lib/actions";
import { formatPhone, isValidPhone, normalizePhone } from "@/lib/format";
import { sourceLabel } from "@/lib/labels";
import type { Client, ClientSource } from "@/lib/types";
import { useRunAction } from "./client-kit";
import { buttonClass, cn, inputClass, Label, textareaClass } from "./ui";

// טופס לקוחה עם בדיקת שדות כשעוזבים את השדה
export function ClientForm({ client, initialPhone, onSaved }: { client?: Client; initialPhone?: string; onSaved?: () => void }) {
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [name, setName] = useState(client?.full_name ?? "");
  const [phone, setPhone] = useState(client ? formatPhone(client.phone) : initialPhone ? formatPhone(initialPhone) : "");
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean }>({});

  const nameOk = name.trim().length >= 2;
  const phoneOk = isValidPhone(phone);
  const nameErr = touched.name && !nameOk;
  const phoneErr = touched.phone && !phoneOk;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched({ name: true, phone: true });
        if (!nameOk || !phoneOk) return;
        const fd = new FormData(e.currentTarget);
        run(() => saveClient(fd), {
          success: client ? "הפרטים נשמרו" : "הלקוחה נוספה",
          onOk: (r) => {
            onSaved?.();
            if (!client && r.id) router.push(`/clients/${r.id}`);
          },
          onError: (r) => {
            if (r.existingId) {
              toast.info("הלקוחה כבר קיימת, עברנו לכרטיס שלה");
              router.push(`/clients/${r.existingId}`);
            }
          },
        });
      }}
      noValidate
      className="space-y-4"
    >
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="full_name">שם מלא</Label>
          <div className="relative">
            <input
              id="full_name"
              name="full_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              aria-invalid={nameErr || undefined}
              aria-describedby={nameErr ? "name-err" : undefined}
              autoComplete="off"
              placeholder="לדוגמה: מיכל לוי"
              className={cn(inputClass, "pe-9")}
            />
            {touched.name && nameOk && <Check size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-st-green" />}
          </div>
          {nameErr && (
            <p id="name-err" className="mt-1 text-[13px] text-st-red">
              צריך שם מלא (לפחות 2 אותיות)
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="phone">טלפון</Label>
          <div className="relative">
            <input
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                setTouched((t) => ({ ...t, phone: true }));
                if (isValidPhone(phone)) setPhone(formatPhone(normalizePhone(phone)));
              }}
              aria-invalid={phoneErr || undefined}
              aria-describedby={phoneErr ? "phone-err" : undefined}
              inputMode="tel"
              dir="ltr"
              placeholder="054-123-4567"
              className={cn(inputClass, "pe-9 text-start")}
            />
            {touched.phone && phoneOk && <Check size={16} className="absolute end-3 top-1/2 -translate-y-1/2 text-st-green" />}
          </div>
          {phoneErr && (
            <p id="phone-err" className="mt-1 text-[13px] text-st-red">
              מספר לא תקין. לדוגמה: 054-123-4567
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="source">מקור הגעה</Label>
          <select id="source" name="source" defaultValue={client?.source ?? ""} className={inputClass}>
            <option value="">לא ידוע</option>
            {(Object.keys(sourceLabel) as ClientSource[]).map((s) => (
              <option key={s} value={s}>
                {sourceLabel[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="notes" hint="(לא חובה)">
          הערות
        </Label>
        <textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} placeholder="לדוגמה: מעדיפה תורים אחר הצהריים" className={textareaClass} />
      </div>
      <div className="flex justify-end gap-2">
        <button disabled={pending} className={buttonClass("primary")}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {client ? "שמירת שינויים" : "הוספת לקוחה"}
        </button>
      </div>
    </form>
  );
}
