"use client";

import { forwardRef, useImperativeHandle, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import type { ActionResult } from "@/lib/types";
import { cn } from "./ui";

// מריץ פעולת שרת, מציג הודעה קופצת ומרענן את המסך
export function useRunAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  function run(
    fn: () => Promise<ActionResult | void>,
    opts: { success?: string; onOk?: (r: ActionResult & { ok: true }) => void; onError?: (r: ActionResult & { ok: false }) => void } = {},
  ) {
    start(async () => {
      const r = await fn();
      if (!r) return;
      if (r.ok) {
        if (opts.success) toast.success(opts.success);
        opts.onOk?.(r);
        router.refresh();
      } else {
        toast.error(r.error, { duration: 6000 });
        opts.onError?.(r);
      }
    });
  }
  return { run, pending };
}

export type DialogHandle = { open: () => void; close: () => void };

// חלון קופץ על בסיס <dialog>: סוגרים ב-Esc, בלחיצה בחוץ או בכפתור
export const Dialog = forwardRef<DialogHandle, { title: string; children: React.ReactNode; wide?: boolean }>(
  function Dialog({ title, children, wide }, ref) {
    const el = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => ({
      open: () => el.current?.showModal(),
      close: () => el.current?.close(),
    }));
    return (
      <dialog
        ref={el}
        onClick={(e) => e.target === el.current && el.current?.close()}
        className={cn(
          "m-auto w-[calc(100%-24px)] rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop",
          wide ? "max-w-xl" : "max-w-md",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={() => el.current?.close()}
            aria-label="סגירה"
            className="grid size-8 place-items-center rounded-lg text-ink-2 transition hover:bg-panel hover:text-ink active:scale-95"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </dialog>
    );
  },
);
