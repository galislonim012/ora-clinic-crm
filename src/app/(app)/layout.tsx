import { Shell } from "@/components/shell";
import { getSession } from "@/lib/session";
import { TourProvider } from "@/onboarding/tour-provider";
import { ONBOARDING_VERSION } from "@/onboarding/steps";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, me, staff, isAdmin, viewAs, ui } = await getSession();
  const { count } = await supabase
    .from("service_calls")
    .select("id", { count: "exact", head: true })
    .eq("assignee_id", me.id)
    .eq("status", "new");

  return (
    <TourProvider autoStart={(me.onboarding_version ?? 0) < ONBOARDING_VERSION}>
      <Shell me={me} staff={staff} isAdmin={isAdmin} showTeam={ui.isAdmin} viewAs={viewAs} openCallsForMe={count ?? 0}>
        {children}
      </Shell>
    </TourProvider>
  );
}
