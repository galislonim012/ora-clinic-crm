import { Shell } from "@/components/shell";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, me, staff, isAdmin, viewAs } = await getSession();
  const { count } = await supabase
    .from("service_calls")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", me.id)
    .eq("status", "new");

  return (
    <Shell me={me} staff={staff} isAdmin={isAdmin} viewAs={viewAs} openCallsForMe={count ?? 0}>
      {children}
    </Shell>
  );
}
