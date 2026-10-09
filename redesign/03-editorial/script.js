/* HORNEY — 03 Editorial Label. Interaction + motion. Everything degrades to a static, fully usable page. */
(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;
  const motion = !!(gsap && ScrollTrigger) && !reduceMQ.matches;

  if (motion) window.__horneyMotion = true;
  else root.classList.remove("m");

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const pad2 = (n) => String(n).padStart(2, "0");

  /* ---------------- Paper grain: pre-render one small noise tile (static PNG, never re-rasterized) ---------------- */
  try {
    const S = 180;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    const img = g.createImageData(S, S);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    root.style.setProperty("--grain", `url(${c.toDataURL("image/png")})`);
  } catch (_) { /* no grain; page stays fully usable */ }

  /* ---------------- Lenis smooth scroll ---------------- */
  let lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
    if (window.Lenis) {
      lenis = new window.Lenis({ lerp: 0.1 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------------- Clock (Joinville = America/Sao_Paulo) ---------------- */
  const clock = $("#clock");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    const tick = () => { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 15000);
  }

  /* ---------------- Show status from today's date ---------------- */
  const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const statusLabel = { past: "Já rolou", today: "Hoje ⚡️", next: "Próximo" };
  $$(".show[data-date]").forEach((row) => {
    const d = row.dataset.date;
    const state = d < todayISO ? "past" : d === todayISO ? "today" : "next";
    row.dataset.state = state;
    const st = $(".show__status", row);
    if (st) st.textContent = statusLabel[state];
  });

  /* ---------------- Scroll progress + masthead ---------------- */
  const bar = $(".mast__progress span");
  let maxScroll = 0, barQueued = false;
  const measure = () => { maxScroll = document.documentElement.scrollHeight - window.innerHeight; };
  const paintBar = () => {
    barQueued = false;
    if (bar) bar.style.transform = `scaleX(${maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0})`;
  };
  const onScroll = () => { if (!barQueued) { barQueued = true; requestAnimationFrame(paintBar); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { measure(); onScroll(); }, { passive: true });
  window.addEventListener("load", () => { measure(); onScroll(); });
  if ("ResizeObserver" in window) new ResizeObserver(() => { measure(); onScroll(); }).observe(document.body);
  measure();
  paintBar();

  /* ---------------- Ticker: pause the marquee while offscreen or tab hidden ---------------- */
  const ticker = $(".ticker");
  if (ticker && "IntersectionObserver" in window) {
    let tickerVisible = true;
    const syncTicker = () => ticker.classList.toggle("is-off", !tickerVisible || document.hidden);
    new IntersectionObserver(([en]) => { tickerVisible = en.isIntersecting; syncTicker(); }).observe(ticker);
    document.addEventListener("visibilitychange", syncTicker);
  }

  /* ---------------- Index menu ---------------- */
  const menuBtn = $(".mast__menu");
  const menu = $("#menu");
  const menuLabel = $(".mast__menu-label");
  let menuOpen = false;
  const setMenu = (open, restoreFocus = true) => {
    if (open === menuOpen) return;
    menuOpen = open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuLabel.textContent = open ? "Fechar" : "Índice";
    menu.classList.toggle("is-open", open);
    root.classList.toggle("menu-open", open);
    if (lenis) (open ? lenis.stop() : lenis.start());
    if (open) setTimeout(() => { const first = $("a", menu); if (first) first.focus(); }, 60);
    else if (restoreFocus) menuBtn.focus();
  };
  menuBtn.addEventListener("click", () => setMenu(!menuOpen));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen) { setMenu(false); return; }
    if (e.key === "Tab" && menuOpen) {
      const f = [menuBtn, ...$$("a", menu)];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      return;
    }
    if ((e.key === "g" || e.key === "G") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.target.closest("input, textarea, select, [contenteditable]")) toggleGrid();
  });

  /* ---------------- In-page anchors (Lenis-aware, focus-managed) ---------------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute("href");
    const target = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
    if (!target) return;
    e.preventDefault();
    if (menuOpen) setMenu(false, false);
    const isTop = target.id === "top";
    if (lenis) lenis.scrollTo(isTop ? 0 : target, { duration: 1.4 });
    else if (isTop) window.scrollTo({ top: 0, behavior: reduceMQ.matches ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduceMQ.matches ? "auto" : "smooth" });
    target.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, "", isTop ? location.pathname + location.search : hash);
  });

  /* ---------------- Active section in nav ---------------- */
  const navLinks = $$('.mast__nav a, .menu__list a');
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        navLinks.forEach((l) => {
          if (l.getAttribute("href") === `#${id}`) l.setAttribute("aria-current", "true");
          else l.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main > section[id]").forEach((s) => io.observe(s));
  }

  /* ---------------- YouTube facades ---------------- */
  $$(".facade[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.className = "facade__frame";
      f.src = `https://www.youtube.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      f.title = btn.dataset.title || "YouTube";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      btn.replaceWith(f);
      f.focus();
    });
  });

  /* ---------------- Grid overlay ---------------- */
  const gridEl = $(".grid-overlay");
  const gridBtn = $("#grid-toggle");
  function toggleGrid() {
    const on = gridEl.classList.toggle("is-on");
    gridBtn.setAttribute("aria-pressed", String(on));
    gridBtn.textContent = on ? "Esconder grid (G)" : "Mostrar grid (G)";
  }
  gridBtn.addEventListener("click", toggleGrid);

  /* ---------------- Cover hover preview (fine pointers only) ---------------- */
  const peek = $(".peek");
  const peekImg = $(".peek img");
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && peek) {
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, active = false, stopT = 0;
    const lerp = reduceMQ.matches ? 1 : 0.16;
    const loop = () => {
      cx += (x - cx) * lerp;
      cy += (y - cy) * lerp;
      const tilt = reduceMQ.matches ? 0 : Math.max(-8, Math.min(8, (x - cx) * 0.05));
      peek.style.transform = `translate3d(${cx}px, ${cy}px, 0) rotate(${tilt}deg)`;
      /* idle once converged; pointermove wakes it again */
      if (Math.abs(x - cx) < 0.1 && Math.abs(y - cy) < 0.1) { raf = 0; return; }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      if (active && !raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    $$("[data-preview]").forEach((el) => {
      el.addEventListener("pointerenter", (e) => {
        active = true;
        clearTimeout(stopT);
        const src = el.dataset.preview;
        if (peekImg.getAttribute("src") !== src) peekImg.setAttribute("src", src);
        if (!raf) { cx = x = e.clientX; cy = y = e.clientY; loop(); }
        peek.classList.add("is-on");
      });
      el.addEventListener("pointerleave", () => {
        active = false;
        peek.classList.remove("is-on");
        stopT = setTimeout(() => { if (!active && raf) { cancelAnimationFrame(raf); raf = 0; } }, 600);
      });
    });
    window.addEventListener("scroll", () => { if (active) { active = false; peek.classList.remove("is-on"); } }, { passive: true });
  }

  /* ---------------- Media rail: native scroll counter ---------------- */
  const rail = $(".rail");
  const vp = $(".rail__viewport");
  const track = $(".rail__track");
  const railCount = $(".rail__count");
  const railItems = track ? Array.from(track.children) : [];
  const setCount = (i) => { if (railCount) railCount.textContent = `${pad2(i + 1)} / ${pad2(railItems.length)}`; };
  if (vp) {
    vp.addEventListener("scroll", () => {
      const max = vp.scrollWidth - vp.clientWidth;
      setCount(Math.round((max > 0 ? vp.scrollLeft / max : 0) * (railItems.length - 1)));
    }, { passive: true });
  }

  if (!motion) return;

  /* =================================================================
     MOTION (GSAP) — only when allowed
     ================================================================= */

  /* Hero intro */
  const chars = $$(".hero__word .ch");
  gsap.set(chars, { visibility: "visible" });
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .fromTo(chars, { yPercent: 108 }, { yPercent: 0, duration: 1.5, stagger: 0.07 }, 0.1)
    .fromTo(".ch--eye img", { rotation: -220, scale: 0.3 }, { rotation: 0, scale: 1, duration: 2 }, 0.3)
    .fromTo("[data-rise]", { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.07 }, 0.35);

  /* Hero scroll: title drifts (transform, scrubbed); weight thins out as a one-shot tween instead of a
     per-frame variable-font relayout of a 28rem headline */
  gsap.to(".hero__title", {
    yPercent: 10, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero__title", {
    "--hw": 260, duration: 1.2, ease: "power2.inOut",
    scrollTrigger: { trigger: ".hero", start: "top+=25% top", toggleActions: "play none none reverse" },
  });
  gsap.to(".ch--eye", {
    rotation: 200, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  /* Split-line reveals */
  const splitEls = $$("[data-split]");
  if (SplitText) {
    splitEls.forEach((el) => {
      const inHero = !!el.closest(".hero");
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          gsap.set(el, { visibility: "visible" });
          return gsap.fromTo(self.lines, { yPercent: 120 }, {
            yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.09, delay: inHero ? 0.6 : 0,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        },
      });
    });

    /* Pull-quote: words ink in as you read */
    const q = $("[data-words]");
    if (q) {
      SplitText.create(q, {
        type: "words",
        autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(self.words, { opacity: 0.16 }, {
            opacity: 1, ease: "none", stagger: 0.1,
            scrollTrigger: { trigger: q, start: "top 80%", end: "bottom 45%", scrub: true },
          });
        },
      });
    }
  } else {
    gsap.set(splitEls, { visibility: "visible" });
  }

  /* Clip-path image wipes */
  const fromClip = {
    up: "inset(100% 0% 0% 0%)",
    left: "inset(0% 100% 0% 0%)",
    right: "inset(0% 0% 0% 100%)",
  };
  $$("[data-wipe]").forEach((el) => {
    const target = $(".frame", el) || el;
    const img = $("img", target);
    gsap.set(el, { visibility: "visible" });
    const tl = gsap.timeline({
      delay: el.closest(".hero") ? 0.45 : 0,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
    tl.fromTo(target, { clipPath: fromClip[el.dataset.wipe] || fromClip.up }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" });
    if (img) tl.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.9, ease: "expo.out", clearProps: "transform" }, 0.1);
  });

  /* Section numerals: weight axis 200 → 800, played once on enter (not scrubbed: avoids per-frame text relayout) */
  $$(".sec__num").forEach((n) => {
    gsap.fromTo(n, { "--wght": 200 }, {
      "--wght": 800, duration: 1.4, ease: "power2.out",
      scrollTrigger: { trigger: n, start: "top 80%", once: true },
    });
  });

  /* Row / card staggers */
  const batchSel = ".index .row, .show, .stats > div, .merch .item, .social li, .specs > div";
  gsap.set(batchSel, { autoAlpha: 0, y: 36 });
  ScrollTrigger.batch(batchSel, {
    start: "top 92%",
    once: true,
    onEnter: (b) => gsap.to(b, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07, ease: "expo.out", overwrite: true }),
    onLeave: (b) => gsap.set(b, { autoAlpha: 1, y: 0, overwrite: true }),
  });

  /* Count-ups */
  $$("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || "0", 10);
    const suffix = el.dataset.suffix || "";
    const padTo = parseInt(el.dataset.pad || "0", 10);
    const fmt = (v) => { let s = v.toFixed(dec); if (padTo) s = s.padStart(padTo, "0"); return s + suffix; };
    const o = { v: end >= 1000 ? end - 24 : 0 };
    el.textContent = fmt(o.v);
    gsap.to(o, {
      v: end, duration: 1.8, ease: "power3.out",
      onUpdate: () => { el.textContent = fmt(o.v); },
      onComplete: () => { el.textContent = fmt(end); },
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  /* Review score bar */
  const rb = $(".review__bar span");
  if (rb) {
    gsap.fromTo(rb, { clipPath: "inset(0% 100% 0% 0%)" }, {
      clipPath: "inset(0% 22% 0% 0%)", duration: 1.8, ease: "expo.inOut",
      scrollTrigger: { trigger: rb, start: "top 90%", once: true },
    });
  }

  /* Pinned horizontal media rail (desktop) */
  if (rail && vp && track) {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      rail.classList.add("rail--pinned");
      vp.scrollLeft = 0;
      const dist = () => Math.max(0, track.offsetWidth - vp.clientWidth);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: rail,
          refreshPriority: 1,
          start: "top top",
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (s) => setCount(Math.round(s.progress * (railItems.length - 1))),
        },
      });
      $$(".frame img", track).forEach((img) => {
        gsap.fromTo(img, { xPercent: -6, scale: 1.14 }, {
          xPercent: 6, scale: 1.14, ease: "none",
          scrollTrigger: { trigger: img.closest(".rail__item"), containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        });
      });
      /* keyboard: map focused item to the matching scroll position */
      const onFocus = (e) => {
        const li = e.target.closest(".rail__item");
        const st = tween.scrollTrigger;
        if (!li || !st) return;
        vp.scrollLeft = 0;
        const p = Math.min(1, Math.max(0, (li.offsetLeft - vp.clientWidth * 0.25) / (dist() || 1)));
        const y = st.start + p * (st.end - st.start);
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      };
      track.addEventListener("focusin", onFocus);
      return () => {
        track.removeEventListener("focusin", onFocus);
        rail.classList.remove("rail--pinned");
        gsap.set(track, { clearProps: "x" });
      };
    });
  }

  /* Keep measurements right after fonts/images settle */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
