"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getSession, VIEW_AS_COOKIE } from "./session";
import { israelToIso, isValidPhone, normalizePhone } from "./format";
import type { ActionResult, ApptStatus, CallStatus, CancelReason, Confirmation } from "./types";

type PgError = { code?: string; message?: string; details?: string } | null;

// הופך שגיאה של בסיס הנתונים להודעה ברורה בעברית
function explain(error: PgError, fallback = "לא נשמר. נסי שוב בעוד רגע"): string {
  if (!error) return fallback;
  const msg = `${error.message ?? ""} ${error.details ?? ""}`;
  if (error.code === "23505" && msg.includes("phone")) return "כבר יש לקוחה עם מספר הטלפון הזה";
  if (error.code === "23P01") return "השעה הזו תפוסה אצל המטפלת. בחרי שעה אחרת";
  if (msg.includes("OUTSIDE_HOURS")) return "מחוץ לשעות הפעילות: א׳-ה׳ 09:00-19:00, ו׳ 09:00-13:00";
  if (msg.includes("DONE_BEFORE_START")) return "אפשר לסמן ״בוצע״ רק אחרי שהתור התחיל";
  if (msg.includes("closed_needs_resolution")) return "כדי לסגור קריאה צריך לכתוב משפט סיכום";
  if (msg.includes("cancel_reason_matches")) return "כדי לבטל תור צריך לבחור סיבה";
  if (msg.includes("phone_check") || msg.includes("clients_phone_check")) return "מספר הטלפון לא תקין";
  if (error.code === "42501") return "אין לך הרשאה לפעולה הזו";
  return fallback;
}

const NO_ROWS = "אין לך הרשאה לעדכן את הרשומה הזו";

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------- כניסה ויציאה ----------

export async function demoLogin(): Promise<ActionResult> {
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!email || !password) return { ok: false, error: "כניסת הבודק לא הוגדרה בשרת" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "הכניסה נכשלה. נסי שוב" };
  redirect("/");
}

export async function passwordLogin(_: unknown, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(fd, "email"), password: str(fd, "password") });
  if (error) return { ok: false, error: "המייל או הסיסמה לא נכונים" };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const store = await cookies();
  store.delete(VIEW_AS_COOKIE);
  redirect("/login");
}

export async function setViewAs(value: string) {
  const { isAdmin } = await getSession();
  if (!isAdmin) return;
  const store = await cookies();
  store.set(VIEW_AS_COOKIE, value, { httpOnly: true, sameSite: "lax", path: "/" });
  refresh();
}

// ---------- לקוחות ----------

export async function searchClients(q: string) {
  const { supabase } = await getSession();
  const term = q.trim();
  if (term.length < 2) return [];
  const digits = normalizePhone(term);
  const query = supabase.from("clients").select("id, full_name, phone").limit(6);
  const { data } =
    digits.length >= 3 ? await query.ilike("phone", `%${digits}%`) : await query.ilike("full_name", `%${term}%`);
  return data ?? [];
}

// מה שצריך כדי לקבוע תור ללקוחה: מצבים רפואיים (רק למטפלות) וסדרות פעילות
export async function getBookingContext(clientId: string) {
  const { supabase, isClinician } = await getSession();
  const [{ data: med }, { data: packages }] = await Promise.all([
    isClinician
      ? supabase.from("medical_profiles").select("conditions").eq("client_id", clientId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("treatment_packages")
      .select("id, treatment_type_id, total_sessions, used_sessions")
      .eq("client_id", clientId)
      .eq("status", "active"),
  ]);
  return { conditions: (med?.conditions as string[] | undefined) ?? [], packages: packages ?? [] };
}

export async function saveClient(fd: FormData): Promise<ActionResult> {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const full_name = str(fd, "full_name");
  const phone = normalizePhone(str(fd, "phone"));
  if (full_name.length < 2) return { ok: false, error: "צריך שם מלא" };
  if (!isValidPhone(phone)) return { ok: false, error: "מספר הטלפון לא תקין. לדוגמה: 054-123-4567" };

  const row = {
    full_name,
    phone,
    source: str(fd, "source") || null,
    notes: str(fd, "notes") || null,
  };

  if (id) {
    const { data, error } = await supabase.from("clients").update(row).eq("id", id).select("id");
    if (error) return { ok: false, error: explain(error) };
    if (!data?.length) return { ok: false, error: NO_ROWS };
    refresh();
    return { ok: true, id };
  }

  const { data, error } = await supabase.from("clients").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await supabase.from("clients").select("id").eq("phone", phone).maybeSingle();
      return { ok: false, error: "הלקוחה כבר קיימת. עוברות לכרטיס שלה", existingId: existing?.id };
    }
    return { ok: false, error: explain(error) };
  }
  refresh();
  return { ok: true, id: data.id };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, error: "רק מנהלת יכולה למחוק לקוחה" };
  const { data, error } = await supabase.from("clients").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true };
}

export async function saveMedical(fd: FormData): Promise<ActionResult> {
  const { supabase, isClinician } = await getSession();
  if (!isClinician) return { ok: false, error: "מידע רפואי זמין רק למטפלות" };
  const client_id = str(fd, "client_id");
  const row = {
    client_id,
    declaration_signed_at: str(fd, "declaration_signed_at") || null,
    conditions: fd.getAll("conditions").map(String),
    allergies: str(fd, "allergies") || null,
    medications: str(fd, "medications") || null,
  };
  const { error } = await supabase.from("medical_profiles").upsert(row);
  if (error) return { ok: false, error: explain(error) };
  refresh();
  return { ok: true };
}

export async function createPackage(fd: FormData): Promise<ActionResult> {
  const { supabase } = await getSession();
  const total = Number(str(fd, "total_sessions"));
  if (!Number.isInteger(total) || total < 2 || total > 20) return { ok: false, error: "מספר הטיפולים בסדרה: בין 2 ל-20" };
  const { error } = await supabase.from("treatment_packages").insert({
    client_id: str(fd, "client_id"),
    treatment_type_id: str(fd, "treatment_type_id"),
    total_sessions: total,
  });
  if (error) return { ok: false, error: explain(error) };
  refresh();
  return { ok: true };
}

// ---------- תורים ----------

export async function saveAppointment(fd: FormData): Promise<ActionResult> {
  const { supabase, me } = await getSession();
  const id = str(fd, "id");
  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!str(fd, "client_id")) return { ok: false, error: "בחרי לקוחה" };
  if (!date || !time) return { ok: false, error: "בחרי תאריך ושעה" };
  if (fd.get("needs_ack") === "1" && fd.get("ack") !== "on") {
    return { ok: false, error: "יש התוויית נגד. צריך לסמן ״בדקתי ואישרתי״" };
  }

  const row = {
    client_id: str(fd, "client_id"),
    treatment_type_id: str(fd, "treatment_type_id"),
    staff_id: str(fd, "staff_id"),
    starts_at: israelToIso(date, time),
    package_id: str(fd, "package_id") || null,
    contraindication_ack_by: fd.get("ack") === "on" ? me.id : null,
  };

  const res = id
    ? await supabase.from("appointments").update(row).eq("id", id).select("id")
    : await supabase.from("appointments").insert(row).select("id");
  if (res.error) return { ok: false, error: explain(res.error) };
  if (!res.data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true, id: res.data[0].id };
}

export async function setAppointmentStatus(
  id: string,
  status: ApptStatus,
  extra: { summary?: string; cancel_reason?: CancelReason } = {},
): Promise<ActionResult> {
  const { supabase } = await getSession();
  if (status === "cancelled" && !extra.cancel_reason) return { ok: false, error: "בחרי סיבת ביטול" };
  const patch: Record<string, unknown> = { status, cancel_reason: status === "cancelled" ? extra.cancel_reason : null };
  if (status === "done") patch.summary = extra.summary?.trim() || null;
  const { data, error } = await supabase.from("appointments").update(patch).eq("id", id).select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true };
}

export async function setConfirmation(id: string, confirmation: Confirmation): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { data, error } = await supabase.from("appointments").update({ confirmation }).eq("id", id).select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true };
}

// ---------- קריאות שירות ----------

export async function saveCall(fd: FormData): Promise<ActionResult> {
  const { supabase } = await getSession();
  const id = str(fd, "id");
  const description = str(fd, "description");
  if (!str(fd, "client_id")) return { ok: false, error: "בחרי לקוחה" };
  if (description.length < 3) return { ok: false, error: "כתבי בכמה מילים במה מדובר" };
  const row = {
    client_id: str(fd, "client_id"),
    description,
    topic: str(fd, "topic") || null,
    channel: str(fd, "channel") || null,
    assignee_id: str(fd, "assignee_id"),
  };
  const res = id
    ? await supabase.from("service_calls").update(row).eq("id", id).select("id")
    : await supabase.from("service_calls").insert(row).select("id");
  if (res.error) return { ok: false, error: explain(res.error) };
  if (!res.data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true, id: res.data[0].id };
}

export async function setCallStatus(id: string, status: CallStatus, resolution?: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  if (status === "closed" && !resolution?.trim()) return { ok: false, error: "כדי לסגור קריאה צריך לכתוב משפט סיכום" };
  const patch: Record<string, unknown> = { status };
  if (status === "closed") patch.resolution = resolution!.trim();
  const { data, error } = await supabase.from("service_calls").update(patch).eq("id", id).select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: "רק האחראית על הקריאה או המנהלת יכולות לעדכן אותה" };
  refresh();
  return { ok: true };
}

export async function reassignCall(id: string, assignee_id: string): Promise<ActionResult> {
  const { supabase } = await getSession();
  const { data, error } = await supabase.from("service_calls").update({ assignee_id }).eq("id", id).select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: "רק האחראית על הקריאה או המנהלת יכולות להעביר אותה" };
  refresh();
  return { ok: true };
}

// ---------- ניהול (מנהלת) ----------

export async function updateStaff(id: string, patch: { role?: string; is_active?: boolean }): Promise<ActionResult> {
  const { supabase, isAdmin, me } = await getSession();
  if (!isAdmin) return { ok: false, error: "רק מנהלת יכולה לשנות הרשאות" };
  if (id === me.id) return { ok: false, error: "אי אפשר לשנות את ההרשאה של עצמך" };
  const { data, error } = await supabase.from("staff").update(patch).eq("id", id).select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true };
}

export async function updateTreatmentType(fd: FormData): Promise<ActionResult> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, error: "רק מנהלת יכולה לערוך סוגי טיפול" };
  const duration = Number(str(fd, "duration_min"));
  const renewal = str(fd, "renewal_days");
  if (!Number.isInteger(duration) || duration < 10 || duration > 240) return { ok: false, error: "משך טיפול: בין 10 ל-240 דקות" };
  const { data, error } = await supabase
    .from("treatment_types")
    .update({ duration_min: duration, renewal_days: renewal ? Number(renewal) : null })
    .eq("id", str(fd, "id"))
    .select("id");
  if (error) return { ok: false, error: explain(error) };
  if (!data?.length) return { ok: false, error: NO_ROWS };
  refresh();
  return { ok: true };
}

export async function resetDemo(): Promise<ActionResult> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { ok: false, error: "רק מנהלת יכולה לאפס את נתוני ההדגמה" };
  const { error } = await supabase.rpc("reset_demo");
  if (error) return { ok: false, error: explain(error, "האיפוס נכשל") };
  refresh();
  return { ok: true };
}
