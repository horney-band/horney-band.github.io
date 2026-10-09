/* 10 — ROAD TRIP · HORNEY
   Desktop (≥900×600, motion OK): the stage sticks (CSS sticky inside the .drive runway) while GSAP ScrollTrigger
   scrubs the track horizontally. No ScrollTrigger pin: pinning re-parents the stage into a pin-spacer, which
   reloads the Spotify iframe on every refresh and can throw mid-move.
   Everything else (mobile, reduced motion, GSAP unavailable): native horizontal scroll-snap road.
   Both modes feed the same render(x) which drives sky, sun/moon, parallax, road, van, odometer, nav. */
(() => {
  "use strict";

  const root = document.documentElement;
  const drive = document.getElementById("drive");
  const journey = document.getElementById("journey");
  const track = document.getElementById("track");
  const panels = Array.from(track.querySelectorAll(".panel"));
  const layers = Array.from(journey.querySelectorAll("[data-depth]"));
  const dash = journey.querySelector(".road-dash");
  const wheels = Array.from(journey.querySelectorAll(".wheel"));
  const van = journey.querySelector(".van");
  const vanSvg = journey.querySelector(".van-svg");
  const odo = document.querySelector("[data-odo]");
  const routeFill = document.querySelector(".route-fill");
  const nav = document.getElementById("route-nav");
  const navToggle = document.querySelector(".route-toggle");
  const navLinks = Array.from(nav.querySelectorAll("a"));
  panels.forEach((p) => (p.tabIndex = -1)); // programmatic focus target for in-page links
  const spotify = journey.querySelector(".radio-player iframe[data-src]");
  const radioIdx = panels.findIndex((p) => p.id === "radio");

  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerMQ = window.matchMedia("(hover: hover) and (pointer: fine)");
  // min-height 760: below that the 420px album embed would be clipped by the 100vh sticky stage, so short
  // windows use the native road where each panel scrolls vertically.
  const PIN_QUERY = "(min-width: 900px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)";
  const TOTAL_KM = 666;
  const DASH_PERIOD = 160;

  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  let pinned = false;
  let pinTrigger = null;
  let maxX = 1;
  let offsets = [];
  let layerTravel = [];
  let lastX = 0;
  let current = -1;
  let moveTimer = 0;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const viewW = () => (pinned ? window.innerWidth : track.clientWidth);

  function measure() {
    maxX = Math.max(1, track.scrollWidth - viewW());
    offsets = panels.map((p) => p.offsetLeft);
    const jw = journey.clientWidth;
    layerTravel = layers.map((l) => Math.max(0, l.offsetWidth - jw));
  }

  // Sky vars are inherited by the whole journey subtree (shadows, opacities): writing them every frame forces a
  // full style recalc + repaint of glow shadows. Quantize to 1/40 and write only when the step changes.
  const sunEl = journey.querySelector(".sun");
  const moonEl = journey.querySelector(".moon");
  const q = (v) => Math.round(v * 40) / 40;
  let lastDusk = -1, lastNight = -1, lastKm = -1;

  function render(x) {
    const p = clamp(x / maxX, 0, 1);
    const s = journey.style;
    const dusk = q(smooth(0.3, 0.52, p));
    const night = q(smooth(0.56, 0.78, p));
    if (dusk !== lastDusk) { lastDusk = dusk; s.setProperty("--dusk", String(dusk)); }
    if (night !== lastNight) { lastNight = night; s.setProperty("--night", String(night)); }
    // sun/moon arcs: direct transforms (compositor only) instead of var()-driven calc()
    const sun = clamp(p / 0.6, 0, 1);
    const moon = smooth(0.6, 0.95, p);
    if (sunEl) sunEl.style.transform = "translate3d(" + (sun * -0.24 * window.innerWidth).toFixed(1) + "px," + (sun * 0.66 * window.innerHeight).toFixed(1) + "px,0)";
    if (moonEl) moonEl.style.transform = "translate3d(0," + ((1 - moon) * 0.62 * window.innerHeight).toFixed(1) + "px,0)";
    if (!reduceMQ.matches) {
      for (let i = 0; i < layers.length; i++) {
        layers[i].style.transform = "translate3d(" + (-p * layerTravel[i]).toFixed(1) + "px,0,0)";
      }
    }

    dash.style.transform = "translate3d(" + (-(x % DASH_PERIOD)).toFixed(1) + "px,0,0)";
    const angle = (x * 0.9).toFixed(1);
    for (const w of wheels) w.style.transform = "rotate(" + angle + "deg)";

    const km = Math.round(p * TOTAL_KM);
    if (km !== lastKm) { lastKm = km; odo.textContent = String(km).padStart(3, "0"); }
    routeFill.style.transform = "scaleX(" + p.toFixed(4) + ")";

    if (Math.abs(x - lastX) > 0.5) {
      if (!moveTimer) van.classList.add("is-moving");
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => { moveTimer = 0; van.classList.remove("is-moving"); }, 180);
    }
    lastX = x;

    const probe = x + viewW() * 0.45;
    let idx = 0;
    for (let i = 0; i < offsets.length; i++) if (offsets[i] <= probe) idx = i;
    if (idx !== current) {
      current = idx;
      const id = "#" + panels[idx].id;
      for (const a of navLinks) {
        if (a.getAttribute("href") === id) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      }
      if (idx >= radioIdx - 1) loadSpotify();
    }
  }

  // The Spotify embed is heavy: inject it once, when the road is one stop away from the radio.
  function loadSpotify() {
    if (!spotify || spotify.hasAttribute("src")) return;
    spotify.src = spotify.dataset.src;
  }

  function goTo(i, instant) {
    const idx = clamp(i, 0, panels.length - 1);
    const left = Math.min(offsets[idx] || 0, maxX);
    const behavior = instant || reduceMQ.matches ? "auto" : "smooth";
    if (pinned && pinTrigger) {
      window.scrollTo({ top: pinTrigger.start + left, behavior });
    } else {
      track.scrollTo({ left, behavior });
    }
  }

  /* ---------- swipe mode (default) ---------- */
  let ticking = false;
  track.addEventListener(
    "scroll",
    () => {
      if (pinned || ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        render(track.scrollLeft);
      });
    },
    { passive: true }
  );

  // Desktop without pin (reduced motion / short window): vertical wheel drives the road sideways.
  journey.addEventListener(
    "wheel",
    (e) => {
      if (pinned || e.ctrlKey || !finePointerMQ.matches) return;
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const panel = e.target.closest(".panel");
      if (panel && panel.scrollHeight > panel.clientHeight + 2) {
        const atTop = panel.scrollTop <= 0;
        const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2;
        if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
      }
      e.preventDefault();
      track.scrollLeft += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
    },
    { passive: false }
  );

  /* ---------- in-page links (nav, highway sign, "voltar pro KM 0") ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const idx = panels.findIndex((p) => p.id === id);
    if (idx === -1) return;
    e.preventDefault();
    closeMenu();
    goTo(idx);
    panels[idx].focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  });

  /* ---------- keyboard: ←/→ jump between stops ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (nav.classList.contains("is-open")) {
        closeMenu();
        navToggle.focus();
      }
      return;
    }
    if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const t = e.target;
    if (t instanceof Element && t.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(current - 1);
    }
  });

  /* ---------- focus follows the road in pinned mode ---------- */
  track.addEventListener("focusin", (e) => {
    if (!pinned || e.target.classList.contains("panel")) return;
    const r = e.target.getBoundingClientRect();
    if (r.left >= 0 && r.right <= window.innerWidth) return;
    const panel = e.target.closest(".panel");
    const idx = panels.indexOf(panel);
    if (idx === -1) return;
    const local = r.left - panel.getBoundingClientRect().left; // element position inside its panel
    const target = clamp(offsets[idx] + local - window.innerWidth * 0.3, 0, maxX);
    window.scrollTo({ top: pinTrigger.start + target, behavior: "auto" });
  });

  /* ---------- route menu (small screens) ---------- */
  function closeMenu() {
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
  navToggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      const first = nav.querySelector("a[aria-current]") || nav.querySelector("a");
      first.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("is-open")) return;
    if (e.target.closest(".route-nav, .route-toggle")) return;
    closeMenu();
  });

  /* ---------- YouTube facades ---------- */
  journey.querySelectorAll(".facade[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const frame = document.createElement("div");
      frame.className = "video-frame";
      const iframe = document.createElement("iframe");
      iframe.src = "https://www.youtube.com/embed/" + btn.dataset.yt + "?autoplay=1&rel=0&modestbranding=1";
      iframe.title = btn.dataset.title || "Vídeo da HORNEY";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.appendChild(iframe);
      btn.replaceWith(frame);
      iframe.focus();
    });
  });

  /* ---------- date-aware show statuses ---------- */
  (function showStatuses() {
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    journey.querySelectorAll("[data-show-date]").forEach((el) => {
      const key = Number(el.dataset.showDate.replace(/-/g, ""));
      const label = el.querySelector("[data-status]");
      el.classList.remove("is-past", "is-today", "is-next");
      if (key < today) {
        el.classList.add("is-past");
        label.textContent = "JÁ ROLOU ✔";
      } else if (key === today) {
        el.classList.add("is-today");
        label.textContent = "É HOJE!!! ⚡️";
      } else {
        el.classList.add("is-next");
        label.textContent = "PRÓXIMA PARADA";
      }
    });
  })();

  /* ---------- horizontal journey on vertical scroll (GSAP) ---------- */
  if (hasGsap) {
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    if (!reduceMQ.matches) {
      gsap.from(van, { xPercent: -180, duration: 1.6, ease: "power3.out", delay: 0.25 });
    }

    const mm = gsap.matchMedia();
    mm.add(PIN_QUERY, () => {
      pinned = true;
      root.classList.add("is-pinned");
      track.scrollLeft = 0;

      // Runway length = horizontal distance; .journey is position:sticky inside it.
      const sizeDrive = () => {
        measure();
        drive.style.setProperty("--drive", maxX + "px");
      };
      sizeDrive();
      ScrollTrigger.addEventListener("refreshInit", sizeDrive);

      const tilt = gsap.quickTo(vanSvg, "rotation", { duration: 0.4, ease: "power2.out" });

      const tween = gsap.to(track, {
        x: () => -maxX,
        ease: "none",
        onUpdate: () => render(-gsap.getProperty(track, "x")),
        scrollTrigger: {
          trigger: drive,
          start: "top top",
          end: () => "+=" + maxX,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => tilt(clamp(-self.getVelocity() / 900, -3, 3)),
          onScrubComplete: () => tilt(0),
        },
      });
      pinTrigger = tween.scrollTrigger;

      // Roadside objects reveal as they enter from the right edge.
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        const type = el.dataset.reveal;
        let vars;
        if (type === "swing") {
          vars = { rotation: -16, transformOrigin: "50% 100%", opacity: 0, duration: 1.3, ease: "elastic.out(1, 0.5)" };
        } else if (type === "rise") {
          vars = { yPercent: 35, rotationX: -55, transformPerspective: 900, transformOrigin: "50% 100%", opacity: 0, duration: 1, ease: "power3.out" };
        } else {
          vars = { y: 60, opacity: 0, duration: 0.8, ease: "power3.out" };
        }
        gsap.from(el, {
          ...vars,
          scrollTrigger: {
            trigger: el,
            containerAnimation: tween,
            start: "left 94%",
            toggleActions: "play none none reverse",
          },
        });
      });

      // Tape strikes on past shows get "slapped on" as you drive past.
      gsap.utils.toArray(".gig.is-past .strike i").forEach((bar, i) => {
        gsap.from(bar, {
          scaleX: 0,
          transformOrigin: i % 2 ? "100% 50%" : "0% 50%",
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: bar.closest(".gig"), containerAnimation: tween, start: "left 70%", toggleActions: "play none none reverse" },
        });
      });

      render(0);

      return () => {
        pinned = false;
        pinTrigger = null;
        ScrollTrigger.removeEventListener("refreshInit", sizeDrive);
        drive.style.removeProperty("--drive");
        root.classList.remove("is-pinned");
        gsap.set(track, { clearProps: "transform" });
        gsap.set(vanSvg, { clearProps: "transform" });
        requestAnimationFrame(() => {
          measure();
          render(track.scrollLeft);
        });
      };
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }

  /* ---------- resize / motion preference changes ---------- */
  window.addEventListener("resize", () => {
    if (pinned) return; // ScrollTrigger refresh handles the pinned layout
    measure();
    render(track.scrollLeft);
  });
  reduceMQ.addEventListener("change", () => {
    if (reduceMQ.matches) for (const l of layers) l.style.transform = "";
    measure();
    render(pinned ? -(window.gsap ? window.gsap.getProperty(track, "x") : 0) : track.scrollLeft);
  });

  /* ---------- pause infinite CSS animations in panels that are off the road (and when the tab is hidden) ---------- */
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) e.target.classList.toggle("is-off", !e.isIntersecting);
    }, { rootMargin: "0px 200px" });
    panels.forEach((p) => io.observe(p));
  }
  document.addEventListener("visibilitychange", () => {
    root.classList.toggle("is-hidden", document.hidden);
  });

  /* ---------- initial paint + deep links ---------- */
  measure();
  render(pinned ? 0 : track.scrollLeft);
  const startIdx = panels.findIndex((p) => "#" + p.id === window.location.hash);
  if (startIdx > 0) {
    requestAnimationFrame(() => {
      measure();
      goTo(startIdx, true);
    });
  }
})();
