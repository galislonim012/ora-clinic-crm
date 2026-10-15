import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { PageHeader, Panel } from "@/components/ui";

export const metadata = { title: "לקוחה חדשה" };

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  const { phone } = await searchParams;
  return (
    <div className="animate-rise mx-auto max-w-2xl">
      <Link href="/clients" className="mb-3 inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink">
        <ChevronRight size={16} /> לקוחות
      </Link>
      <PageHeader title="לקוחה חדשה" sub="אם המספר כבר קיים במערכת, נעבור לכרטיס הקיים במקום ליצור כפילות." />
      <Panel>
        <ClientForm initialPhone={phone} />
      </Panel>
    </div>
  );
}
