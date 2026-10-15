import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Staff } from "./types";

export const VIEW_AS_COOKIE = "ora_view_as";

// המשתמשת המחוברת והרשומה שלה בטבלת הצוות. מי שלא בצוות לא נכנסת.
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffList } = await supabase
    .from("staff")
    .select("id, full_name, role, specialty, is_active, onboarding_version")
    .order("created_at");
  const staff = (staffList ?? []) as Staff[];
  const me = staff.find((s) => s.id === user.id);
  if (!me || !me.is_active) {
    await supabase.auth.signOut({ scope: "local" });
    redirect("/login?error=not_staff");
  }

  const isAdmin = me.role === "admin";
  const store = await cookies();
  const raw = store.get(VIEW_AS_COOKIE)?.value ?? "all";
  // מנהלת יכולה לצפות בתור כל אחת. מטפלת תמיד רואה את עצמה כברירת מחדל.
  const viewAs = isAdmin ? (raw === "all" || staff.some((s) => s.id === raw) ? raw : "all") : "all";

  // "צפייה בתור": המסכים מוצגים בהרשאות של המטפלת שנבחרה (רק תצוגה, השרת עדיין מזהה את המנהלת)
  const viewer = isAdmin && viewAs !== "all" ? staff.find((s) => s.id === viewAs) ?? me : me;
  const ui = {
    id: viewer.id,
    role: viewer.role,
    isAdmin: viewer.role === "admin",
    isClinician: viewer.role !== "reception",
  };

  return { supabase, me, staff, isAdmin, isClinician: me.role !== "reception", viewAs, ui };
});

export function staffName(staff: Staff[], id: string | null | undefined) {
  return staff.find((s) => s.id === id)?.full_name ?? "-";
}

export function firstName(fullName: string) {
  return fullName.split(" ")[0];
}
