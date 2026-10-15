import { getSession, staffName } from "./session";
import { conditionLabel } from "./labels";
import type { Appointment, ServiceCall, TreatmentType } from "./types";
import type { ApptView } from "@/components/appointments";
import type { CallView } from "@/components/calls";

type ApptFilter = {
  from?: string;
  to?: string;
  clientId?: string;
  staffId?: string;
  status?: Appointment["status"][];
  order?: "asc" | "desc";
  limit?: number;
};

export async function loadTypes(): Promise<TreatmentType[]> {
  const { supabase } = await getSession();
  const { data, error } = await supabase.from("treatment_types").select("*").order("duration_min");
  if (error) throw new Error("LOAD_FAILED");
  return (data ?? []) as TreatmentType[];
}

// תורים כולל שם לקוחה, טיפול, מטפלת והתראות רפואיות (התראות רק למטפלות)
export async function loadAppointments(f: ApptFilter = {}) {
  const { supabase, staff, ui } = await getSession();
  let q = supabase
    .from("appointments")
    .select("*, created_by, clients(full_name, phone), treatment_types(name, contraindications)")
    .order("starts_at", { ascending: f.order !== "desc" });
  if (f.from) q = q.gte("starts_at", f.from);
  if (f.to) q = q.lt("starts_at", f.to);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  if (f.staffId) q = q.eq("staff_id", f.staffId);
  if (f.status) q = q.in("status", f.status);
  if (f.limit) q = q.limit(f.limit);
  const { data, error } = await q;
  if (error) throw new Error("LOAD_FAILED"); // מוצג במסך השגיאה, לא כ"אין תורים"
  const rows = (data ?? []) as (Appointment & {
    created_by: string | null;
    clients: { full_name: string; phone: string } | null;
    treatment_types: { name: string; contraindications: string[] } | null;
  })[];

  const medical = new Map<string, string[]>();
  if (ui.isClinician && rows.length) {
    const ids = [...new Set(rows.map((r) => r.client_id))];
    const { data: med } = await supabase.from("medical_profiles").select("client_id, conditions").in("client_id", ids);
    med?.forEach((m) => medical.set(m.client_id, m.conditions ?? []));
  }

  return rows.map((r) => {
    const conditions = medical.get(r.client_id) ?? [];
    const clash = conditions.filter((c) => r.treatment_types?.contraindications.includes(c));
    const view: ApptView = {
      ...r,
      client_name: r.clients?.full_name ?? "-",
      client_phone: r.clients?.phone ?? "",
      type_name: r.treatment_types?.name ?? "-",
      staff_name: staffName(staff, r.staff_id),
      medical_alert: clash.map((c) => conditionLabel[c] ?? c),
    };
    // אותו כלל כמו ב-RLS, לפי המשתמשת שבתור מוצגים המסכים
    const canEdit = ui.isAdmin || ui.role === "reception" || r.staff_id === ui.id || r.created_by === ui.id;
    return { view, canEdit };
  });
}

export async function loadCalls(f: { clientId?: string; assigneeId?: string; open?: boolean } = {}) {
  const { supabase, staff, ui } = await getSession();
  let q = supabase.from("service_calls").select("*, clients(full_name, phone)").order("created_at", { ascending: true });
  if (f.clientId) q = q.eq("client_id", f.clientId);
  if (f.assigneeId) q = q.eq("assignee_id", f.assigneeId);
  if (f.open) q = q.neq("status", "closed");
  const { data, error } = await q;
  if (error) throw new Error("LOAD_FAILED");
  return ((data ?? []) as (ServiceCall & { clients: { full_name: string; phone: string } | null })[]).map((c) => {
    const view: CallView = {
      ...c,
      client_name: c.clients?.full_name ?? "-",
      client_phone: c.clients?.phone ?? "",
      assignee_name: staffName(staff, c.assignee_id),
    };
    return { view, canEdit: ui.isAdmin || c.assignee_id === ui.id };
  });
}
