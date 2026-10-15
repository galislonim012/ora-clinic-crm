export const TZ = "Asia/Jerusalem";

// 0541234567 -> 054-123-4567
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return phone;
}

export function normalizePhone(input: string) {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

export function isValidPhone(input: string) {
  return /^0\d{8,9}$/.test(normalizePhone(input));
}

// תאריך מקומי (ישראל) של רגע נתון, בפורמט YYYY-MM-DD
export function israelDate(d: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

export function israelTime(d: Date | string) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

export function formatDay(d: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric", ...opts }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

export function formatDateLong(d: Date | string) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

export function formatDateShort(d: Date | string) {
  return new Intl.DateTimeFormat("he-IL", { timeZone: TZ, day: "numeric", month: "numeric", year: "2-digit" }).format(
    typeof d === "string" ? new Date(d) : d,
  );
}

// "2026-10-16" + "10:30" (שעון ישראל) -> ISO עם ההיסט הנכון, כולל שעון קיץ
export function israelToIso(date: string, time: string) {
  const probe = new Date(`${date}T${time}:00Z`);
  const offsetName =
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+02:00";
  const offset = offsetName.replace("GMT", "") || "+00:00";
  return new Date(`${date}T${time}:00${offset}`).toISOString();
}

// תחילת וסוף יום בשעון ישראל, כ-ISO
export function israelDayRange(date: string) {
  const start = israelToIso(date, "00:00");
  const end = new Date(new Date(start).getTime() + 24 * 3600 * 1000).toISOString();
  return { start, end };
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dayOfWeek(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = ראשון
}

// יום העבודה הבא (ו׳-ש׳ לא נחשבים, כי בשישי עובדים רק בבוקר)
export function nextBusinessDay(date = israelDate()) {
  let d = addDays(date, 1);
  while (dayOfWeek(d) === 5 || dayOfWeek(d) === 6) d = addDays(d, 1);
  return d;
}

export function startOfWeek(date: string) {
  return addDays(date, -dayOfWeek(date));
}

// כמה זמן עבר, בעברית קצרה
export function elapsed(fromIso: string, to = new Date()) {
  const mins = Math.max(0, Math.round((to.getTime() - new Date(fromIso).getTime()) / 60000));
  if (mins < 60) return `${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}:${String(mins % 60).padStart(2, "0")} שע׳`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "יום" : `${days} ימים`;
}

export function minutesSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 60000;
}

export function whatsappLink(phone: string, text?: string) {
  const intl = "972" + normalizePhone(phone).replace(/^0/, "");
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function timeSlots() {
  const out: string[] = [];
  for (let h = 9; h < 19; h++) for (const m of [0, 15, 30, 45]) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return out;
}
