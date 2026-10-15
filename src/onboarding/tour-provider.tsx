"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";
import { completeOnboarding } from "@/lib/actions";
import { ONBOARDING_VERSION, TOUR_STEPS, type TourStep } from "./steps";

type TourApi = { start: () => void };
const TourContext = createContext<TourApi>({ start: () => {} });
export const useTour = () => useContext(TourContext);

const WAIT_MS = 4000;

function isVisible(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
}

function findTarget(step: TourStep): Element | null {
  if (!step.target) return null;
  return [...document.querySelectorAll(`[data-tour="${step.target}"]`)].find(isVisible) ?? null;
}

// מחכה שהרכיב יופיע (אחרי מעבר מסך או טעינה). מחזיר null אם לא הופיע בזמן.
function waitForTarget(step: TourStep, timeout = WAIT_MS): Promise<Element | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const el = findTarget(step);
      if (el) return resolve(el);
      if (Date.now() - started > timeout) return resolve(null);
      setTimeout(tick, 100);
    };
    tick();
  });
}

function onRoute(step: TourStep, pathname: string) {
  if (!step.route) return true;
  return step.match ? step.match(pathname) : pathname === step.route;
}

export function TourProvider({ autoStart, children }: { autoStart: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const drv = useRef<Driver | null>(null);
  const index = useRef(0);
  const busy = useRef(false);
  const autoStarted = useRef(false);
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const listener = useRef((e: KeyboardEvent) => keyRef.current(e)).current;

  const finish = useCallback(() => {
    document.removeEventListener("keydown", listener, true);
    drv.current?.destroy();
    drv.current = null;
    // דילוג או סיום: ההדרכה לא תעלה שוב לבד
    completeOnboarding(ONBOARDING_VERSION).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const show = useCallback(async (target: number, direction: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    try {
      let i = target;
      while (i >= 0 && i < TOUR_STEPS.length) {
        const step = TOUR_STEPS[i];
        if (!onRoute(step, pathRef.current)) {
          router.push(step.route!);
          // מחכים שהמסך יתחלף
          const started = Date.now();
          while (!onRoute(step, pathRef.current) && Date.now() - started < WAIT_MS) {
            await new Promise((r) => setTimeout(r, 80));
          }
        }
        const el = step.target ? await waitForTarget(step) : null;
        const isLast = i === TOUR_STEPS.length - 1;
        if (step.target && !el && !isLast) {
          i += direction; // הרכיב לא קיים אצל המשתמשת הזו: מדלגים
          continue;
        }
        index.current = i;
        render(step, el, i);
        return;
      }
      if (i >= TOUR_STEPS.length) finish();
    } finally {
      busy.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, finish]);

  const visibleCount = TOUR_STEPS.length;

  function render(step: TourStep, el: Element | null, i: number) {
    if (!drv.current) return;
    const isFirst = i === 0;
    const isLast = i === TOUR_STEPS.length - 1;
    drv.current.highlight({
      element: el ?? undefined,
      popover: {
        title: step.title,
        description: step.body,
        side: step.side,
        align: step.align ?? "center",
        showButtons: isFirst ? ["next", "close"] : ["next", "previous", "close"],
        nextBtnText: isFirst ? "בואי נתחיל" : isLast ? "סיום" : "הבא ←",
        prevBtnText: "→ הקודם",
        onNextClick: () => (isLast ? finish() : void show(i + 1, 1)),
        onPrevClick: () => void show(i - 1, -1),
        onCloseClick: () => finish(),
        onPopoverRender: (popover) => {
          const w = popover.wrapper;
          w.setAttribute("dir", "rtl");
          w.setAttribute("role", "dialog");
          w.setAttribute("aria-modal", "true");
          popover.title.id = "tour-title";
          popover.description.id = "tour-desc";
          w.setAttribute("aria-labelledby", "tour-title");
          w.setAttribute("aria-describedby", "tour-desc");
          popover.closeButton.setAttribute("aria-label", "יציאה מההדרכה");
          popover.progress.style.display = isFirst ? "none" : "block";
          popover.progress.textContent = `${i} / ${visibleCount - 1}`;
          if (isFirst) {
            const skip = document.createElement("button");
            skip.type = "button";
            skip.className = "tour-skip";
            skip.textContent = "דילוג";
            skip.onclick = () => finish();
            popover.footerButtons.prepend(skip);
          }
          requestAnimationFrame(() => popover.nextButton.focus());
        },
      },
    });
  }

  // מקלדת מימין לשמאל: חץ שמאלה / Enter = הבא, חץ ימינה = הקודם, Esc = יציאה
  keyRef.current = (e: KeyboardEvent) => {
    if (!drv.current) return;
    const i = index.current;
    if (e.key === "Escape") {
      e.preventDefault();
      finish();
    } else if (e.key === "ArrowLeft" || (e.key === "Enter" && !(e.target instanceof HTMLButtonElement))) {
      e.preventDefault();
      if (i === TOUR_STEPS.length - 1) finish();
      else void show(i + 1, 1);
    } else if (e.key === "ArrowRight" && i > 0) {
      e.preventDefault();
      void show(i - 1, -1);
    }
  };

  const start = useCallback(() => {
    drv.current?.destroy();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    drv.current = driver({
      animate: !reduced,
      smoothScroll: !reduced,
      allowClose: false, // לחיצה על הרקע לא סוגרת בטעות
      allowKeyboardControl: false,
      disableActiveInteraction: true,
      overlayColor: "#1f1a16",
      overlayOpacity: 0.62,
      stagePadding: 6,
      stageRadius: 14,
      popoverClass: "ora-tour",
      popoverOffset: 12,
    });
    document.removeEventListener("keydown", listener, true);
    document.addEventListener("keydown", listener, true);
    void show(0, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    const t = setTimeout(start, 600);
    return () => clearTimeout(t);
  }, [autoStart, start]);

  useEffect(
    () => () => {
      drv.current?.destroy();
      document.removeEventListener("keydown", listener, true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return <TourContext.Provider value={{ start }}>{children}</TourContext.Provider>;
}
