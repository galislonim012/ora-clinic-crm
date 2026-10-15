"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { searchClients } from "@/lib/actions";
import { formatPhone, normalizePhone } from "@/lib/format";
import { cn, inputClass } from "./ui";

export type PickedClient = { id: string; full_name: string; phone: string };

// בחירת לקוחה בתוך טופס, לפי טלפון או שם
export function ClientPicker({ value, onChange }: { value: PickedClient | null; onChange: (c: PickedClient | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedClient[]>([]);
  const req = useRef(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const id = ++req.current;
    const t = setTimeout(async () => {
      const r = await searchClients(q);
      if (id === req.current) setResults(r);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    return (
      <div className="flex h-10 items-center justify-between rounded-lg border border-sage/40 bg-sage-soft/50 px-3">
        <span>
          <b className="font-semibold">{value.full_name}</b> <span className="ltr text-ink-2">{formatPhone(value.phone)}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="החלפת לקוחה" className="grid size-7 place-items-center rounded-md text-ink-2 hover:bg-surface">
          <X size={16} />
        </button>
      </div>
    );
  }

  const digits = normalizePhone(q);
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-2" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="טלפון או שם הלקוחה"
        inputMode="search"
        className={cn(inputClass, "ps-9")}
        aria-label="חיפוש לקוחה"
      />
      {q.trim().length >= 2 && (
        <div className="mt-1 overflow-hidden rounded-lg border border-line bg-surface">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r)}
              className="flex w-full justify-between px-3 py-2 text-start text-[14.5px] hover:bg-sage-soft/50"
            >
              <span>{r.full_name}</span>
              <span className="ltr text-ink-2">{formatPhone(r.phone)}</span>
            </button>
          ))}
          {results.length === 0 && (
            <p className="px-3 py-2 text-[14px] text-ink-2">
              לא נמצאה לקוחה.{" "}
              <Link href={`/clients/new${digits.length >= 9 ? `?phone=${digits}` : ""}`} className="font-medium text-sage underline-offset-4 hover:underline">
                ליצירת לקוחה חדשה
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
