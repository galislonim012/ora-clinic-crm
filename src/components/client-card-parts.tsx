"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { createPackage, deleteClient, saveMedical } from "@/lib/actions";
import { conditionKeys, conditionLabel } from "@/lib/labels";
import type { Client, MedicalProfile, TreatmentType } from "@/lib/types";
import { ClientForm } from "./client-form";
import { Dialog, useRunAction, type DialogHandle } from "./client-kit";
import { buttonClass, inputClass, Label, textareaClass } from "./ui";

export function EditClientButton({ client }: { client: Client }) {
  const ref = useRef<DialogHandle>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.open()} className={buttonClass("secondary")}>
        <Pencil size={15} /> עריכת פרטים
      </button>
      <Dialog ref={ref} title="עריכת פרטי לקוחה" wide>
        <ClientForm client={client} onSaved={() => ref.current?.close()} />
      </Dialog>
    </>
  );
}

export function DeleteClientButton({ client }: { client: Client }) {
  const ref = useRef<DialogHandle>(null);
  const router = useRouter();
  const { run, pending } = useRunAction();
  const [typed, setTyped] = useState("");
  return (
    <>
      <button type="button" onClick={() => ref.current?.open()} className={buttonClass("ghost")} title="מחיקת לקוחה">
        <Trash2 size={15} /> מחיקה
      </button>
      <Dialog ref={ref} title={`למחוק את ${client.full_name}?`}>
        <p className="text-[14.5px] text-ink-2">
          יימחקו גם כל התורים, הקריאות, הסדרות והמידע הרפואי שלה. אי אפשר לשחזר. כדי לאשר, הקלידי את השם המלא.
        </p>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={client.full_name} className={`${inputClass} mt-3`} aria-label="הקלדת השם לאישור" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className={buttonClass("ghost")}>
            ביטול
          </button>
          <button
            type="button"
            disabled={pending || typed.trim() !== client.full_name}
            onClick={() => run(() => deleteClient(client.id), { success: "הלקוחה נמחקה", onOk: () => router.push("/clients") })}
            className={buttonClass("danger")}
          >
            {pending && <Loader2 size={16} className="animate-spin" />} מחיקה סופית
          </button>
        </div>
      </Dialog>
    </>
  );
}

export function MedicalForm({ clientId, profile }: { clientId: string; profile: MedicalProfile | null }) {
  const { run, pending } = useRunAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        run(() => saveMedical(fd), { success: "הכרטיס הרפואי נשמר" });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="client_id" value={clientId} />
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-medium text-ink-2">מצבים שחשוב לדעת לפני טיפול</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {conditionKeys.map((k) => (
            <label
              key={k}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-[14.5px] transition has-[:checked]:border-st-red/40 has-[:checked]:bg-st-red-soft"
            >
              <input type="checkbox" name="conditions" value={k} defaultChecked={profile?.conditions.includes(k)} className="size-4" />
              {conditionLabel[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="allergies">רגישויות ואלרגיות</Label>
          <textarea id="allergies" name="allergies" defaultValue={profile?.allergies ?? ""} className={textareaClass} />
        </div>
        <div>
          <Label htmlFor="medications">תרופות קבועות</Label>
          <textarea id="medications" name="medications" defaultValue={profile?.medications ?? ""} className={textareaClass} />
        </div>
        <div>
          <Label htmlFor="declaration_signed_at">תאריך חתימה על הצהרת בריאות</Label>
          <input id="declaration_signed_at" name="declaration_signed_at" type="date" defaultValue={profile?.declaration_signed_at ?? ""} className={inputClass} />
        </div>
      </div>
      <div className="flex justify-end">
        <button disabled={pending} className={buttonClass("primary")}>
          {pending && <Loader2 size={16} className="animate-spin" />} שמירת הכרטיס הרפואי
        </button>
      </div>
    </form>
  );
}

export function NewPackageButton({ clientId, types }: { clientId: string; types: TreatmentType[] }) {
  const ref = useRef<DialogHandle>(null);
  const { run, pending } = useRunAction();
  return (
    <>
      <button type="button" onClick={() => ref.current?.open()} className={buttonClass("secondary", "sm")}>
        <Plus size={15} /> סדרה חדשה
      </button>
      <Dialog ref={ref} title="פתיחת סדרת טיפולים">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => createPackage(fd), { success: "הסדרה נפתחה", onOk: () => ref.current?.close() });
          }}
          className="space-y-4"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <div>
            <Label htmlFor="pkg-type">סוג טיפול</Label>
            <select id="pkg-type" name="treatment_type_id" required className={inputClass} defaultValue={types.find((t) => t.category === "laser")?.id}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pkg-total">מספר טיפולים בסדרה</Label>
            <input id="pkg-total" name="total_sessions" type="number" min={2} max={20} defaultValue={6} required className={inputClass} />
          </div>
          <p className="text-[13px] text-ink-2">כל תור של הסדרה שמסומן ״בוצע״ יוריד טיפול מהיתרה באופן אוטומטי. הסדרה סופרת טיפולים, לא כסף.</p>
          <div className="flex justify-end">
            <button disabled={pending} className={buttonClass("primary")}>
              {pending && <Loader2 size={16} className="animate-spin" />} פתיחת הסדרה
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
