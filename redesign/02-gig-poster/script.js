/* 02 — GIG POSTER WALL · behaviour
   torn edges · slap-on-scroll · facades · date-aware shows · tear-off tabs · nav state */
(() => {
  "use strict";

  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reduceMQ.matches;

  /* ── bake the feTurbulence textures to PNG once ──
     CSS SVG backgrounds/masks are vector: every tile raster re-runs the turbulence
     filter on the CPU (at DPR 2, over the whole page). Drawing each SVG once into a
     canvas and swapping the custom property for a bitmap keeps the identical look. */
  (function bakeTextures() {
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    [
      ["--noise", scale],
      ["--grit", scale],
      ["--blotch", 1],
      ["--wear", scale],
    ].forEach(([name, k]) => {
      const m = /url\(\s*["']?(data:image\/svg\+xml[^"')]*)["']?\s*\)/.exec(cs.getPropertyValue(name));
      if (!m) return;
      const img = new Image();
      img.onload = () => {
        try {
          const w = Math.round(img.naturalWidth * k);
          const h = Math.round(img.naturalHeight * k);
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          root.style.setProperty(name, `url("${c.toDataURL("image/png")}")`);
        } catch (_) {
          /* tainted/unsupported canvas: keep the SVG fallback */
        }
      };
      img.src = m[1];
    });
  })();

  /* ── seeded RNG so every poster always tears the same way ── */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── torn-paper clip-path: % along the edge, px into the paper ── */
  function tornPolygon(seed, amp) {
    const r = rng(seed * 9973 + 17);
    const bite = () => {
      const big = r() < 0.07 ? 2.4 : 1;
      return (r() * amp * big).toFixed(1);
    };
    const pct = (i, n) => ((i / n) * 100).toFixed(2);
    const H = 34; // points per horizontal edge
    const V = 26; // points per vertical edge
    const pts = [];
    for (let i = 0; i <= H; i++) pts.push(`${pct(i, H)}% ${bite()}px`);
    for (let i = 1; i < V; i++) pts.push(`calc(100% - ${bite()}px) ${pct(i, V)}%`);
    for (let i = H; i >= 0; i--) pts.push(`${pct(i, H)}% calc(100% - ${bite()}px)`);
    for (let i = V - 1; i >= 1; i--) pts.push(`${bite()}px ${pct(i, V)}%`);
    return `polygon(${pts.join(",")})`;
  }

  document.querySelectorAll(".poster[data-seed]").forEach((poster) => {
    const paper = poster.querySelector(":scope > .paper");
    if (!paper) return;
    const seed = Number(poster.dataset.seed) || 1;
    const amp = Number(poster.dataset.amp) || 6;
    paper.style.clipPath = tornPolygon(seed, amp);
  });

  /* ── slap posters onto the wall as they scroll in ── */
  const posters = Array.from(document.querySelectorAll(".poster[data-slap]"));

  function slap(poster, delay) {
    if (poster.classList.contains("is-in")) return;
    if (reduced()) {
      poster.classList.add("is-in");
      return;
    }
    poster.style.animationDelay = `${delay}ms`;
    poster.classList.add("is-slapping", "is-in");
    const wall = poster.closest(".wall");
    if (wall) {
      window.setTimeout(() => {
        wall.classList.remove("is-thud");
        void wall.offsetWidth; // restart the keyframes
        wall.classList.add("is-thud");
      }, delay + 380);
    }
  }

  document.addEventListener("animationend", (e) => {
    const el = e.target;
    if (e.animationName === "slap" && el instanceof HTMLElement) {
      el.classList.remove("is-slapping");
      el.style.animationDelay = "";
    } else if (e.animationName === "thud" && el instanceof HTMLElement) {
      const wall = el.closest(".wall");
      if (wall) wall.classList.remove("is-thud");
    }
  });

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((en) => en.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        visible.forEach((en, i) => {
          slap(en.target, i * 120);
          io.unobserve(en.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    posters.forEach((p) => io.observe(p));
  } else {
    posters.forEach((p) => p.classList.add("is-in"));
  }

  /* if the user switches to reduced motion mid-visit, reveal everything */
  reduceMQ.addEventListener("change", () => {
    if (reduced()) posters.forEach((p) => p.classList.add("is-in"));
  });

  /* ── YouTube facades ── */
  document.querySelectorAll(".facade[data-yt]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.yt;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
      iframe.title = btn.dataset.title || "YouTube";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ── Spotify facade ── */
  const spBtn = document.querySelector(".player__btn[data-spotify]");
  if (spBtn) {
    spBtn.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://open.spotify.com/embed/album/${encodeURIComponent(spBtn.dataset.spotify)}?utm_source=generator`;
      iframe.title = "ANTI-RASO no Spotify";
      iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
      iframe.loading = "eager";
      iframe.height = "420";
      spBtn.replaceWith(iframe);
      iframe.focus();
    });
  }

  /* ── date-aware show list ── */
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  let upcoming = 0;
  let isToday = false;

  document.querySelectorAll(".show[data-date]").forEach((row) => {
    const date = row.dataset.date;
    const status = row.querySelector(".show__status");
    row.classList.remove("is-past", "is-today", "is-next");
    if (date < today) {
      row.classList.add("is-past");
      if (status) status.textContent = "JÁ FOI";
    } else if (date === today) {
      row.classList.add("is-today");
      if (status) status.textContent = "É HOJE!!!";
      upcoming++;
      isToday = true;
    } else {
      row.classList.add("is-next");
      if (status) status.textContent = "PRÓXIMO";
      upcoming++;
    }
  });

  const tearoff = document.querySelector("[data-tearoff]");
  if (tearoff && upcoming === 0) tearoff.classList.add("is-over");

  const heroStatus = document.querySelector("[data-next-status]");
  if (heroStatus) {
    if (isToday) heroStatus.textContent = "É HOJE!!! SAI DE CASA ⚡️😈";
    else if (upcoming === 0) heroStatus.textContent = "JÁ ROLOU. NOVAS DATAS EM BREVE 😈";
  }

  /* ── tear-off tabs ── */
  const countEl = document.querySelector("[data-tab-count]");
  const updateCount = () => {
    if (!countEl) return;
    countEl.textContent = String(document.querySelectorAll("a.tab:not(.is-torn)").length);
  };

  document.querySelectorAll("a.tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      if (tab.classList.contains("is-torn")) {
        e.preventDefault();
        return;
      }
      // the download proceeds normally; we only animate the paper
      if (!reduced()) {
        const rect = tab.getBoundingClientRect();
        const ghost = tab.cloneNode(true);
        ghost.removeAttribute("href");
        ghost.removeAttribute("download");
        ghost.setAttribute("aria-hidden", "true");
        ghost.classList.add("tab-falling");
        Object.assign(ghost.style, {
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        });
        document.body.appendChild(ghost);
        const dir = Math.random() < 0.5 ? -1 : 1;
        const drift = dir * (40 + Math.random() * 80);
        const spin = dir * (30 + Math.random() * 60);
        const fall = window.innerHeight - rect.top + 80;
        const anim = ghost.animate(
          [
            { transform: "translate(0, 0) rotate(0deg)" },
            { transform: `translate(${drift * 0.2}px, 18px) rotate(${spin * 0.25}deg)`, offset: 0.18 },
            { transform: `translate(${drift}px, ${fall}px) rotate(${spin}deg)`, opacity: 0.85 },
          ],
          { duration: 1300, easing: "cubic-bezier(.45,0,.85,.55)", fill: "forwards" }
        );
        anim.onfinish = () => ghost.remove();
      }
      tab.classList.add("is-torn");
      tab.setAttribute("tabindex", "-1");
      const next = document.querySelector("a.tab:not(.is-torn)");
      if (next) next.focus();
      else tab.blur();
      tab.setAttribute("aria-hidden", "true");
      updateCount();
      if (!next) {
        const hint = tearoff && tearoff.querySelector(".tearoff__count");
        if (hint) hint.textContent = "acabaram as tiras — salvou? então cola!";
      }
    });
  });
  updateCount();

  /* ── nav: mark the section in view ── */
  const navLinks = Array.from(document.querySelectorAll(".topbar__nav a[href^='#']"));
  const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  if ("IntersectionObserver" in window) {
    const navIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          navLinks.forEach((a) => a.removeAttribute("aria-current"));
          const link = byId.get(en.target.id);
          if (link) {
            link.setAttribute("aria-current", "true");
            const nav = link.closest(".topbar__nav");
            if (nav && nav.scrollWidth > nav.clientWidth) {
              nav.scrollLeft = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
            }
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    document.querySelectorAll("main > section[id]").forEach((s) => navIO.observe(s));
  }

  /* ── pause caution-tape marquees while offscreen ── */
  if ("IntersectionObserver" in window) {
    const tapeIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle("is-offscreen", !en.isIntersecting));
    });
    document.querySelectorAll(".caution").forEach((el) => {
      el.classList.add("is-offscreen");
      tapeIO.observe(el);
    });
  }
})();
