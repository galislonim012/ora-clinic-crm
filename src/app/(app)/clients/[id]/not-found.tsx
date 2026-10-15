import { UserX } from "lucide-react";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-line bg-surface shadow-card">
      <EmptyState icon={UserX} title="הלקוחה לא נמצאה" text="ייתכן שהיא נמחקה. אפשר לחפש אותה לפי טלפון." action={<ButtonLink href="/clients">לרשימת הלקוחות</ButtonLink>} />
    </div>
  );
}
