/* 04 — HYBRID SKETCHBOOK · behaviour
   DOM work (emblem, nav, show dates, video facades, scramble, doodle pad) runs without GSAP.
   Scroll choreography only runs when GSAP + ScrollTrigger loaded and motion is allowed. */
(() => {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const canAnimate = !reduce && !!gsap && !!ScrollTrigger;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const fx = (n) => n.toFixed(1);

  if (canAnimate) {
    gsap.registerPlugin(ScrollTrigger);
    root.classList.add("motion");
  }

  // Seeded RNG so the hand-drawn emblem is identical on every visit.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function addPath(parent, d, cls) {
    const p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", cls);
    parent.appendChild(p);
    return p;
  }

  /* ------------------------------------------------------------------
     1. Winged eye: wings are generated around the band's eye.png
  ------------------------------------------------------------------ */
  const SHOULDER = [-118, -34];

  function quad(p0, c, p1, t) {
    const u = 1 - t;
    return [
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    ];
  }

  function buildWing(g, seed) {
    const r = mulberry32(seed);
    const j = (amt) => (r() - 0.5) * amt;
    const A0 = SHOULDER;
    const C = [-250, -235];
    const A1 = [-430, -232];
    // back to front: long hatched primaries, solid stencil secondaries, paper coverts
    const rows = [
      { n: 12, t0: 0.05, t1: 1, a0: 98, a1: 166, l0: 130, l1: 222, w: 15, cls: "w-pri", ghost: true, shaft: true },
      { n: 10, t0: 0.03, t1: 0.94, a0: 94, a1: 150, l0: 78, l1: 150, w: 13, cls: "w-sec", ghost: false, shaft: false },
      { n: 8, t0: 0.0, t1: 0.74, a0: 88, a1: 128, l0: 42, l1: 78, w: 10, cls: "w-cov", ghost: true, shaft: false },
    ];

    for (const row of rows) {
      for (let i = 0; i < row.n; i++) {
        const t = row.t0 + ((row.t1 - row.t0) * i) / (row.n - 1);
        const b = quad(A0, C, A1, t);
        const ang = ((row.a0 + (row.a1 - row.a0) * Math.pow(t, 1.2) + j(7)) * Math.PI) / 180;
        const len = row.l0 + (row.l1 - row.l0) * t + j(16);
        const e = [b[0] + Math.cos(ang) * len, b[1] + Math.sin(ang) * len];
        const m = [(b[0] + e[0]) / 2, (b[1] + e[1]) / 2];
        const px = -Math.sin(ang);
        const py = Math.cos(ang);
        const w = row.w * (0.8 + r() * 0.4);
        const m1 = [m[0] + px * w, m[1] + py * w];
        const m2 = [m[0] - px * w * 0.75, m[1] - py * w * 0.75];
        const d =
          `M${fx(b[0])} ${fx(b[1])} Q${fx(m1[0])} ${fx(m1[1])} ${fx(e[0])} ${fx(e[1])} ` +
          `Q${fx(m2[0])} ${fx(m2[1])} ${fx(b[0] + j(5))} ${fx(b[1] + j(5))}`;
        addPath(g, d, row.cls);
        if (row.ghost) {
          const ghost = addPath(g, d, "w-ghost");
          ghost.setAttribute("transform", `translate(${fx(j(8))} ${fx(j(8))})`);
        }
        if (row.shaft) {
          const k = 0.8 + j(0.08);
          addPath(g, `M${fx(b[0])} ${fx(b[1])} L${fx(b[0] + (e[0] - b[0]) * k)} ${fx(b[1] + (e[1] - b[1]) * k)}`, "w-shaft");
        }
      }
    }

    // the "bone": two loose pen passes along the leading edge
    for (let pass = 0; pass < 2; pass++) {
      const off = pass * 9;
      addPath(
        g,
        `M${fx(A0[0] + j(4))} ${fx(A0[1] + off + j(4))} Q${fx(C[0] + j(12))} ${fx(C[1] + off + j(12))} ${fx(A1[0] + j(6))} ${fx(A1[1] + off * 0.5 + j(6))}`,
        "w-arm"
      );
    }
  }

  function sketchCircle(r, radius, wobble, turns) {
    const steps = 84;
    const start = r() * Math.PI * 2;
    const phase = r() * 6;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const a = start + (i / steps) * Math.PI * 2 * turns;
      const rr = radius + Math.sin(a * 3 + phase) * wobble + (r() - 0.5) * wobble * 0.5;
      d += `${i ? "L" : "M"}${fx(Math.cos(a) * rr)} ${fx(Math.sin(a) * rr * 0.92)}`;
    }
    return d;
  }

  const wingL = $("#wingL");
  const wingR = $("#wingR");
  const halo = $("#halo");
  if (wingL && wingR && halo) {
    buildWing(wingL, 1977);
    buildWing(wingR, 1977); // same seed, mirrored group = symmetric emblem
    const hr = mulberry32(2026);
    addPath(halo, sketchCircle(hr, 150, 5, 1.12), "halo-a");
    addPath(halo, sketchCircle(hr, 160, 7, 1.05), "halo-b");
  }

  /* ------------------------------------------------------------------
     2. Navigation: mobile toggle + active section
  ------------------------------------------------------------------ */
  const toggle = $(".nav-toggle");
  const navList = $("#navlist");
  if (toggle && navList) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      navList.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    navList.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".topbar")) setOpen(false);
    });
  }

  const navLinks = $$(".nav-list a");
  const sectionIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        for (const a of navLinks) {
          const on = a.getAttribute("href") === `#${id}`;
          a.classList.toggle("is-active", on);
          if (on) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        }
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  $$("main > section[id]").forEach((s) => sectionIO.observe(s));

  /* ------------------------------------------------------------------
     3. Shows: past / today / upcoming from the visitor's date
  ------------------------------------------------------------------ */
  const now = new Date();
  const two = (n) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  let nextGig = null;
  for (const gig of $$(".gig")) {
    const date = gig.dataset.date;
    const status = $(".gig-status", gig);
    gig.classList.remove("is-past", "is-today");
    if (date < today) {
      gig.classList.add("is-past");
      status.textContent = "já rolou ✓";
    } else if (date === today) {
      gig.classList.add("is-today");
      status.textContent = "É HOJE!!!";
      nextGig = nextGig || gig;
    } else {
      status.textContent = "vem aí!";
      nextGig = nextGig || gig;
    }
  }
  const cta = $("#nextShowCta");
  if (cta) {
    if (!nextGig) cta.textContent = "AGENDA 2026 ENCERRADA · VALEU!";
    else if (nextGig.classList.contains("is-today")) cta.textContent = "É HOJE!!! ÚLTIMO SHOW DO ANO";
  }

  /* ------------------------------------------------------------------
     4. YouTube facades
  ------------------------------------------------------------------ */
  for (const btn of $$(".yt")) {
    btn.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      iframe.title = btn.dataset.title;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
      iframe.focus();
    });
  }

  /* ------------------------------------------------------------------
     5. Scramble decode + spray drips
  ------------------------------------------------------------------ */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*!?/<>=+";
  const rand = Math.random;
  const glyph = () => GLYPHS[(rand() * GLYPHS.length) | 0];
  const garble = (text) => Array.from(text, (ch) => (ch === " " ? " " : glyph())).join("");

  function scramble(target, text, duration = 1000) {
    if (target._raf) cancelAnimationFrame(target._raf);
    const host = target.closest(".spray");
    if (host) host.classList.add("is-scrambling");
    const chars = Array.from(text);
    const n = chars.length;
    const start = performance.now();
    let last = "";
    const step = (time) => {
      const p = Math.min(1, (time - start) / duration);
      let out = "";
      for (let i = 0; i < n; i++) {
        const ch = chars[i];
        out += ch === " " || p >= 0.25 + (0.75 * i) / n ? ch : glyph();
      }
      if (out !== last) target.textContent = last = out;
      if (p < 1) {
        target._raf = requestAnimationFrame(step);
      } else {
        target._raf = 0;
        if (host) host.classList.remove("is-scrambling");
      }
    };
    target._raf = requestAnimationFrame(step);
  }

  const scrambleHeads = $$(".scramble");
  for (const el of scrambleHeads) {
    const text = el.textContent.trim();
    el.textContent = "";
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    const vis = document.createElement("span");
    vis.className = "scr";
    vis.setAttribute("aria-hidden", "true");
    vis.textContent = reduce ? text : garble(text);
    el.append(sr, vis);
    el._vis = vis;
    el._text = text;
    if (!reduce) {
      el.addEventListener("pointerenter", () => {
        if (!vis._raf) scramble(vis, text, 700);
      });
    }
  }

  const dripRng = mulberry32(77);
  for (const el of $$(".spray")) {
    const count = 2 + Math.floor(dripRng() * 3);
    for (let i = 0; i < count; i++) {
      const drip = document.createElement("i");
      drip.className = "drip";
      drip.setAttribute("aria-hidden", "true");
      drip.style.setProperty("--x", `${fx(8 + dripRng() * 84)}%`);
      drip.style.setProperty("--h", `${Math.round(16 + dripRng() * 58)}px`);
      drip.style.setProperty("--w", `${fx(2.5 + dripRng() * 3)}px`);
      drip.style.setProperty("--d", `${fx(0.3 + dripRng() * 0.9)}s`);
      el.appendChild(drip);
    }
  }

  const revealIO = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.classList.add("is-in");
        if (el._vis && !reduce) scramble(el._vis, el._text, 1100);
        obs.unobserve(el);
      }
    },
    { threshold: 0.35 }
  );
  $$(".spray, .scramble").forEach((el) => revealIO.observe(el));

  // Background "scrambled lyrics" keep glitching while the hero is on screen.
  const lyricWords = $$(".lw");
  let heroVisible = true;
  const hero = $("#topo");
  if (hero) {
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
    }).observe(hero);
  }
  if (!reduce && lyricWords.length) {
    for (const w of lyricWords) w.dataset.text = w.textContent;
    window.setInterval(() => {
      if (!heroVisible || document.hidden) return;
      const w = lyricWords[(rand() * lyricWords.length) | 0];
      if (!w._raf) scramble(w, w.dataset.text, 900);
    }, 700);
  }

  /* ------------------------------------------------------------------
     6. Doodle pad
  ------------------------------------------------------------------ */
  const pad = $("#pad");
  if (pad) {
    const ctx = pad.getContext("2d");
    const hint = $("#padHint");
    const SPRAY = "#ff2bd6";
    const YELLOW = "#f2a900";
    let color = "#151311";
    let drawing = false;
    let last = null;
    let dpr = 1;

    const resize = () => {
      const rect = pad.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const prevDpr = dpr;
      const snap = document.createElement("canvas");
      snap.width = pad.width;
      snap.height = pad.height;
      snap.getContext("2d").drawImage(pad, 0, 0);
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      pad.width = Math.round(rect.width * dpr);
      pad.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(snap, 0, 0, snap.width / prevDpr, snap.height / prevDpr);
    };
    new ResizeObserver(resize).observe(pad);

    const point = (e) => {
      const rect = pad.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, p: e.pressure || 0.5 };
    };

    const spray = (x, y) => {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = SPRAY;
      for (let k = 0; k < 18; k++) {
        const a = rand() * Math.PI * 2;
        const rr = Math.pow(rand(), 1.6) * 18;
        const s = 0.8 + rand() * 1.4;
        ctx.fillRect(x + Math.cos(a) * rr, y + Math.sin(a) * rr, s, s);
      }
      ctx.globalAlpha = 1;
    };

    const segment = (a, b) => {
      if (color === SPRAY) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.max(1, Math.ceil(dist / 4));
        for (let i = 1; i <= steps; i++) spray(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps);
        return;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      if (color === YELLOW) {
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 16;
      } else {
        ctx.globalAlpha = 1;
        ctx.lineWidth = (color === "#151311" ? 1.6 : 3) + b.p * 2.4;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    pad.addEventListener("pointerdown", (e) => {
      drawing = true;
      pad.setPointerCapture(e.pointerId);
      last = point(e);
      segment(last, { ...last, x: last.x + 0.1 });
      if (hint) hint.classList.add("is-gone");
      e.preventDefault();
    });
    pad.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const p = point(ev);
        segment(last, p);
        last = p;
      }
    });
    const stop = () => {
      drawing = false;
      last = null;
    };
    pad.addEventListener("pointerup", stop);
    pad.addEventListener("pointercancel", stop);

    const swatches = $$(".swatch");
    for (const sw of swatches) {
      sw.addEventListener("click", () => {
        color = sw.dataset.color;
        for (const other of swatches) {
          const on = other === sw;
          other.classList.toggle("is-on", on);
          other.setAttribute("aria-pressed", String(on));
        }
      });
    }

    $("#padClear").addEventListener("click", () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pad.width, pad.height);
      ctx.restore();
      if (hint) hint.classList.remove("is-gone");
    });

    $("#padSave").addEventListener("click", () => {
      const out = document.createElement("canvas");
      out.width = pad.width;
      out.height = pad.height;
      const o = out.getContext("2d");
      o.fillStyle = "#fffdf7";
      o.fillRect(0, 0, out.width, out.height);
      o.drawImage(pad, 0, 0);
      const link = document.createElement("a");
      link.download = "rabisco-horney.png";
      link.href = out.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  /* ------------------------------------------------------------------
     7. Scroll choreography (GSAP + ScrollTrigger)
  ------------------------------------------------------------------ */
  if (!canAnimate) return;

  const DRAWABLE = "path, line, circle, ellipse, rect, polyline, polygon";

  function prepStroke(el) {
    let len = 1000;
    try {
      len = el.getTotalLength();
    } catch (err) {
      len = 1000;
    }
    len = Math.ceil(len) + 2;
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = String(len);
    return len;
  }

  function prepText(el) {
    const len = Number(el.dataset.len) || 1500;
    el.style.strokeDasharray = `${len} ${len}`;
    el.style.strokeDashoffset = String(len);
    el.style.fillOpacity = "0";
  }

  // 7a. red notebook margin = scroll progress
  gsap.fromTo(
    ".margin-line",
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.3 },
    }
  );

  // 7b. hero intro: the emblem gets drawn, the logo is sprayed in, ANTI-RASO is stenciled
  const emblem = $("#emblem");
  if (emblem && wingL && wingR) {
    const left = $$("path", wingL);
    const right = $$("path", wingR);
    const wingPaths = [];
    for (let i = 0; i < left.length; i++) wingPaths.push(left[i], right[i]);
    wingPaths.forEach(prepStroke);
    const haloPaths = $$("path", halo);
    haloPaths.forEach(prepStroke);
    const introDoodles = $$("[data-intro] path");
    introDoodles.forEach(prepStroke);
    const heroText = $(".stencil-hero text");
    if (heroText) prepText(heroText);

    const tl = gsap.timeline({ defaults: { ease: "power2.out" }, delay: 0.15 });
    tl.from(".emblem-eye", { scale: 0.3, rotation: -120, opacity: 0, transformOrigin: "50% 50%", duration: 1.1, ease: "back.out(1.7)" }, 0)
      .to(haloPaths, { strokeDashoffset: 0, duration: 0.9, stagger: 0.2, ease: "power1.inOut" }, 0.35)
      .to(wingPaths, { strokeDashoffset: 0, duration: 0.55, stagger: 0.016, ease: "power1.inOut" }, 0.5)
      .add(() => emblem.classList.add("filled"), ">-0.4")
      .fromTo(".logo-crop img", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power3.inOut" }, 0.9)
      .from(".overspray", { opacity: 0, scale: 0.85, duration: 0.8 }, 1.3);
    if (heroText) {
      tl.to(heroText, { strokeDashoffset: 0, duration: 1.4, ease: "power1.inOut" }, 1.3)
        .to(heroText, { fillOpacity: 1, duration: 0.5 }, 2.4);
    }
    tl.from(".hero-sub, .hero-cta .btn", { y: 18, opacity: 0, duration: 0.6, stagger: 0.1 }, 2.1)
      .to(introDoodles, { strokeDashoffset: 0, duration: 0.6, stagger: 0.12, ease: "power1.inOut" }, 2.2)
      .from(".note--hero-a, .note--hero-b, .hero > .page-no, .scroll-hint", { opacity: 0, duration: 0.6, stagger: 0.1 }, 2.2);

    // wing flap: lift tied to scroll progress through the hero. Updated only when scroll progress
    // changes (no per-frame ticker repainting the large hatched SVG while idle).
    const pivot = `${SHOULDER[0]} ${SHOULDER[1]}`;
    const flap = (lift) => {
      const a = lift * 16 + Math.sin(lift * Math.PI * 4) * 5 * lift;
      const tf = `rotate(${fx(a)} ${pivot})`;
      wingL.setAttribute("transform", tf);
      wingR.setAttribute("transform", tf);
    };
    flap(0);
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => flap(self.progress),
    });

    gsap.to(".emblem-wrap", {
      yPercent: 22,
      scale: 0.9,
      ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".lyrics", {
      yPercent: -10,
      ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
    });
  }

  // 7c. every [data-draw] doodle inks itself as it crosses the viewport (scrubbed)
  for (const svg of $$("svg[data-draw]")) {
    const strokes = $$(DRAWABLE, svg).filter((el) => !el.classList.contains("stitch"));
    const texts = $$("text.draw-text", svg);
    strokes.forEach(prepStroke);
    texts.forEach(prepText);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: svg,
        start: svg.dataset.start || "top 88%",
        end: svg.dataset.end || "top 45%",
        scrub: 0.8,
      },
    });
    if (strokes.length) tl.to(strokes, { strokeDashoffset: 0, ease: "none", duration: 1, stagger: 0.18 });
    if (texts.length) {
      tl.to(texts, { strokeDashoffset: 0, ease: "none", duration: 1.4 }, 0).to(texts, { fillOpacity: 1, ease: "none", duration: 0.4 });
    }
  }

  // 7d. highlighter sweeps
  for (const hl of $$(".hl")) {
    gsap.fromTo(
      hl,
      { backgroundSize: "0% 62%" },
      {
        backgroundSize: "100% 62%",
        ease: "none",
        scrollTrigger: { trigger: hl, start: "top 82%", end: "top 48%", scrub: 0.6 },
      }
    );
  }

  // 7e. taped things drop onto the page
  const dropEls = $$(".polaroid, .taped, .taped-card, .tv, .sticker, .merch-item, .soc, .spray-blob, .grade");
  // opacity (not autoAlpha) so links inside stay keyboard-focusable before they are revealed
  gsap.set(dropEls, { opacity: 0, y: 70 });
  const drop = (batch) => {
    const fresh = batch.filter((el) => !el._dropped);
    fresh.forEach((el) => {
      el._dropped = true;
    });
    if (!fresh.length) return;
    gsap.fromTo(
      fresh,
      { opacity: 0, y: 70, rotation: () => gsap.utils.random(-12, 12) },
      { opacity: 1, y: 0, rotation: 0, duration: 0.9, ease: "back.out(1.5)", stagger: 0.08, overwrite: "auto" }
    );
  };
  ScrollTrigger.batch(dropEls, { start: "top 92%", onEnter: drop, onEnterBack: drop });
  document.addEventListener("focusin", (e) => {
    const host = dropEls.find((el) => el.contains(e.target));
    if (host) drop([host]);
  });

  // 7f. parallax drift on the polaroid wall
  for (const el of $$(".wall [data-speed]")) {
    const speed = Number(el.dataset.speed) || 1;
    gsap.fromTo(
      el.parentElement,
      { y: 40 * speed },
      {
        y: -40 * speed,
        ease: "none",
        scrollTrigger: { trigger: ".wall", start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  }

  // layout shifts once fonts/images land
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
