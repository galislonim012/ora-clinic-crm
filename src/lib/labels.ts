import type { ApptStatus, CallChannel, CallStatus, CancelReason, Category, ClientSource, Confirmation, StaffRole } from "./types";

export const roleLabel: Record<StaffRole, string> = {
  admin: "מנהלת",
  therapist: "מטפלת",
  reception: "קבלה",
};

export const categoryLabel: Record<Category, string> = {
  face: "פנים ואנטי-אייג'ינג",
  injection: "בוטוקס ומילוי",
  laser: "לייזר",
  consult: "ייעוץ / כללי",
};

export const sourceLabel: Record<ClientSource, string> = {
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  website: "אתר",
  referral: "המלצה",
  other: "אחר",
};

export const apptStatusLabel: Record<ApptStatus, string> = {
  future: "עתידי",
  done: "בוצע",
  cancelled: "בוטל",
};

export const cancelReasonLabel: Record<CancelReason, string> = {
  client: "הלקוחה ביטלה",
  clinic: "הקליניקה ביטלה",
  no_show: "לא הגיעה",
};

export const confirmationLabel: Record<Confirmation, string> = {
  not_sent: "לא נשלחה תזכורת",
  reminder_sent: "נשלחה תזכורת",
  confirmed: "אישרה הגעה",
};

export const callStatusLabel: Record<CallStatus, string> = {
  new: "חדשה",
  in_progress: "בטיפול",
  closed: "נסגרה",
};

export const channelLabel: Record<CallChannel, string> = {
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  whatsapp: "וואטסאפ",
  website: "טופס באתר",
  phone: "טלפון",
  walk_in: "הגיעה לקליניקה",
  ai_agent: "סוכן AI",
};

// מצבים רפואיים שיכולים להיות התוויות נגד לטיפול
export const conditionLabel: Record<string, string> = {
  pregnancy: "הריון או הנקה",
  blood_thinners: "תרופות מדללות דם",
  lidocaine_allergy: "רגישות ללידוקאין",
  isotretinoin: "רואקוטן בחצי השנה האחרונה",
  active_infection: "זיהום פעיל באזור הטיפול",
  autoimmune: "מחלה אוטואימונית",
};

export const conditionKeys = Object.keys(conditionLabel);

// צבע קבוע לכל סטטוס (פרק 6 ב-PRD)
export type Tone = "blue" | "green" | "gray" | "orange" | "red" | "purple" | "sage";

export const apptTone: Record<ApptStatus, Tone> = { future: "blue", done: "green", cancelled: "gray" };
export const callTone: Record<CallStatus, Tone> = { new: "orange", in_progress: "blue", closed: "green" };
export const confirmationTone: Record<Confirmation, Tone> = { not_sent: "gray", reminder_sent: "purple", confirmed: "green" };

// שיוך מוצע לפי נושא הפנייה
export function suggestedAssignee<T extends { id: string; role: StaffRole; specialty: Category | null }>(
  staff: T[],
  topic: Category | null,
): string | undefined {
  const bySpecialty = topic && topic !== "consult" ? staff.find((s) => s.specialty === topic) : undefined;
  return (bySpecialty ?? staff.find((s) => s.role === "admin") ?? staff[0])?.id;
}
