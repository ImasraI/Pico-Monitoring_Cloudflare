import { useEffect } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useLocation } from "../navigation";
import { Icon } from "./Icon";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () =>
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

type Tracked = { el: HTMLElement; top: number; height: number };

/* ---------------------------------------------------------------------------
   One scroll runtime drives every scroll-linked effect. Layout is measured only
   on resize, on route change and after late content settles, so the scroll path
   itself reads nothing from the DOM and writes only custom properties. Slow
   motion is produced by CSS transitions on those properties, not by JS loops.
   --------------------------------------------------------------------------- */
export function ScrollRuntime() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const still = reducedMotion();
    let queued = 0;
    let parallax: (Tracked & { strength: number })[] = [];
    let rails: Tracked[] = [];
    let steps: Tracked[] = [];
    let spy: { link: HTMLAnchorElement; top: number }[] = [];
    let docHeight = 0;
    let activeSteps = -1;
    let activeSpy = "";

    const collect = (selector: string): Tracked[] => {
      const y = window.scrollY;
      return [...document.querySelectorAll<HTMLElement>(selector)].map((el) => {
        const rect = el.getBoundingClientRect();
        return { el, top: rect.top + y, height: rect.height };
      });
    };

    const measure = () => {
      parallax = still
        ? []
        : [...document.querySelectorAll<HTMLElement>("[data-parallax]")].map(
            (el) => {
              const rect = el.getBoundingClientRect();
              return {
                el,
                top: rect.top + window.scrollY,
                height: rect.height,
                strength: Number(el.dataset.parallax) || 0.1,
              };
            },
          );
      /* A rail fills across its whole step grid, not across its own 2px height,
         so the line tracks reading progress through the section. */
      rails = collect("[data-rail]").map((rail) => {
        const items = [
          ...(rail.el.closest("section")?.querySelectorAll<HTMLElement>("[data-step]") ?? []),
        ];
        const last = items[items.length - 1];
        if (!last) return rail;
        const bottom = last.getBoundingClientRect().bottom + window.scrollY;
        return { el: rail.el, top: rail.top, height: Math.max(160, bottom - rail.top) };
      });
      steps = collect("[data-step]");
      const nav = document.querySelector<HTMLElement>("[data-scrollspy]");
      spy = nav
        ? [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
            .map((link) => {
              const id = decodeURIComponent(link.hash.slice(1));
              const target = document.getElementById(id);
              if (!target) return null;
              return {
                link,
                top: target.getBoundingClientRect().top + window.scrollY,
              };
            })
            .filter((item): item is { link: HTMLAnchorElement; top: number } =>
              Boolean(item),
            )
        : [];
      docHeight = root.scrollHeight;
    };

    const tick = () => {
      queued = 0;
      const vh = window.innerHeight;
      const y = window.scrollY || 0;
      root.style.setProperty(
        "--pm-progress",
        clamp(y / Math.max(1, docHeight - vh)).toFixed(4),
      );
      if (y > 6) root.setAttribute("data-scrolled", "");
      else root.removeAttribute("data-scrolled");

      for (const item of parallax) {
        const distance = item.top + item.height / 2 - (y + vh / 2);
        item.el.style.setProperty(
          "--pm-shift",
          `${clamp(distance * -item.strength, -160, 160).toFixed(2)}px`,
        );
      }
      for (const rail of rails) {
        rail.el.style.setProperty(
          "--pm-value",
          clamp((y + vh - rail.top) / (rail.height + vh * 0.4)).toFixed(
            4,
          ),
        );
      }

      let passed = 0;
      for (const step of steps) if (step.top < y + vh * 0.74) passed++;
      if (passed !== activeSteps) {
        activeSteps = passed;
        steps.forEach((step, index) =>
          step.el.classList.toggle("is-active", index < passed),
        );
      }

      if (spy.length) {
        const marker = y + vh * 0.32;
        let current = "";
        for (const item of spy) if (item.top <= marker) current = item.link.hash;
        if (current !== activeSpy) {
          activeSpy = current;
          spy.forEach((item) => {
            if (item.link.hash === current)
              item.link.setAttribute("aria-current", "true");
            else item.link.removeAttribute("aria-current");
          });
        }
      }

      const top = document.querySelector<HTMLElement>(".pm-top");
      if (top) {
        if (y > vh * 0.9) top.setAttribute("data-visible", "");
        else top.removeAttribute("data-visible");
      }
    };

    const schedule = () => {
      if (!queued) queued = requestAnimationFrame(tick);
    };
    const remeasure = () => {
      measure();
      schedule();
    };

    measure();
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    const settle = [
      window.setTimeout(remeasure, 120),
      window.setTimeout(remeasure, 900),
    ];
    /* Re-measure only when the document really changed height, which keeps the
       observer from chasing its own CSS variable writes. */
    let lastHeight = document.body.scrollHeight;
    const shy = new ResizeObserver(() => {
      const height = document.body.scrollHeight;
      if (Math.abs(height - lastHeight) < 8) return;
      lastHeight = height;
      remeasure();
    });
    shy.observe(document.body);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
      settle.forEach(window.clearTimeout);
      shy.disconnect();
      if (queued) cancelAnimationFrame(queued);
      root.style.removeProperty("--pm-progress");
      root.removeAttribute("data-scrolled");
    };
  }, [pathname]);

  return null;
}

/* Tilt, spotlight and magnetic pull: one pointer listener, fine pointers only. */
export function PointerRuntime() {
  useEffect(() => {
    if (!finePointer() || reducedMotion()) return;
    let queued = 0;
    let event: PointerEvent | null = null;
    let active: HTMLElement | null = null;
    let activeMagnet: HTMLElement | null = null;

    const reset = () => {
      if (active) {
        active.style.removeProperty("--mx");
        active.style.removeProperty("--my");
        active.style.removeProperty("--rx");
        active.style.removeProperty("--ry");
        active = null;
      }
      if (activeMagnet) {
        activeMagnet.style.removeProperty("--pull-x");
        activeMagnet.style.removeProperty("--pull-y");
        activeMagnet = null;
      }
    };

    const apply = () => {
      queued = 0;
      if (!event) return;
      const target = event.target as Element | null;
      const interactive = target?.closest?.(
        "[data-spotlight], [data-tilt], [data-magnetic]",
      ) as HTMLElement | null;
      if (!interactive) {
        reset();
        return;
      }
      if (interactive !== active) {
        reset();
        active = interactive;
      }
      const rect = interactive.getBoundingClientRect();
      const x = clamp((event.clientX - rect.left) / Math.max(1, rect.width));
      const y = clamp((event.clientY - rect.top) / Math.max(1, rect.height));
      if (interactive.hasAttribute("data-spotlight")) {
        interactive.style.setProperty("--mx", `${(x * 100).toFixed(2)}%`);
        interactive.style.setProperty("--my", `${(y * 100).toFixed(2)}%`);
      }
      if (interactive.hasAttribute("data-tilt")) {
        interactive.style.setProperty("--ry", `${((x - 0.5) * 5).toFixed(3)}deg`);
        interactive.style.setProperty("--rx", `${((0.5 - y) * 5).toFixed(3)}deg`);
      }
      const magnet = target?.closest?.("[data-magnetic]") as HTMLElement | null;
      if (magnet) {
        const box = magnet.getBoundingClientRect();
        activeMagnet = magnet;
        magnet.style.setProperty(
          "--pull-x",
          (((event.clientX - (box.left + box.width / 2)) / box.width) * 9).toFixed(
            2,
          ) + "px",
        );
        magnet.style.setProperty(
          "--pull-y",
          (
            ((event.clientY - (box.top + box.height / 2)) /
              box.height) *
            9
          ).toFixed(2) + "px",
        );
      }
    };

    const onMove = (motion: PointerEvent) => {
      event = motion;
      if (!queued) queued = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", reset, { passive: true });
    window.addEventListener("blur", reset);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      if (queued) cancelAnimationFrame(queued);
      reset();
    };
  }, []);

  return null;
}

export function ScrollProgress() {
  return <div className="pm-progress" aria-hidden="true" />;
}

export function RouteVeil() {
  return <div className="pm-route-veil" aria-hidden="true" />;
}

export function BackToTop() {
  const scrollUp = () => {
    const start = window.scrollY;
    if (start <= 0) return;
    if (reducedMotion()) {
      window.scrollTo(0, 0);
      return;
    }
    const from = performance.now();
    const duration = Math.min(900, 320 + start * 0.25);
    const step = (now: number) => {
      const progress = Math.min(1, (now - from) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, Math.round(start * (1 - eased)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  return (
    <button
      type="button"
      className="pm-top"
      onClick={scrollUp}
      aria-label="بازگشت به بالای صفحه"
    >
      <Icon name="arrow" size={19} style={{ transform: "rotate(90deg)" }} />
    </button>
  );
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function ThemeToggle() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const stored = () => {
      try {
        return localStorage.getItem("pm-theme");
      } catch {
        return null;
      }
    };
    const sync = () => {
      root.setAttribute("data-theme", stored() || (media.matches ? "dark" : "light"));
      document
        .querySelectorAll("[data-theme-toggle]")
        .forEach((el) =>
          el.setAttribute("aria-pressed", String(root.dataset.theme === "dark")),
        );
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const toggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => {
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("pm-theme", next);
      } catch {
        /* Storage may be unavailable; the choice then lasts for this visit. */
      }
      document
        .querySelectorAll("[data-theme-toggle]")
        .forEach((el) => el.setAttribute("aria-pressed", String(next === "dark")));
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta)
        meta.setAttribute("content", next === "dark" ? "#0c2127" : "#009fa8");
    };
    const doc = document as ViewTransitionDocument;
    if (doc.startViewTransition && !reducedMotion()) {
      const rect = event.currentTarget.getBoundingClientRect();
      root.style.setProperty("--pm-vt-x", `${rect.left + rect.width / 2}px`);
      root.style.setProperty("--pm-vt-y", `${rect.top + rect.height / 2}px`);
      root.style.setProperty(
        "--pm-vt-radius",
        `${Math.hypot(
          Math.max(rect.left, window.innerWidth - rect.right),
          Math.max(rect.top, window.innerHeight - rect.bottom),
        )}px`,
      );
      doc.startViewTransition(apply);
      return;
    }
    root.classList.add("theme-switching");
    apply();
    window.setTimeout(() => root.classList.remove("theme-switching"), 520);
  };

  return (
    <button
      type="button"
      className="pm-theme"
      data-theme-toggle
      onClick={toggle}
      aria-label="تغییر حالت روشن و تیره"
      title="حالت روشن / تیره"
    >
      <span className="pm-theme-sun" aria-hidden="true">
        <Icon name="sun" size={18} />
      </span>
      <span className="pm-theme-moon" aria-hidden="true">
        <Icon name="moon" size={18} />
      </span>
      <span className="pm-theme-hint" aria-hidden="true">
        حالت روشن / تیره
      </span>
    </button>
  );
}
