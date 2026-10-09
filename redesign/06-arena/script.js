/* HORNEY — 06 ARENA · interactions (vanilla, no dependencies) */
(() => {
  "use strict";

  const root = document.documentElement;
  root.classList.add("js");

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionQuery.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------- Top bar + nav ---------------- */
  const topbar = $("#topbar");
  const navToggle = $("#navToggle");
  const nav = $("#nav");

  const setNav = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
    navToggle.querySelector(".topbar__toggle-label").textContent = open ? "FECHAR" : "MENU";
    if (open) {
      const first = nav.querySelector("a");
      if (first) first.focus({ preventScroll: true });
    }
  };
  navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("nav-open")) {
      setNav(false);
      navToggle.focus();
    }
  });
  window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => { if (e.matches) setNav(false); });

  /* ---------------- Scroll tracking ---------------- */
  let scrollY = window.scrollY;
  let lastScrollY = scrollY;
  let velocity = 0;
  let scrollDir = 1;
  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
    topbar.classList.toggle("is-scrolled", scrollY > 40);
  }, { passive: true });
  topbar.classList.toggle("is-scrolled", scrollY > 40);

  /* ---------------- Hero spotlights ---------------- */
  // Darkness + follow-spot holes + coloured glow are painted into a small canvas
  // (1/4 resolution, upscaled by the GPU — the gradients are soft anyway). This replaces
  // full-viewport CSS mask/radial-gradient layers that re-rastered (and screen-blended)
  // every frame as the spot custom properties changed.
  const hero = $(".hero");
  const light = $(".hero__light");
  const lctx = light.getContext("2d");
  const LIGHT_SCALE = 0.25;
  const clamp = (lo, v, hi) => Math.min(hi, Math.max(lo, v));
  const spot = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4 };
  const roam = { x: 0.3, y: 0.6 };
  let heroVisible = true;
  let lastPointer = -Infinity;
  let lw = 1, lh = 1, R = 1, R2 = 1;
  const drawn = { x: -1, y: -1, ax: -1, ay: -1 };

  const sizeLight = () => {
    lw = Math.max(1, Math.round(hero.clientWidth * LIGHT_SCALE));
    lh = Math.max(1, Math.round(hero.clientHeight * LIGHT_SCALE));
    light.width = lw;
    light.height = lh;
    const vw = window.innerWidth;
    R = clamp(220, vw * 0.26, 420) * LIGHT_SCALE;
    R2 = clamp(160, vw * 0.18, 300) * LIGHT_SCALE;
    drawn.x = -1;
  };
  const radial = (x, y, r, stops) => {
    const g = lctx.createRadialGradient(x, y, 0, x, y, r);
    for (const [o, c] of stops) g.addColorStop(o, c);
    lctx.fillStyle = g;
    lctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const setSpotVars = () => {
    if (Math.abs(drawn.x - spot.x) + Math.abs(drawn.y - spot.y) +
        Math.abs(drawn.ax - roam.x) + Math.abs(drawn.ay - roam.y) < 0.0004) return;
    drawn.x = spot.x; drawn.y = spot.y; drawn.ax = roam.x; drawn.ay = roam.y;
    const sx = spot.x * lw, sy = spot.y * lh, ax = roam.x * lw, ay = roam.y * lh;
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, lw, lh);
    lctx.fillStyle = "rgba(4, 3, 2, .93)";
    lctx.fillRect(0, 0, lw, lh);
    // Two punched holes; destination-out twice = intersection of the two masks.
    lctx.globalCompositeOperation = "destination-out";
    radial(sx, sy, R, [[0, "#000"], [0.38, "#000"], [1, "rgba(0,0,0,0)"]]);
    radial(ax, ay, R2, [[0, "#000"], [0.3, "#000"], [1, "rgba(0,0,0,0)"]]);
    // Additive glow (stands in for the old mix-blend-mode: screen layer).
    lctx.globalCompositeOperation = "lighter";
    radial(sx, sy, R * 0.9, [[0, "rgba(242,169,0,.38)"], [0.7, "rgba(242,169,0,0)"]]);
    radial(ax, ay, R2 * 0.9, [[0, "rgba(27,59,255,.35)"], [0.7, "rgba(27,59,255,0)"]]);
  };
  sizeLight();

  const aim = (e) => {
    const r = hero.getBoundingClientRect();
    spot.tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    spot.ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    lastPointer = performance.now();
  };
  hero.addEventListener("pointermove", aim, { passive: true });
  hero.addEventListener("pointerdown", aim, { passive: true });

  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    hero.classList.toggle("is-off", !heroVisible); // pause beam/rig CSS animations offscreen
    kick();
  }).observe(hero);

  const updateSpotlights = (t) => {
    if (!heroVisible) return;
    const s = t / 1000;
    // Second follow-spot operator wanders on a Lissajous path.
    roam.x = 0.5 + Math.sin(s * 0.43) * 0.34 + Math.sin(s * 1.1) * 0.05;
    roam.y = 0.5 + Math.cos(s * 0.61) * 0.22;
    // Primary spot auto-roams when the pointer has been idle (or on touch before any tap).
    if (t - lastPointer > 3500) {
      spot.tx = 0.62 + Math.sin(s * 0.33 + 2) * 0.2;
      spot.ty = 0.42 + Math.sin(s * 0.52) * 0.14;
    }
    const k = finePointer && t - lastPointer < 3500 ? 0.14 : 0.04;
    spot.x = lerp(spot.x, spot.tx, k);
    spot.y = lerp(spot.y, spot.ty, k);
    setSpotVars();
  };

  /* ---------------- Marquees ---------------- */
  const marquees = $$(".marquee").map((el) => {
    const track = $(".marquee__track", el);
    const item = $(".marquee__item", el);
    return {
      el, track, item,
      dir: Number(el.dataset.dir) || -1,
      speed: Number(el.dataset.speed) || 1,
      x: 0, w: 1, visible: true,
    };
  });

  const buildMarquee = (m) => {
    $$(".marquee__item", m.track).slice(1).forEach((n) => n.remove());
    m.w = m.item.offsetWidth || 1; // layout width: unaffected by the banner's rotate/skew
    const need = Math.ceil((m.el.clientWidth * 2) / m.w) + 1;
    for (let i = 0; i < need; i++) {
      const clone = m.item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      m.track.appendChild(clone);
    }
    m.x = m.x % m.w;
  };
  const buildAll = () => marquees.forEach(buildMarquee);
  buildAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildAll);
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildAll(); sizeLight(); setSpotVars(); }, 150);
  });
  const mio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const m = marquees.find((q) => q.el === en.target);
      if (m) m.visible = en.isIntersecting;
    });
    kick();
  });
  marquees.forEach((m) => mio.observe(m.el));

  const updateMarquees = (dt) => {
    const boost = Math.min(Math.abs(velocity) * 0.9, 40);
    const skew = Math.max(-10, Math.min(10, velocity * -0.35));
    for (const m of marquees) {
      if (!m.visible) continue;
      const px = (1.1 + boost) * m.speed * m.dir * scrollDir * (dt / 16.67);
      m.x += px;
      m.x %= m.w;
      if (m.x > 0) m.x -= m.w;
      m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    }
  };

  /* ---------------- Main loop ---------------- */
  // Runs only while the hero or a marquee is on screen and the tab is visible.
  let prevT = performance.now();
  let rafId = 0;
  const shouldRun = () => !reduced && !document.hidden && (heroVisible || marquees.some((m) => m.visible));
  const loop = (t) => {
    const dt = Math.min(64, t - prevT);
    prevT = t;
    const delta = scrollY - lastScrollY;
    lastScrollY = scrollY;
    velocity = lerp(velocity, delta, 0.12);
    if (Math.abs(delta) > 0.5) scrollDir = delta > 0 ? 1 : -1;
    updateSpotlights(t);
    updateMarquees(dt);
    rafId = shouldRun() ? requestAnimationFrame(loop) : 0;
  };
  function kick() {
    if (rafId || !shouldRun()) return;
    prevT = performance.now();
    lastScrollY = scrollY;
    rafId = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", kick);

  const applyMotionMode = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    if (reduced) {
      spot.x = 0.55; spot.y = 0.4; roam.x = 0.28; roam.y = 0.62;
      setSpotVars();
      marquees.forEach((m) => { m.track.style.transform = ""; });
      // Reduced motion: spotlight still follows the pointer, just without easing/roaming.
      return;
    }
    kick();
  };
  hero.addEventListener("pointermove", () => {
    if (!reduced) return;
    spot.x = spot.tx; spot.y = spot.ty;
    setSpotVars();
  }, { passive: true });
  motionQuery.addEventListener("change", (e) => { reduced = e.matches; applyMotionMode(); });
  applyMotionMode();

  /* ---------------- Reveals + count-ups ---------------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      revealObserver.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals) || 0;
    if (reduced) { el.textContent = target.toFixed(dec); return; }
    const dur = 1500;
    const start = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      countUp(en.target);
      countObserver.unobserve(en.target);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countObserver.observe(el));

  /* ---------------- EP cover tilt + disco spotlights ---------------- */
  const epTilt = $("#epTilt");
  const epArt = epTilt.parentElement;
  epArt.addEventListener("pointermove", (e) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = epTilt.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    epTilt.style.setProperty("--ry", ((px - 0.5) * 16).toFixed(2) + "deg");
    epTilt.style.setProperty("--rx", ((0.5 - py) * 16).toFixed(2) + "deg");
    epTilt.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
    epTilt.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
  });
  epArt.addEventListener("pointerleave", () => {
    epTilt.style.setProperty("--rx", "0deg");
    epTilt.style.setProperty("--ry", "0deg");
  });

  $$(".disco__card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
  });

  /* ---------------- YouTube facades ---------------- */
  $$(".yt").forEach((box) => {
    const btn = $(".yt__btn", box);
    btn.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${box.dataset.yt}?autoplay=1&rel=0`;
      iframe.title = box.dataset.title;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      btn.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ---------------- Tickets ---------------- */
  const today = new Date();
  const todayKey = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  let nextMarked = false;
  $$(".ticket").forEach((ticket) => {
    const [y, mo, d] = ticket.dataset.date.split("-").map(Number);
    const key = y * 10000 + mo * 100 + d;
    const status = $("[data-status]", ticket);
    ticket.classList.remove("is-past", "is-today", "is-next");
    if (key < todayKey) {
      ticket.classList.add("is-past");
      status.textContent = "JÁ ROLOU";
    } else if (key === todayKey) {
      ticket.classList.add("is-today");
      status.textContent = "É HOJE!!!";
      nextMarked = true;
    } else {
      status.textContent = nextMarked ? "EM BREVE" : "PRÓXIMO";
      if (!nextMarked) ticket.classList.add("is-next");
      nextMarked = true;
    }

    const stub = $(".ticket__stub", ticket);
    const details = $(".ticket__details", ticket);
    const heading = $("h4", details);
    const reset = $(".ticket__reset", details);

    const open = (originEvent) => {
      if (ticket.classList.contains("is-torn")) return;
      stub.setAttribute("aria-expanded", "true");
      ticket.classList.add("is-torn");
      details.hidden = false;
      void details.offsetHeight; // commit 0fr before transitioning to 1fr
      details.classList.add("is-open");
      heading.focus({ preventScroll: true });
      if (!reduced) {
        const r = stub.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, "scraps", ticket);
      }
      const finish = () => ticket.classList.add("is-gone");
      if (reduced) finish();
      else stub.addEventListener("animationend", finish, { once: true });
      if (originEvent) originEvent.preventDefault();
    };

    const close = () => {
      details.classList.remove("is-open");
      ticket.classList.remove("is-torn", "is-gone");
      stub.setAttribute("aria-expanded", "false");
      const hide = () => { if (!details.classList.contains("is-open")) details.hidden = true; };
      if (reduced) hide();
      else setTimeout(hide, 600);
      stub.focus({ preventScroll: true });
    };

    stub.addEventListener("click", open);
    reset.addEventListener("click", close);
  });

  /* ---------------- Confetti / pyro engine ---------------- */
  const canvas = $("#confetti");
  const ctx = canvas.getContext("2d");
  const palettes = {
    confetti: ["#f2a900", "#ffc21a", "#ff3b1f", "#1b3bff", "#fff3d6", "#ff2bd6"],
    pyro: ["#ffe08a", "#f2a900", "#ff6a1f", "#ff3b1f", "#ffffff"],
    scraps: ["#f2a900", "#ff3b1f", "#1b3bff", "#fff3d6"],
  };
  let particles = [];
  let fxRunning = false;
  let dpr = 1;

  const sizeCanvas = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  };
  sizeCanvas();
  window.addEventListener("resize", sizeCanvas);

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  const spawnConfetti = (x, y, count, colors, spread = Math.PI * 2, angle = -Math.PI / 2, power = [6, 16]) => {
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-spread / 2, spread / 2);
      const v = rand(power[0], power[1]);
      particles.push({
        kind: Math.random() < 0.25 ? "ribbon" : "rect",
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 0.32, drag: 0.985,
        w: rand(6, 12), h: rand(10, 18),
        rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3),
        tilt: rand(0, Math.PI * 2), vt: rand(0.08, 0.2),
        color: pick(colors),
        life: 0, max: rand(110, 170),
      });
    }
  };

  const spawnSparks = (x, y, count, colors, angle, spread, power) => {
    for (let i = 0; i < count; i++) {
      const a = angle + rand(-spread / 2, spread / 2);
      const v = rand(power[0], power[1]);
      particles.push({
        kind: "spark",
        x, y, px: x, py: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 0.22, drag: 0.975,
        size: rand(1.5, 3.2),
        color: pick(colors),
        life: 0, max: rand(45, 85),
      });
    }
  };

  const burst = (x, y, type, ticketEl) => {
    if (reduced) return;
    if (type === "pyro") {
      const W = window.innerWidth, H = window.innerHeight;
      spawnSparks(x, y, 90, palettes.pyro, -Math.PI / 2, Math.PI * 2, [3, 12]);
      // Stage-edge fountains, fired in three volleys.
      [0, 160, 320].forEach((delay) => {
        setTimeout(() => {
          spawnSparks(W * 0.04, H, 60, palettes.pyro, -Math.PI / 2 + 0.18, 0.35, [14, 24]);
          spawnSparks(W * 0.96, H, 60, palettes.pyro, -Math.PI / 2 - 0.18, 0.35, [14, 24]);
          startFx();
        }, delay);
      });
    } else if (type === "scraps") {
      const color = ticketEl ? getComputedStyle(ticketEl).getPropertyValue("--tc").trim() : "";
      spawnConfetti(x, y, 26, color ? [color, "#fff3d6", "#0a0806"] : palettes.scraps, Math.PI * 1.2, -Math.PI / 2, [3, 9]);
    } else {
      const W = window.innerWidth;
      spawnConfetti(x, y, 140, palettes.confetti, Math.PI * 0.9, -Math.PI / 2, [8, 20]);
      spawnConfetti(0, window.innerHeight * 0.65, 50, palettes.confetti, 0.6, -Math.PI / 3, [12, 22]);
      spawnConfetti(W, window.innerHeight * 0.65, 50, palettes.confetti, 0.6, -Math.PI * 2 / 3, [12, 22]);
    }
    startFx();
  };

  const drawFx = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const H = window.innerHeight + 40;
    particles = particles.filter((p) => p.life < p.max && p.y < H);
    for (const p of particles) {
      p.life++;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      if (p.kind === "spark") {
        p.px = p.x; p.py = p.y;
        p.x += p.vx; p.y += p.vy;
        const fade = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, fade);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p.px - p.vx * 1.5, p.py - p.vy * 1.5);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        continue;
      }
      p.x += p.vx + Math.sin(p.tilt) * 0.6;
      p.y += Math.min(p.vy, 6);
      p.rot += p.vr;
      p.tilt += p.vt;
      const fade = p.life > p.max - 30 ? (p.max - p.life) / 30 : 1;
      ctx.globalAlpha = Math.max(0, fade);
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.tilt));
      if (p.kind === "ribbon") {
        ctx.beginPath();
        ctx.moveTo(-p.h, 0);
        ctx.quadraticCurveTo(-p.h / 2, -p.w, 0, 0);
        ctx.quadraticCurveTo(p.h / 2, p.w, p.h, 0);
        ctx.lineWidth = 3;
        ctx.strokeStyle = p.color;
        ctx.stroke();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(drawFx);
    else {
      fxRunning = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  const startFx = () => {
    if (fxRunning) return;
    fxRunning = true;
    requestAnimationFrame(drawFx);
  };

  $$("[data-burst]").forEach((el) => {
    el.addEventListener("click", (e) => {
      // Keyboard activation reports 0,0 — fall back to the element centre.
      const r = el.getBoundingClientRect();
      const x = e.clientX || r.left + r.width / 2;
      const y = e.clientY || r.top + r.height / 2;
      burst(x, y, el.dataset.burst);
    });
  });

  /* ---------------- Encore ---------------- */
  const encoreNote = $("#encoreNote");
  const encoreLines = [
    "MAIS UMA!!! ⚡️",
    "Tá pedindo bis? Então cola no próximo show.",
    "SAI DE CASA E COLE NOS SHOWS!!!",
    "Bota ANTI-RASO no talo e mergulha. 😈",
    "Obrigado, galera. Até a próxima!",
  ];
  let encoreIdx = 0;
  $("#encoreBtn").addEventListener("click", () => {
    encoreNote.textContent = encoreLines[encoreIdx % encoreLines.length];
    encoreIdx++;
  });
})();
