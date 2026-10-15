"use client";

import { useActionState, useState, useTransition } from "react";
import { ShieldCheck, LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { demoLogin, passwordLogin } from "@/lib/actions";
import { buttonClass, inputClass, Label, cn } from "@/components/ui";

export function LoginForms({ next }: { next?: string }) {
  const [demoPending, startDemo] = useTransition();
  const [state, formAction, pending] = useActionState(passwordLogin, null);
  const [showStaff, setShowStaff] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="mb-1 font-semibold">כניסה להדגמה</p>
        <p className="mb-4 text-[14px] text-ink-2">נכנסים כרותם, מנהלת הקליניקה, ורואים את המסכים של כל הצוות. בלי סיסמה.</p>
        <button
          type="button"
          disabled={demoPending}
          onClick={() =>
            startDemo(async () => {
              const r = await demoLogin(next);
              if (r && !r.ok) toast.error(r.error);
            })
          }
          className={cn(buttonClass("primary"), "h-12 w-full text-[16px]")}
        >
          {demoPending ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          כניסה כבודק (מנהלת)
        </button>
      </div>

      {!showStaff ? (
        <button type="button" onClick={() => setShowStaff(true)} className="mx-auto block text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
          כניסת צוות עם מייל וסיסמה
        </button>
      ) : (
        <form action={formAction} className="animate-rise space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-card">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <Label htmlFor="email">מייל</Label>
            <input id="email" name="email" type="email" required autoComplete="username" dir="ltr" className={inputClass} />
          </div>
          <div>
            <Label htmlFor="password">סיסמה</Label>
            <input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" className={inputClass} />
          </div>
          {state && !state.ok && (
            <p role="alert" className="text-[14px] text-st-red">
              {state.error}
            </p>
          )}
          <button disabled={pending} className={cn(buttonClass("secondary"), "w-full")}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            כניסה
          </button>
        </form>
      )}
    </div>
  );
}
