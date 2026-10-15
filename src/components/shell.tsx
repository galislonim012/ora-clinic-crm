"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Home, Users, CalendarDays, MessagesSquare, Settings2, Search, LogOut, UserPlus, Eye } from "lucide-react";
import { logout, searchClients, setViewAs } from "@/lib/actions";
import { formatPhone, normalizePhone } from "@/lib/format";
import { roleLabel } from "@/lib/labels";
import type { Staff } from "@/lib/types";
import { cn } from "./ui";

const NAV = [
  { href: "/", label: "ראשי", icon: Home },
  { href: "/clients", label: "לקוחות", icon: Users },
  { href: "/appointments", label: "תורים", icon: CalendarDays },
  { href: "/calls", label: "קריאות", icon: MessagesSquare },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Shell({
  me,
  staff,
  isAdmin,
  viewAs,
  openCallsForMe,
  children,
}: {
  me: Staff;
  staff: Staff[];
  isAdmin: boolean;
  viewAs: string;
  openCallsForMe: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = isAdmin ? [...NAV, { href: "/team", label: "צוות", icon: Settings2 }] : NAV;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* סרגל צד במחשב */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line bg-panel px-3 py-5 md:flex">
        <Link href="/" className="mb-7 flex items-center gap-2.5 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-sage text-[17px] font-bold text-white">א</span>
          <span className="leading-tight">
            <span className="block font-bold">קליניקת אורה</span>
            <span className="block text-[12.5px] text-ink-2">ניהול לקוחות</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-0.5" aria-label="ניווט ראשי">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] font-medium transition-colors duration-150",
                  active ? "bg-surface text-sage-ink shadow-card" : "text-ink-2 hover:bg-surface/60 hover:text-ink",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                <span className="flex-1">{label}</span>
                {href === "/calls" && openCallsForMe > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-st-orange px-1.5 text-[11.5px] font-semibold text-white">
                    {openCallsForMe}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-2 px-2">
            <p className="text-[14px] font-semibold">{me.full_name}</p>
            <p className="text-[12.5px] text-ink-2">{roleLabel[me.role]}</p>
          </div>
          <form action={logout}>
            <button className="flex h-9 w-full items-center gap-2 rounded-lg px-2 text-[14px] text-ink-2 transition hover:bg-surface/60 hover:text-ink">
              <LogOut size={16} /> יציאה
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {/* סרגל עליון: חיפוש לפי טלפון זמין מכל מסך */}
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:px-8">
            <Link href="/" className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage font-bold text-white md:hidden" aria-label="מסך ראשי">
              א
            </Link>
            <PhoneSearch />
            {isAdmin && <ViewAsSelect staff={staff} viewAs={viewAs} />}
            <form action={logout} className="-me-2 md:hidden">
              <button aria-label="יציאה" className="grid size-10 place-items-center rounded-lg text-ink-2 hover:bg-panel">
                <LogOut size={18} />
              </button>
            </form>
          </div>
          {isAdmin && viewAs !== "all" && (
            <div className="bg-nude-soft px-4 py-1.5 text-center text-[13px] text-nude-ink">
              צופה במסכים בתור <b>{staff.find((s) => s.id === viewAs)?.full_name}</b>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12">{children}</main>
      </div>

      {/* סרגל תחתון בטלפון */}
      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11.5px] font-medium transition active:scale-95", active ? "text-sage" : "text-ink-2")}
            >
              <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {href === "/calls" && openCallsForMe > 0 && (
                <span className="absolute top-2.5 start-[calc(50%+6px)] grid h-4.5 min-w-4.5 place-items-center rounded-full bg-st-orange px-1 text-[10.5px] font-semibold text-white">
                  {openCallsForMe}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function ViewAsSelect({ staff, viewAs }: { staff: Staff[]; viewAs: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="relative flex shrink-0 items-center">
      <span className="sr-only">צפייה בתור</span>
      <Eye size={16} className="pointer-events-none absolute start-2.5 text-ink-2" />
      <select
        value={viewAs}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            await setViewAs(e.target.value);
            router.refresh();
          })
        }
        className="h-10 w-[104px] rounded-lg border border-line-strong bg-surface ps-8 pe-1 text-[13.5px] text-ink transition hover:border-sage/50 disabled:opacity-60 sm:w-auto sm:pe-3 sm:text-[14px]"
      >
        <option value="all">כולן</option>
        {staff
          .filter((s) => s.is_active)
          .map((s) => (
            <option key={s.id} value={s.id}>
              בתור {s.full_name.split(" ")[0]}
            </option>
          ))}
      </select>
    </label>
  );
}

function PhoneSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string; phone: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const r = await searchClients(term);
      if (id === reqId.current) setResults(r);
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const digits = normalizePhone(q);
  const looksLikePhone = digits.length >= 9;

  function go(href: string) {
    setOpen(false);
    setQ("");
    router.push(href);
  }

  return (
    <div ref={box} className="relative min-w-0 flex-1 md:max-w-md">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && results[active]) return go(`/clients/${results[active].id}`);
          if (results.length === 1) return go(`/clients/${results[0].id}`);
          if (q.trim()) go(`/clients?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-2" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
            if (e.key === "Escape") setOpen(false);
          }}
          inputMode="search"
          placeholder="טלפון או שם"
          aria-label="חיפוש לקוחה לפי טלפון או שם"
          className="h-10 w-full rounded-xl border border-line-strong bg-surface ps-9 pe-3 text-[15px] placeholder:text-ink-3 transition focus:border-sage focus:outline-none focus:ring-3 focus:ring-sage/15"
        />
      </form>
      {open && q.trim().length >= 2 && (
        <div className="animate-rise absolute inset-x-0 top-12 z-40 overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(`/clients/${r.id}`)}
              className={cn("flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start text-[14.5px]", i === active && "bg-sage-soft/60")}
            >
              <span className="font-medium">{r.full_name}</span>
              <span className="ltr text-ink-2">{formatPhone(r.phone)}</span>
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-3 text-[14px] text-ink-2">
              {looksLikePhone ? (
                <>
                  <p className="mb-2">
                    לא מצאנו לקוחה עם המספר <span className="ltr">{formatPhone(digits)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => go(`/clients/new?phone=${digits}`)}
                    className="inline-flex items-center gap-1.5 font-medium text-sage hover:underline"
                  >
                    <UserPlus size={16} /> ליצור לקוחה חדשה עם המספר הזה
                  </button>
                </>
              ) : (
                "לא נמצאו תוצאות"
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
