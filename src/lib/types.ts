export type StaffRole = "admin" | "therapist" | "reception";
export type Category = "face" | "injection" | "laser" | "consult";
export type ClientSource = "instagram" | "facebook" | "website" | "referral" | "other";
export type ApptStatus = "future" | "done" | "cancelled";
export type CancelReason = "client" | "clinic" | "no_show";
export type Confirmation = "not_sent" | "reminder_sent" | "confirmed";
export type CallStatus = "new" | "in_progress" | "closed";
export type CallChannel = "instagram" | "facebook" | "whatsapp" | "website" | "phone" | "walk_in" | "ai_agent";

export type Staff = {
  id: string;
  full_name: string;
  role: StaffRole;
  specialty: Category | null;
  is_active: boolean;
};

export type Client = {
  id: string;
  full_name: string;
  phone: string;
  source: ClientSource | null;
  notes: string | null;
  no_show_count: number;
  created_at: string;
};

export type TreatmentType = {
  id: string;
  name: string;
  duration_min: number;
  category: Category;
  renewal_days: number | null;
  contraindications: string[];
  is_active: boolean;
};

export type Appointment = {
  id: string;
  client_id: string;
  treatment_type_id: string;
  staff_id: string;
  starts_at: string;
  ends_at: string;
  status: ApptStatus;
  cancel_reason: CancelReason | null;
  summary: string | null;
  confirmation: Confirmation;
  package_id: string | null;
};

export type ServiceCall = {
  id: string;
  client_id: string;
  description: string;
  topic: Category | null;
  status: CallStatus;
  assignee_id: string;
  channel: CallChannel | null;
  resolution: string | null;
  first_response_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type MedicalProfile = {
  client_id: string;
  declaration_signed_at: string | null;
  conditions: string[];
  allergies: string | null;
  medications: string | null;
  updated_at: string;
};

export type TreatmentPackage = {
  id: string;
  client_id: string;
  treatment_type_id: string;
  total_sessions: number;
  used_sessions: number;
  status: "active" | "completed";
  created_at: string;
};

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; existingId?: string };
