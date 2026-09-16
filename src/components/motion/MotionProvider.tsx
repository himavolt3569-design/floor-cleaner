"use client";

import { useEffect } from "react";
import { useUi } from "@/lib/store/ui";

/**
 * The single motion controller for the storefront.
 *
 * Sections stay server components and simply mark elements with data
 * attributes; this client component is the only thing that loads GSAP and
 * Lenis. Everything it does is enhancement: with JS disabled, or with
 * prefers-reduced-motion set, the page is already in its final state because
 * the hidden-start styles are scoped to `.js` in globals.css.
 *
 * Contract:
 *   data-reveal="fade-up" | "fade" | "mask"   element animates in on scroll
 *   data-reveal-delay="0.08"                  extra delay in seconds
 *   data-hero-step="1".."6"                   ordered hero entrance
 *   data-hero-product                         drifts as the hero scrolls away
 *   data-parallax="0.04"                      pointer parallax strength
 */
export function MotionProvider() {
  useEffect(() => {
    const revealEverything = () =>
      document
        .querySelectorAll<HTMLElement>("[data-reveal]")
        .forEach((el) => el.classList.add("is-revealed"));

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced) {
      revealEverything();
      return;
    }

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let tookOver = false;

    /**
     * Safety net. The reveal styles hide content until GSAP animates it in, so
     * a failed chunk load, a blocked CDN or a slow network must not leave the
     * page permanently blank. If the libraries have not taken over shortly
     * after mount, show everything.
     */
    const watchdog = window.setTimeout(() => {
      if (!tookOver) revealEverything();
    }, 2000);

    (async () => {
      let modules;
      try {
        modules = await Promise.all([
          import("gsap"),
          import("gsap/ScrollTrigger"),
          import("lenis"),
        ]);
      } catch {
        revealEverything();
        return;
      }

      const [{ gsap }, { ScrollTrigger }, LenisModule] = modules;
      if (cancelled) return;
      tookOver = true;
      window.clearTimeout(watchdog);

      const Lenis = LenisModule.default;
      gsap.registerPlugin(ScrollTrigger);

      /* ---------------------------------------------------- smooth scroll */
      const lenis = new Lenis({
        lerp: 0.11,
        wheelMultiplier: 1,
        // Native scrolling on touch: hijacking it there feels broken.
        smoothWheel: true,
        syncTouch: false,
      });

      const syncOverlay = () => {
        if (useUi.getState().surface) lenis.stop();
        else lenis.start();
      };
      syncOverlay();
      const unsubscribeOverlay = useUi.subscribe(syncOverlay);

      lenis.on("scroll", ScrollTrigger.update);

      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // In-page nav goes through Lenis so it shares the same easing.
      const onNavClick = (event: MouseEvent) => {
        const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
          'a[href^="#"]',
        );
        if (!anchor) return;
        const id = anchor.getAttribute("href");
        if (!id || id === "#") return;
        const target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target as HTMLElement, { offset: -88, duration: 1.1 });
      };
      document.addEventListener("click", onNavClick);

      const ctx = gsap.context(() => {
        /* ------------------------------------------------ hero entrance */
        const heroSteps = gsap.utils.toArray<HTMLElement>("[data-hero-step]").sort(
          (a, b) =>
            Number(a.dataset.heroStep ?? 0) - Number(b.dataset.heroStep ?? 0),
        );

        if (heroSteps.length) {
          const tl = gsap.timeline({
            defaults: { ease: "power3.out", duration: 0.9 },
            delay: 0.12,
          });

          heroSteps.forEach((el, i) => {
            const isProduct = el.dataset.heroProduct !== undefined;
            tl.fromTo(
              el,
              isProduct
                ? { opacity: 0, yPercent: 8, rotate: -2.5, scale: 1.02 }
                : { opacity: 0, y: 26 },
              isProduct
                ? { opacity: 1, yPercent: 0, rotate: 0, scale: 1, duration: 1.2, ease: "power4.out" }
                : { opacity: 1, y: 0 },
              i === 0 ? 0 : "-=0.68",
            );
          });
        }

        /* --------------------------------------------- scroll reveals */
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          const kind = el.dataset.reveal;
          const delay = Number(el.dataset.revealDelay ?? 0);

          const from =
            kind === "mask"
              ? { clipPath: "inset(0 0 100% 0)" }
              : kind === "fade"
                ? { opacity: 0 }
                : { opacity: 0, y: 24 };

          const to =
            kind === "mask"
              ? { clipPath: "inset(0 0 0% 0)", duration: 1.15 }
              : kind === "fade"
                ? { opacity: 1, duration: 0.9 }
                : { opacity: 1, y: 0, duration: 0.9 };

          gsap.fromTo(el, from, {
            ...to,
            delay,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 86%",
              once: true,
            },
            onStart: () => el.classList.add("is-revealed"),
          });
        });

        /* ------------------------------------ hero product scroll drift */
        const heroProduct = document.querySelector<HTMLElement>("[data-hero-product]");
        if (heroProduct) {
          gsap.to(heroProduct, {
            yPercent: 12,
            scale: 0.94,
            ease: "none",
            scrollTrigger: {
              trigger: heroProduct.closest("section"),
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        }

      });

      /* -------------------------------------------- pointer parallax */
      const parallaxTargets = Array.from(
        document.querySelectorAll<HTMLElement>("[data-parallax]"),
      );
      const fine = window.matchMedia("(pointer: fine)").matches;
      let onPointerMove: ((e: PointerEvent) => void) | undefined;

      if (fine && window.innerWidth >= 1280 && parallaxTargets.length) {
        const setters = parallaxTargets.map((el) => ({
          x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }),
          strength: Number(el.dataset.parallax ?? 0.03),
        }));

        onPointerMove = (e: PointerEvent) => {
          const dx = e.clientX - window.innerWidth / 2;
          const dy = e.clientY - window.innerHeight / 2;
          setters.forEach((s) => {
            s.x(dx * s.strength);
            s.y(dy * s.strength);
          });
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });
      }

      // Late-loading images change layout height; recompute triggers.
      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);

      cleanup = () => {
        unsubscribeOverlay();
        document.removeEventListener("click", onNavClick);
        window.removeEventListener("load", onLoad);
        if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
        gsap.ticker.remove(raf);
        ctx.revert();
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      cleanup?.();
    };
  }, []);

  return null;
}
