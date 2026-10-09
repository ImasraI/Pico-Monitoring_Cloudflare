import { useEffect } from "react";
import { useLocation } from "../navigation";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Counts up to the value that is already rendered server-side, so search engines
   and readers without scripting always see the final number. */
function countUp(el: HTMLElement) {
  const target = Number(el.dataset.counter);
  if (!Number.isFinite(target)) return;
  const suffix = el.dataset.counterSuffix || "";
  const format = (value: number) =>
    `${value.toLocaleString("fa-IR", { useGrouping: false })}${suffix}`;
  const duration = Number(el.dataset.counterDuration) || 1100;
  const started = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 4);
    el.textContent = format(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = format(target);
  };
  el.textContent = format(0);
  requestAnimationFrame(step);
}

/* Real loading states for the replaceable photography: a shimmer placeholder
   while decoding, then a soft fade-in. */
function watchImages() {
  document
    .querySelectorAll<HTMLImageElement>(
      ".visual.supplied img, .asset-placeholder img",
    )
    .forEach((img) => {
      const frame = img.closest<HTMLElement>(".visual, .asset-placeholder");
      const done = () => {
        img.setAttribute("data-loaded", "");
        frame?.removeAttribute("data-loading");
      };
      if (img.complete && img.naturalWidth > 0) {
        done();
        return;
      }
      frame?.setAttribute("data-loading", "");
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
}

export function Reveal() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const prefersReduced = reducedMotion();
    if (prefersReduced || !("IntersectionObserver" in window)) {
      /* Keep the page fully visible for readers who asked for stillness. */
      root.classList.remove("has-js");
      return;
    }

    document
      .querySelectorAll<HTMLElement>("[data-reveal-group]")
      .forEach((group) => {
        const step = Number(group.dataset.revealGroup) || 90;
        group
          .querySelectorAll<HTMLElement>(":scope > [data-reveal]")
          .forEach((item, index) => {
            item.style.setProperty(
              "--reveal-delay",
              `${Math.min(index * step, 700)}ms`,
            );
          });
      });

    const counted = new WeakSet<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          /* A transient layout collapse (window resize, sheet opening, route
             swap) can report a stale intersection. Confirm against the live box
             and keep observing when the element is in fact still off screen. */
          const rect = target.getBoundingClientRect();
          if (
            rect.top > window.innerHeight + 140 ||
            rect.bottom < -140
          )
            continue;
          if (target.dataset.reveal !== undefined)
            target.dataset.revealState = "in";
          if (target.dataset.counter !== undefined && !counted.has(target)) {
            counted.add(target);
            countUp(target);
          }
          observer.unobserve(target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.14 },
    );

    const observed = [
      ...document.querySelectorAll<HTMLElement>("[data-reveal]"),
      ...document.querySelectorAll<HTMLElement>("[data-counter]"),
    ];
    observed.forEach((el) => observer.observe(el));
    // Filtering can mount new cards after the initial observation pass.
    const known = new WeakSet(observed);
    const additions = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          const elements = [...node.querySelectorAll<HTMLElement>("[data-reveal], [data-counter]")];
          if (node.matches("[data-reveal], [data-counter]")) elements.push(node);
          for (const el of elements) {
            if (known.has(el)) continue;
            known.add(el);
            observer.observe(el);
          }
        }
      }
    });
    additions.observe(document.getElementById("main") ?? document.body, { childList: true, subtree: true });
    root.classList.add("has-js");
    watchImages();

    /* Late layout shifts (fonts, images) can leave an element inside the viewport
       without ever triggering an intersection change; re-check once. */
    const recheck = window.setTimeout(() => {
      observed.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          if (el.dataset.reveal !== undefined) el.dataset.revealState = "in";
          if (el.dataset.counter !== undefined && !counted.has(el)) {
            counted.add(el);
            countUp(el);
          }
          observer.unobserve(el);
        }
      });
    }, 1400);

    return () => {
      window.clearTimeout(recheck);
      observer.disconnect();
      additions.disconnect();
      root.classList.remove("has-js");
    };
  }, [pathname]);

  return null;
}
