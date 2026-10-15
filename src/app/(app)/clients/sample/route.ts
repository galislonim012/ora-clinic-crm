import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// כרטיס לקוחה לדוגמה להדרכה: מיכל לוי (התראה רפואית וסדרה), ואם אינה קיימת - הלקוחה הראשונה
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: preferred } = await supabase.from("clients").select("id").eq("phone", "0541234567").maybeSingle();
  const { data: first } = preferred ? { data: null } : await supabase.from("clients").select("id").order("full_name").limit(1).maybeSingle();
  const id = preferred?.id ?? first?.id;
  return NextResponse.redirect(new URL(id ? `/clients/${id}` : "/clients", request.url));
}
