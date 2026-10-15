import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "@/lib/labels";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const toneClass: Record<Tone, string> = {
  blue: "bg-st-blue-soft text-st-blue",
  green: "bg-st-green-soft text-st-green",
  gray: "bg-st-gray-soft text-st-gray",
  orange: "bg-st-orange-soft text-st-orange",
  red: "bg-st-red-soft text-st-red",
  purple: "bg-st-purple-soft text-st-purple",
  sage: "bg-sage-soft text-sage-ink",
};

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12.5px] font-medium leading-5",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// כפתורים: ראשי, משני ושקט. כולם מתרוממים בריחוף ונלחצים פנימה בלחיצה.
export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-[background,box-shadow,transform,color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 select-none",
  primary: "bg-sage text-white shadow-[0_1px_2px_rgb(30_50_45/0.25)] hover:bg-sage-hover hover:-translate-y-px",
  secondary: "bg-surface text-ink border border-line-strong hover:border-sage/50 hover:bg-sage-soft/40 hover:-translate-y-px",
  ghost: "text-ink-2 hover:bg-panel hover:text-ink",
  danger: "bg-surface text-st-red border border-st-red/30 hover:bg-st-red-soft",
  md: "h-10 px-4 text-[14.5px]",
  sm: "h-8 px-3 text-[13.5px]",
};

export function buttonClass(variant: "primary" | "secondary" | "ghost" | "danger" = "secondary", size: "md" | "sm" = "md") {
  return cn(btn.base, btn[variant], btn[size]);
}

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  children,
  className,
  tour,
}: {
  tour?: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} data-tour={tour} className={cn(buttonClass(variant, size), className)}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-ink">{title}</h1>
        {sub && <p className="mt-1 text-[14.5px] text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClass,
  tour,
}: {
  tour?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section data-tour={tour} className={cn("rounded-2xl border border-line bg-surface shadow-card", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[15.5px] font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-6" : "py-12")}>
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-sage-soft text-sage">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[14px] text-ink-2">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 transition-[border,box-shadow] duration-150 focus:border-sage focus:outline-none focus:ring-3 focus:ring-sage/15 aria-[invalid=true]:border-st-red aria-[invalid=true]:ring-st-red/15";

export const textareaClass = inputClass.replace("h-10", "min-h-20 py-2");

// שדה בגודל התוכן (למסננים בשורה)
export const inlineSelectClass = inputClass.replace("w-full", "w-auto");

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13.5px] font-medium text-ink-2">
      {children}
      {hint && <span className="ms-1 font-normal text-ink-3">{hint}</span>}
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}
