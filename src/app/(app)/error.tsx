"use client";

import Link from "next/link";
import { CloudOff } from "lucide-react";

// מסך שגיאה בעברית: משהו נכשל בטעינת הנתונים
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-12 text-center shadow-card">
      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-st-red-soft text-st-red">
        <CloudOff size={20} />
      </div>
      <p className="font-semibold">לא הצלחנו לטעון את המסך</p>
      <p className="mx-auto mt-1 max-w-sm text-[14px] text-ink-2">ייתכן שיש בעיית חיבור לרגע. נסי שוב, ואם זה חוזר, חזרי למסך הראשי.</p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center rounded-lg bg-sage px-4 font-medium text-white transition hover:bg-sage-hover active:scale-[0.97] md:h-10">
          לנסות שוב
        </button>
        <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-line-strong px-4 font-medium transition hover:bg-panel md:h-10">
          למסך הראשי
        </Link>
      </div>
    </div>
  );
}
