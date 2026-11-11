/* 17 — CADERNO ANTI-RASO · behaviour
   Everything works without animation; motion is layered on top and skipped under reduced motion.
   Shared fan wall + oracle come from ../assets/oraculo.js (window.Horney). Fan strings → textContent only. */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const reduce = root.classList.contains('rm') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H = window.Horney && window.Horney.mural && window.Horney.oraculo ? window.Horney : null;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LIVRO = 1320; // notebook max width, keep in sync with --livro in style.css
  const pad2 = (n) => String(n).padStart(2, '0');
  const fx = (n) => n.toFixed(1);

  const K = {
    tema: 'horney:caderno:tema',
    aberto: 'horney:caderno:aberto',
    estilos: 'horney:caderno:estilos',
    apelido: 'horney:caderno:apelido',
  };
  const store = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* private mode: state just isn't kept */ } },
  };

  function el(tag, cls, text) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* ==================================================================
     1. Capa: the kraft cover opens once (first visit, no hash, motion ok)
  ================================================================== */
  const capa = $('#capa');
  let capaAberta = !root.classList.contains('com-capa') || !capa;
  const filaCapa = [];
  const quandoAberta = (fn) => (capaAberta ? fn() : filaCapa.push(fn));
  const gatilhos = ['wheel', 'touchmove', 'keydown', 'scroll'];
  const SO_MODIFICADOR = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
  // any scroll / wheel / swipe / real key opens it (a lone modifier, e.g. Cmd+Tab away, does not)
  const gatilho = (e) => {
    if (e.type === 'keydown' && SO_MODIFICADOR.includes(e.key)) return;
    abrirCapa();
  };

  function abrirCapa() {
    if (capaAberta) return;
    capaAberta = true;
    store.set(K.aberto, '1');
    gatilhos.forEach((ev) => window.removeEventListener(ev, gatilho));
    capa.classList.add('abrindo');
    let feito = false;
    const fim = () => {
      if (feito) return;
      feito = true;
      const tinhaFoco = doc.activeElement === capa;
      root.classList.remove('com-capa');
      capa.classList.remove('abrindo');
      if (tinhaFoco) {
        // the focused cover disappears: hand focus to the page itself (not the skip link,
        // which would pop up after a mouse click); the next Tab continues from <main>
        const conteudo = $('#conteudo');
        if (conteudo) {
          conteudo.setAttribute('tabindex', '-1');
          conteudo.focus({ preventScroll: true });
        }
      }
      filaCapa.splice(0).forEach((fn) => fn());
    };
    const folha = $('.capa-folha', capa);
    if (folha) {
      folha.addEventListener('transitionend', (e) => {
        if (e.target === folha && e.propertyName === 'transform') fim();
      });
    }
    window.setTimeout(fim, 950);
  }

  if (!capaAberta) {
    capa.addEventListener('click', abrirCapa);
    gatilhos.forEach((ev) => window.addEventListener(ev, gatilho, { passive: true }));
  }

  /* ==================================================================
     2. Caderno ⇄ Muro theme toggle (pre-paint value set in <head>)
  ================================================================== */
  const temaBtn = $('#tema');
  const metaTema = $('#metaTema');
  function aplicarTema(t) {
    root.setAttribute('data-theme', t);
    if (temaBtn) temaBtn.setAttribute('aria-pressed', String(t === 'muro'));
    if (metaTema) metaTema.setAttribute('content', t === 'muro' ? '#1d1c1a' : '#efe9db');
  }
  aplicarTema(root.getAttribute('data-theme') === 'muro' ? 'muro' : 'caderno');
  if (temaBtn) {
    temaBtn.addEventListener('click', () => {
      const t = root.getAttribute('data-theme') === 'muro' ? 'caderno' : 'muro';
      aplicarTema(t);
      store.set(K.tema, t);
    });
  }

  /* ==================================================================
     3. Mobile menu (disclosure: aria-expanded, Esc closes, focus returns)
  ================================================================== */
  const navToggle = $('#navToggle');
  const navMenu = $('#navMenu');
  let menuAberto = false;
  function setMenu(open) {
    menuAberto = open;
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute('aria-expanded', String(open));
    navMenu.classList.toggle('is-open', open);
  }
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => setMenu(!menuAberto));
    navMenu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenu(false);
    });
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuAberto) {
        setMenu(false);
        navToggle.focus();
      }
    });
    doc.addEventListener('click', (e) => {
      if (menuAberto && !e.target.closest('.nav')) setMenu(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
      if (e.matches) setMenu(false);
    });
  }

  /* ==================================================================
     4. Shows — ONE data array; status computed from the visitor's date
  ================================================================== */
  const IG = 'https://www.instagram.com/horney.band/';
  const SHOWS = [
    {
      date: '2026-09-17',
      titulo: 'ROCK NIGHT @ FFFRONT',
      local: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso',
      blurb: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.',
    },
    {
      date: '2026-10-03',
      titulo: 'HORNEY AO VIVO',
      local: 'LOCAL NÃO INFORMADO',
      blurb: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤',
    },
    {
      date: '2026-10-09',
      titulo: 'ÚLTIMO SHOW DO ANO',
      local: 'LOCAL EM BREVE',
      blurb: 'Último show do ano. Local em breve — fica de olho no IG.',
    },
  ];
  const MES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const DIA_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${pad2(agora.getMonth() + 1)}-${pad2(agora.getDate())}`;
  const STATUS = {
    passado: { label: 'JÁ ROLOU', link: 'Fotos no IG ↗' },
    hoje: { label: 'HOJE!!!', link: 'Infos no IG ↗' },
    proximo: { label: 'PRÓXIMO', link: 'Infos no IG ↗' },
  };
  const statusDe = (s) => (s.date < hoje ? 'passado' : s.date === hoje ? 'hoje' : 'proximo');
  const partes = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d, dia: DIA_SEMANA[new Date(y, m - 1, d).getDay()] };
  };

  const futuros = SHOWS.filter((s) => s.date >= hoje).sort((a, b) => (a.date < b.date ? -1 : 1));
  const passados = SHOWS.filter((s) => s.date < hoje).sort((a, b) => (a.date < b.date ? 1 : -1));
  const proximo = futuros[0] || null;

  function montaIngresso(s, i) {
    const st = statusDe(s);
    const p = partes(s.date);
    const li = el('li', `ingresso is-${st}`);
    li.style.setProperty('--r', `${[-1.2, 0.9, -0.6, 1.4][i % 4]}deg`);
    const canhoto = el('div', 'ing-canhoto');
    const time = el('time');
    time.dateTime = s.date;
    time.append(el('span', 'd', pad2(p.d)), el('span', 'm', MES_CURTO[p.m - 1]), el('span', 'a', `${p.y} · ${p.dia}`));
    canhoto.append(time);
    const corpo = el('div', 'ing-corpo');
    const carimbo = el('span', 'carimbo-show', STATUS[st].label);
    const link = el('a', 'ing-link', STATUS[st].link);
    link.href = IG;
    link.target = '_blank';
    link.rel = 'noopener';
    corpo.append(carimbo, el('p', 'ing-tit', s.titulo), el('p', 'ing-local', s.local), el('p', 'ing-blurb', s.blurb), link);
    li.append(canhoto, corpo);
    return li;
  }

  const listaIngressos = $('#ingressos');
  if (listaIngressos) listaIngressos.replaceChildren(...futuros.concat(passados).map(montaIngresso));

  const textoProximo = proximo
    ? (() => {
        const p = partes(proximo.date);
        return `${statusDe(proximo) === 'hoje' ? 'É HOJE!!! ' : ''}${p.dia} ${pad2(p.d)}/${pad2(p.m)} · ${proximo.titulo} · ${proximo.local}`;
      })()
    : 'sem shows marcados — cola no Instagram pra saber primeiro';
  $$('[data-proximo-txt]').forEach((n) => { n.textContent = textoProximo; });
  if (proximo) {
    $$('.proximo, .proximo-muro').forEach((n) => n.classList.add(statusDe(proximo) === 'hoje' ? 'is-hoje' : 'is-marcado'));
    const lk = $('[data-proximo-link]');
    if (lk) lk.firstChild.textContent = 'infos no @horney.band ';
  }

  /* ==================================================================
     5. Embeds: YouTube facades + Spotify album (420px, on view or tap)
  ================================================================== */
  $$('.facade').forEach((facade) => {
    const btn = $('.facade-btn', facade);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const iframe = doc.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = facade.dataset.title || 'Vídeo da HORNEY';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      btn.replaceWith(iframe);
      iframe.focus();
    });
  });

  const colaPlayer = $('#colaPlayer');
  const colaBtn = $('#colaBtn');
  let spotifyColado = false;
  function colarSpotify(focar) {
    if (spotifyColado || !colaPlayer) return;
    spotifyColado = true;
    const f = doc.createElement('iframe');
    f.title = 'Spotify: HORNEY — ANTI-RASO';
    f.src = 'https://open.spotify.com/embed/album/7EM81z5ydGQq04ZbkIE5aS?utm_source=generator&theme=0';
    f.width = '100%';
    f.height = '420';
    f.loading = 'lazy';
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    if (colaBtn) colaBtn.remove();
    colaPlayer.classList.add('is-colado');
    colaPlayer.append(f);
    if (focar) f.focus();
  }
  if (colaBtn) colaBtn.addEventListener('click', () => colarSpotify(true));
  if (colaPlayer && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        colarSpotify(false);
      }
    }, { rootMargin: '250px 0px' });
    quandoAberta(() => io.observe(colaPlayer));
  }

  /* ==================================================================
     6. Winged eye emblem (seeded wings, same drawing on every visit)
  ================================================================== */
  const SHOULDER = [-118, -34];
  const quad = (p0, c, p1, t) => {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  };
  function addPath(parent, d, cls) {
    const p = doc.createElementNS(SVGNS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', cls);
    parent.appendChild(p);
    return p;
  }
  function buildWing(g, seed) {
    const r = mulberry32(seed);
    const j = (amt) => (r() - 0.5) * amt;
    const A0 = SHOULDER;
    const C = [-250, -235];
    const A1 = [-430, -232];
    const rows = [
      { n: 12, t0: 0.05, t1: 1, a0: 98, a1: 166, l0: 130, l1: 222, w: 15, cls: 'w-pri', ghost: true, shaft: true },
      { n: 10, t0: 0.03, t1: 0.94, a0: 94, a1: 150, l0: 78, l1: 150, w: 13, cls: 'w-sec', ghost: false, shaft: false },
      { n: 8, t0: 0, t1: 0.74, a0: 88, a1: 128, l0: 42, l1: 78, w: 10, cls: 'w-cov', ghost: true, shaft: false },
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
        const d = `M${fx(b[0])} ${fx(b[1])} Q${fx(m1[0])} ${fx(m1[1])} ${fx(e[0])} ${fx(e[1])} Q${fx(m2[0])} ${fx(m2[1])} ${fx(b[0] + j(5))} ${fx(b[1] + j(5))}`;
        addPath(g, d, row.cls);
        if (row.ghost) addPath(g, d, 'w-ghost').setAttribute('transform', `translate(${fx(j(8))} ${fx(j(8))})`);
        if (row.shaft) {
          const k = 0.8 + j(0.08);
          addPath(g, `M${fx(b[0])} ${fx(b[1])} L${fx(b[0] + (e[0] - b[0]) * k)} ${fx(b[1] + (e[1] - b[1]) * k)}`, 'w-shaft');
        }
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      const off = pass * 9;
      addPath(g, `M${fx(A0[0] + j(4))} ${fx(A0[1] + off + j(4))} Q${fx(C[0] + j(12))} ${fx(C[1] + off + j(12))} ${fx(A1[0] + j(6))} ${fx(A1[1] + off * 0.5 + j(6))}`, 'w-arm');
    }
  }
  function sketchCircle(r, radius, wobble, turns) {
    const steps = 84;
    const start = r() * Math.PI * 2;
    const phase = r() * 6;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const a = start + (i / steps) * Math.PI * 2 * turns;
      const rr = radius + Math.sin(a * 3 + phase) * wobble + (r() - 0.5) * wobble * 0.5;
      d += `${i ? 'L' : 'M'}${fx(Math.cos(a) * rr)} ${fx(Math.sin(a) * rr * 0.92)}`;
    }
    return d;
  }
  const emblema = $('#emblema');
  const asaE = $('#asaE');
  const asaD = $('#asaD');
  const halo = $('#halo');
  if (asaE && asaD && halo) {
    buildWing(asaE, 1977);
    buildWing(asaD, 1977);
    const hr = mulberry32(2026);
    addPath(halo, sketchCircle(hr, 150, 5, 1.12), 'halo-a');
    addPath(halo, sketchCircle(hr, 160, 7, 1.05), 'halo-b');
  }

  /* ==================================================================
     7. Ink that draws itself (one-shot stroke-dashoffset, IO-triggered)
  ================================================================== */
  const DRAWABLE = 'path, line, circle, ellipse, rect, polyline, polygon';
  function prepararTinta(svg, stagger, dur) {
    const shapes = $$(DRAWABLE, svg).filter((s) => !s.closest('defs, clipPath, pattern, symbol') && !s.classList.contains('marca-amarela'));
    shapes.forEach((s, i) => {
      let len = 600;
      try { len = s.getTotalLength(); } catch (e) { len = 600; }
      len = Math.ceil(len) + 2;
      s.style.setProperty('--l', String(len));
      s.style.setProperty('--dl', `${(i * stagger).toFixed(3)}s`);
      if (dur) s.style.setProperty('--dur', `${dur}s`);
    });
    svg.classList.add('tinta-pronta');
    return shapes.length;
  }

  if (!reduce) {
    // hero emblem: wings interleaved L/R so both sides ink at the same time
    if (emblema && asaE && asaD) {
      const l = $$('path', asaE);
      const r = $$('path', asaD);
      const halos = $$('path', halo);
      halos.forEach((p, i) => {
        let len = 1200;
        try { len = Math.ceil(p.getTotalLength()) + 2; } catch (e) { len = 1200; }
        p.style.setProperty('--l', String(len));
        p.style.setProperty('--dl', `${(0.15 + i * 0.25).toFixed(2)}s`);
        p.style.setProperty('--dur', '1s');
      });
      for (let i = 0; i < l.length; i++) {
        [l[i], r[i]].forEach((p) => {
          if (!p) return;
          let len = 300;
          try { len = Math.ceil(p.getTotalLength()) + 2; } catch (e) { len = 300; }
          p.style.setProperty('--l', String(len));
          p.style.setProperty('--dl', `${(0.35 + i * 0.012).toFixed(3)}s`);
          p.style.setProperty('--dur', '.55s');
        });
      }
      emblema.classList.add('tinta-pronta');
      const fimAsas = (0.35 + l.length * 0.012 + 0.55) * 1000;
      quandoAberta(() => {
        // two frames: the undrawn dash state must be styled once before the transition can run
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
          emblema.classList.add('tinta');
          window.setTimeout(() => emblema.classList.add('cheio'), fimAsas);
        }));
      });
    }

    const desenhos = $$('svg[data-draw]');
    desenhos.forEach((svg) => prepararTinta(svg, 0.16, 0));
    if ('IntersectionObserver' in window) {
      const ioTinta = new IntersectionObserver((entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('tinta');
          obs.unobserve(e.target);
        });
      }, { threshold: 0.3 });
      quandoAberta(() => desenhos.forEach((svg) => ioTinta.observe(svg)));
    } else {
      desenhos.forEach((svg) => svg.classList.add('tinta'));
    }
  }

  /* ==================================================================
     8. Stencil headings: scramble-decode (accessible copy) + spray drips
  ================================================================== */
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*!?/<>=+';
  const glyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
  function scramble(target, text, duration) {
    if (target._raf) window.cancelAnimationFrame(target._raf);
    const chars = Array.from(text);
    const n = chars.length;
    const start = performance.now();
    let last = '';
    const step = (time) => {
      const p = Math.min(1, (time - start) / duration);
      let out = '';
      for (let i = 0; i < n; i++) {
        const ch = chars[i];
        out += ch === ' ' || p >= 0.25 + (0.75 * i) / n ? ch : glyph();
      }
      if (out !== last) target.textContent = last = out;
      target._raf = p < 1 ? window.requestAnimationFrame(step) : 0;
    };
    target._raf = window.requestAnimationFrame(step);
  }

  $$('.scramble').forEach((h) => {
    const text = h.textContent.trim();
    h.textContent = '';
    const sr = el('span', 'sr-only', text);
    const vis = el('span', 'scr', text);
    vis.setAttribute('aria-hidden', 'true');
    h.append(sr, vis);
    h._vis = vis;
    h._text = text;
    if (!reduce) {
      h.addEventListener('pointerenter', () => {
        if (!vis._raf) scramble(vis, text, 650);
      });
    }
  });

  const dripRng = mulberry32(77);
  $$('.spray').forEach((s) => {
    const count = 2 + Math.floor(dripRng() * 3);
    for (let i = 0; i < count; i++) {
      const drip = el('i', 'goteira');
      drip.setAttribute('aria-hidden', 'true');
      drip.style.setProperty('--x', `${fx(8 + dripRng() * 84)}%`);
      drip.style.setProperty('--h', `${Math.round(14 + dripRng() * 46)}px`);
      drip.style.setProperty('--w', `${fx(2.5 + dripRng() * 3)}px`);
      drip.style.setProperty('--d', `${fx(0.3 + dripRng() * 0.9)}s`);
      s.appendChild(drip);
    }
  });

  const sprays = $$('.spray');
  if (reduce || !('IntersectionObserver' in window)) {
    sprays.forEach((s) => s.classList.add('is-in'));
  } else {
    sprays.forEach((s) => { if (s._vis) s._vis.textContent = Array.from(s._text, (c) => (c === ' ' ? ' ' : glyph())).join(''); });
    const ioSpray = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const s = e.target;
        s.classList.add('is-in');
        if (s._vis) scramble(s._vis, s._text, 1000);
        obs.unobserve(s);
      });
    }, { threshold: 0.35 });
    quandoAberta(() => sprays.forEach((s) => ioSpray.observe(s)));
  }

  /* ==================================================================
     9. Scrollspy (header nav + index tabs) and the margin eye's corner
  ================================================================== */
  const spyLinks = $$('[data-spy]');
  const CANTO = { topo: 'bl', release: 'tr', dates: 'bl', videos: 'tl', merch: 'br', recados: 'tr', segue: 'bl' };
  const olho = $('#olhoMargem');
  const olhoPos = { x: -200, y: -200, canto: 'bl', s: 64 };

  function marcarSecao(id) {
    spyLinks.forEach((a) => {
      if (a.dataset.spy === id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    if (CANTO[id]) moverOlho(CANTO[id]);
  }

  const mqFone = window.matchMedia('(max-width: 899px)'); // same breakpoint as style.css
  function moverOlho(canto) {
    if (!olho) return;
    const W = root.clientWidth;
    const Hh = window.innerHeight;
    const s = olho.offsetWidth || 64;
    olhoPos.s = s;
    let c = canto;
    if (mqFone.matches) {
      // phones: the eye sits at the right end of the reserved desk strip above the tabs,
      // so it never covers page text (the back link takes the strip's left end)
      const cs = window.getComputedStyle(root);
      const abas = parseFloat(cs.getPropertyValue('--abas-h')) || 0;
      const tira = parseFloat(cs.getPropertyValue('--tira-h')) || 0;
      c = 'br';
      olhoPos.x = Math.round(W - s - 12);
      olhoPos.y = Math.round(Hh - abas - tira + (tira - s) / 2);
    } else {
      const livroL = Math.max(0, (W - LIVRO) / 2);
      const livroR = Math.min(W, livroL + LIVRO);
      const xL = livroL + 12;
      const xR = W >= LIVRO + 104 ? livroR - s - 20 : W - 56 - s - 14;
      const yT = 64 + 16;
      const yB = Hh - s - 44;
      olhoPos.x = Math.round(c.endsWith('l') ? xL : xR);
      olhoPos.y = Math.round(c.startsWith('t') ? yT : Math.max(yT, yB));
    }
    olhoPos.canto = c;
    olho.dataset.corner = c;
    olho.style.transform = `translate3d(${olhoPos.x}px, ${olhoPos.y}px, 0)`;
  }

  let secaoAtual = 'topo';
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        secaoAtual = e.target.id;
        marcarSecao(secaoAtual);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['topo', 'release', 'dates', 'videos', 'merch', 'recados', 'segue'].forEach((id) => {
      const n = doc.getElementById(id);
      if (n) spy.observe(n);
    });
  }
  if (olho) {
    olho.classList.add('sem-transicao');
    moverOlho(CANTO[secaoAtual]);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => olho.classList.remove('sem-transicao')));
    let rz = 0;
    window.addEventListener('resize', () => {
      if (rz) return;
      rz = window.requestAnimationFrame(() => {
        rz = 0;
        moverOlho(CANTO[secaoAtual] || 'bl');
      });
    });
  }

  /* ==================================================================
     10. Eyes that watch (pointer follow) and blink (idle-aware)
  ================================================================== */
  const pupilas = [];
  const pupilaHero = $('#pupilaHero');
  let heroVisivel = true;
  if (pupilaHero && emblema) {
    pupilas.push({
      el: pupilaHero,
      mx: 30, my: 11, last: '',
      vivo: () => heroVisivel,
      centro: () => {
        const r = emblema.getBoundingClientRect();
        return { x: r.left + r.width * (650 / 1300), y: r.top + r.height * (300 / 470) };
      },
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { heroVisivel = entries[0].isIntersecting; }).observe(emblema);
    }
  }
  const pupilaMargem = olho ? $('.pupila', olho) : null;
  if (pupilaMargem) {
    pupilas.push({
      el: pupilaMargem,
      mx: 30, my: 11, last: '',
      vivo: () => true,
      centro: () => ({ x: olhoPos.x + olhoPos.s / 2, y: olhoPos.y + olhoPos.s / 2 }),
    });
  }

  let ultimaAtividade = performance.now();
  let ponteiro = null;
  let rafOlhar = 0;
  function olhar() {
    rafOlhar = 0;
    if (!ponteiro) return;
    for (const p of pupilas) {
      if (!p.vivo()) continue;
      const c = p.centro();
      const dx = ponteiro.x - c.x;
      const dy = ponteiro.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      const t = `translate(${fx((dx / d) * k * p.mx)} ${fx((dy / d) * k * p.my)})`;
      if (t !== p.last) {
        p.el.setAttribute('transform', t);
        p.last = t;
      }
    }
  }
  const marcarAtividade = () => {
    ultimaAtividade = performance.now();
    if (!timerPiscar) agendarPiscada();
  };
  if (!reduce && pupilas.length) {
    window.addEventListener('pointermove', (e) => {
      ponteiro = { x: e.clientX, y: e.clientY };
      marcarAtividade();
      if (!rafOlhar) rafOlhar = window.requestAnimationFrame(olhar);
    }, { passive: true });
  }

  let timerPiscar = 0;
  const palpebras = [$('#palpebraHero'), olho ? $('.palpebra', olho) : null].filter(Boolean);
  function piscar(p) {
    if (typeof p.animate !== 'function') return;
    p.animate(
      [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.06)', offset: 0.45 }, { transform: 'scaleY(1)' }],
      { duration: 230, easing: 'ease-in-out' }
    );
  }
  function agendarPiscada() {
    if (reduce || !palpebras.length) return;
    window.clearTimeout(timerPiscar);
    timerPiscar = window.setTimeout(() => {
      timerPiscar = 0;
      // stop blinking when the tab is hidden or nobody touched anything for 20s
      if (doc.hidden || performance.now() - ultimaAtividade > 20000) return;
      if (palpebras[1]) piscar(palpebras[1]);
      if (palpebras[0] && heroVisivel && Math.random() < 0.6) piscar(palpebras[0]);
      agendarPiscada();
    }, 2400 + Math.random() * 4200);
  }
  if (!reduce) {
    ['keydown', 'touchstart', 'scroll'].forEach((ev) => window.addEventListener(ev, marcarAtividade, { passive: true }));
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) {
        window.clearTimeout(timerPiscar);
        timerPiscar = 0;
      } else {
        marcarAtividade();
      }
    });
    agendarPiscada();
  }

  /* ==================================================================
     11. O Olho nas margens — the oracle sticky note
  ================================================================== */
  const dlg = $('#oraculo');
  const oForm = $('#oraculoForm');
  const oInput = $('#oraculoPergunta');
  const oEco = $('#oraculoEco');
  const oEscrita = $('#oraculoEscrita');
  const oLive = $('#oraculoLive');
  const oLinks = $('#oraculoLinks');
  const oFechar = $('#oraculoFechar');
  const visaoBtn = $('#visaoBtn');
  let abridor = null;
  let escrevendo = null;

  function terminarEscrita() {
    if (!escrevendo) return;
    const { raf, texto, fim } = escrevendo;
    if (raf) window.cancelAnimationFrame(raf);
    escrevendo = null;
    oEscrita.textContent = texto;
    oEscrita.classList.remove('escrevendo');
    fim();
  }

  function escrever(texto, fim) {
    terminarEscrita();
    if (reduce) {
      oEscrita.textContent = texto;
      fim();
      return;
    }
    const chars = Array.from(texto);
    const t0 = performance.now();
    let n = 0;
    oEscrita.textContent = '';
    oEscrita.classList.add('escrevendo');
    escrevendo = { raf: 0, texto, fim };
    const passo = (t) => {
      if (!escrevendo) return;
      const alvo = Math.min(chars.length, Math.floor((t - t0) / 26));
      if (alvo !== n) {
        n = alvo;
        oEscrita.textContent = chars.slice(0, n).join('');
      }
      if (n < chars.length) escrevendo.raf = window.requestAnimationFrame(passo);
      else {
        escrevendo.raf = 0;
        terminarEscrita();
      }
    };
    escrevendo.raf = window.requestAnimationFrame(passo);
  }

  function responder(pergunta) {
    if (!oEscrita || !oLive || !oLinks) return;
    if (!H) {
      oEscrita.textContent = 'o olho tá fechado agora: o oráculo não carregou. Recarrega a página — ou pergunta direto na DM do @horney.band.';
      oLive.textContent = oEscrita.textContent;
      return;
    }
    let ans;
    try {
      ans = H.oraculo.ask(pergunta);
    } catch (e) {
      ans = { text: 'O olho piscou e perdeu a pergunta. Tenta de novo.', intent: 'erro', links: [] };
    }
    const q = String(pergunta || '').trim();
    if (oEco) oEco.textContent = q ? `você perguntou: “${q}”` : '';
    const links = (Array.isArray(ans.links) ? ans.links : []).filter((l) => l && typeof l.href === 'string' && /^https:\/\//.test(l.href));
    oLinks.replaceChildren();
    oLinks.hidden = true;
    oLive.textContent = '';
    const falado = ans.text + (links.length ? ` Links: ${links.map((l) => l.label).join(', ')}.` : '');
    window.setTimeout(() => { oLive.textContent = falado; }, 60);
    escrever(String(ans.text || ''), () => {
      links.forEach((l) => {
        const li = el('li');
        const a = el('a', 'po-link', `${l.label} ↗`);
        a.href = l.href;
        a.target = '_blank';
        a.rel = 'noopener';
        li.append(a);
        oLinks.append(li);
      });
      oLinks.hidden = !links.length;
    });
  }

  function posicionarNota() {
    if (!dlg) return;
    const W = root.clientWidth;
    const Hh = window.innerHeight;
    if (W < 600) {
      dlg.style.left = '';
      dlg.style.top = '';
      dlg.style.removeProperty('--origem');
      return;
    }
    const w = dlg.offsetWidth;
    const h = dlg.offsetHeight;
    const c = olhoPos.canto;
    const s = olhoPos.s;
    let x = c.endsWith('r') ? olhoPos.x - w - 14 : olhoPos.x + s + 14;
    let y = c.startsWith('t') ? olhoPos.y : olhoPos.y + s - h;
    x = Math.max(12, Math.min(W - w - 12, x));
    y = Math.max(12, Math.min(Hh - h - 12, y));
    dlg.style.left = `${Math.round(x)}px`;
    dlg.style.top = `${Math.round(y)}px`;
    dlg.style.setProperty('--origem', `${c.endsWith('r') ? '100%' : '0%'} ${c.startsWith('t') ? '0%' : '100%'}`);
  }

  function abrirOraculo(origem) {
    if (!dlg) return;
    abridor = origem || olho;
    if (!dlg.open) {
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    }
    posicionarNota();
    if (!H && oEscrita && !oEscrita.textContent) responder('');
    if (oInput) oInput.focus();
  }
  function fecharOraculo() {
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close();
    else {
      dlg.removeAttribute('open');
      aoFechar();
    }
  }
  function aoFechar() {
    terminarEscrita();
    const alvo = abridor || olho;
    abridor = null;
    if (alvo && typeof alvo.focus === 'function') alvo.focus();
  }

  if (dlg) {
    dlg.addEventListener('close', aoFechar);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) fecharOraculo(); });
  }
  if (olho) olho.addEventListener('click', () => abrirOraculo(olho));
  if (visaoBtn) visaoBtn.addEventListener('click', () => abrirOraculo(visaoBtn));
  if (oFechar) oFechar.addEventListener('click', fecharOraculo);
  if (oForm && oInput) {
    oForm.addEventListener('submit', (e) => {
      e.preventDefault();
      responder(oInput.value);
    });
    $$('.po-chip', dlg).forEach((chip) => {
      chip.addEventListener('click', () => {
        oInput.value = chip.dataset.q || '';
        responder(oInput.value);
        oInput.focus();
      });
    });
  }

  // "visão do dia" scribbled on the hero page
  const visaoTxt = $('#visaoTxt');
  if (visaoTxt) {
    if (H) {
      try {
        visaoTxt.textContent = `“${H.oraculo.sorte()}”`;
      } catch (e) {
        visaoTxt.textContent = 'o olho tá de olhos fechados hoje. tenta mais tarde.';
      }
    } else {
      visaoTxt.textContent = 'o olho tá de olhos fechados hoje: o oráculo não carregou.';
    }
  }

  /* ==================================================================
     12. Recados — cork board through Horney.mural (channel "mural")
  ================================================================== */
  const CORES = ['amarelo', 'rosa', 'azul', 'verde'];
  const CANETAS = ['caneta', 'marcador'];
  const TACHAS = ['#d0241b', '#1b3bff', '#151311', '#f2a900'];
  const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const PAGINA = 9;
  const formR = $('#formRecado');
  const rNome = $('#rNome');
  const rTexto = $('#rTexto');
  const rConta = $('#rConta');
  const rEnviar = $('#rEnviar');
  const rStatus = $('#rStatus');
  const previa = $('#previa');
  const previaTexto = $('#previaTexto');
  const previaNome = $('#previaNome');
  const listaPostits = $('#postits');
  const quadroInfo = $('#quadroInfo');
  const verMais = $('#verMais');
  let recados = [];
  let mostrar = PAGINA;
  let destaque = null;

  function lerEstilos() {
    try {
      const o = JSON.parse(store.get(K.estilos) || '{}');
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch (e) {
      return {};
    }
  }
  let estilos = lerEstilos();
  function estiloDe(id) {
    const s = Object.prototype.hasOwnProperty.call(estilos, id) ? estilos[id] : null;
    return {
      cor: s && CORES.includes(s.c) ? s.c : 'amarelo',
      caneta: s && CANETAS.includes(s.p) ? s.p : 'caneta',
    };
  }
  function guardarEstilo(id, cor, caneta) {
    estilos = lerEstilos();
    estilos[id] = { c: cor, p: caneta };
    const ids = Object.keys(estilos);
    if (ids.length > 200) ids.slice(0, ids.length - 200).forEach((k) => delete estilos[k]);
    store.set(K.estilos, JSON.stringify(estilos));
  }
  function escolhido(nome, permitidos) {
    const n = formR ? formR.querySelector(`input[name="${nome}"]:checked`) : null;
    return n && permitidos.includes(n.value) ? n.value : permitidos[0];
  }
  function dataBR(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  function montaPostit(m) {
    const h = hash(String(m.id));
    const { cor, caneta } = estiloDe(m.id);
    const li = el('li', `postit postit--${cor} postit--${caneta}`);
    li.style.setProperty('--r', `${((h % 900) / 100 - 4.5).toFixed(2)}deg`);
    li.style.setProperty('--tacha', TACHAS[(h >>> 10) % TACHAS.length]);
    li.style.setProperty('--dy', `${(h >>> 4) % 14}px`);
    if (m.id === destaque) li.classList.add('is-nova');
    const tacha = el('span', 'tacha');
    tacha.setAttribute('aria-hidden', 'true');
    const texto = el('p', 'postit-texto', m.text);
    const assina = el('p', 'postit-assina');
    const nome = el('span', 'postit-nome', `— ${m.name}`);
    const quando = el('time', 'postit-data', dataBR(m.at));
    quando.dateTime = m.at;
    assina.append(nome, quando);
    li.append(tacha, texto, assina);
    if (m.seed) {
      const ex = el('span', 'postit-exemplo', '✱ exemplo');
      ex.title = 'recado de exemplo (fã fictício)';
      li.append(ex);
    }
    return li;
  }

  function renderRecados(focarIndice) {
    if (!listaPostits) return;
    const vis = recados.slice(0, mostrar);
    listaPostits.replaceChildren(...vis.map(montaPostit));
    const resto = recados.length - vis.length;
    if (verMais) {
      verMais.hidden = resto <= 0;
      if (resto > 0) verMais.textContent = `ver mais recados (${resto})`;
    }
    if (quadroInfo) {
      quadroInfo.textContent = recados.length
        ? `${recados.length} recado${recados.length === 1 ? '' : 's'} no mural — os mais novos primeiro.`
        : 'nenhum recado ainda. estreia o mural!';
    }
    if (focarIndice != null) {
      const alvo = listaPostits.children[focarIndice];
      if (alvo) {
        alvo.tabIndex = -1;
        alvo.focus();
      }
    }
  }

  function atualizarPrevia() {
    if (!previa || !rTexto) return;
    const cor = escolhido('cor', CORES);
    const caneta = escolhido('caneta', CANETAS);
    previa.className = `previa postit postit--${cor} postit--${caneta}`;
    if (previaTexto) previaTexto.textContent = rTexto.value.trim() || 'teu recado aparece assim';
    if (previaNome) previaNome.textContent = `— ${(rNome && rNome.value.trim()) || 'anônimo'}`;
    if (rConta) {
      const n = Array.from(rTexto.value.trim()).length;
      rConta.textContent = `${n}/500`;
      rConta.classList.toggle('is-demais', n > 500);
    }
  }

  if (formR) {
    if (rNome) {
      const apelido = store.get(K.apelido);
      if (apelido) rNome.value = apelido.slice(0, 40);
    }
    formR.addEventListener('input', atualizarPrevia);
    formR.addEventListener('change', atualizarPrevia);
    atualizarPrevia();

    if (!H) {
      if (quadroInfo) quadroInfo.textContent = 'o mural tá fora do ar agora (o módulo de recados não carregou). Recarrega a página — ou manda DM no Instagram.';
      $$('input, textarea, button', formR).forEach((n) => { n.disabled = true; });
      if (rStatus) rStatus.textContent = 'mural indisponível no momento.';
    } else {
      H.mural.list({ channel: 'mural' })
        .then((l) => {
          recados = l;
          renderRecados();
        })
        .catch(() => {
          if (quadroInfo) quadroInfo.textContent = 'não deu pra ler o mural agora. tenta recarregar.';
        });

      H.mural.subscribe((todos) => {
        recados = todos.filter((m) => m.channel === 'mural');
        estilos = lerEstilos();
        renderRecados();
      });

      formR.addEventListener('submit', (e) => {
        e.preventDefault();
        const cor = escolhido('cor', CORES);
        const caneta = escolhido('caneta', CANETAS);
        const nome = rNome ? rNome.value : '';
        if (rEnviar) rEnviar.disabled = true;
        if (rStatus) {
          rStatus.classList.remove('is-erro');
          rStatus.textContent = 'pregando…';
        }
        H.mural.post({ name: nome, text: rTexto ? rTexto.value : '', channel: 'mural' })
          .then((m) => {
            guardarEstilo(m.id, cor, caneta);
            store.set(K.apelido, Array.from(nome.trim()).slice(0, 40).join(''));
            destaque = m.id;
            if (rTexto) rTexto.value = '';
            atualizarPrevia();
            if (rStatus) rStatus.textContent = 'recado pregado no mural! ⚡😈';
            return H.mural.list({ channel: 'mural' }).then((l) => {
              recados = l;
              renderRecados();
              window.setTimeout(() => { destaque = null; }, 1500);
            });
          })
          .catch((err) => {
            if (rStatus) {
              rStatus.classList.add('is-erro');
              rStatus.textContent = (err && err.message) || 'não deu pra pregar o recado. tenta de novo.';
            }
            if (rTexto) rTexto.focus();
          })
          .then(() => {
            if (rEnviar) rEnviar.disabled = false;
          });
      });
    }
  }
  if (verMais) {
    verMais.addEventListener('click', () => {
      const primeiroNovo = mostrar;
      mostrar += PAGINA;
      renderRecados(primeiroNovo);
    });
  }

  /* ==================================================================
     13. Rabisca aí — doodle pad (pointer + keyboard, eraser, PNG)
  ================================================================== */
  const padEl = $('#pad');
  if (padEl && padEl.getContext) {
    const ctx = padEl.getContext('2d');
    const dica = $('#padDica');
    const cursor = $('#padCursor');
    const padStatus = $('#padStatus');
    const SPRAY = '#ff2bd6';
    const AMARELO = '#f2a900';
    const GRAFITE = '#151311';
    let cor = GRAFITE;
    let desenhando = false;
    let ultimo = null;
    let dpr = 1;
    let cssW = 0;
    let cssH = 0;
    const kb = { x: 40, y: 40, caneta: false };

    const redimensionar = () => {
      const w = padEl.clientWidth;
      const h = padEl.clientHeight;
      if (!w || !h) return;
      const snap = doc.createElement('canvas');
      snap.width = padEl.width;
      snap.height = padEl.height;
      if (snap.width && snap.height) snap.getContext('2d').drawImage(padEl, 0, 0);
      const prev = dpr;
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      padEl.width = Math.round(w * dpr);
      padEl.height = Math.round(h * dpr);
      cssW = w;
      cssH = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (snap.width && snap.height) ctx.drawImage(snap, 0, 0, snap.width / prev, snap.height / prev);
      kb.x = Math.min(kb.x, w - 4);
      kb.y = Math.min(kb.y, h - 4);
    };
    if ('ResizeObserver' in window) new ResizeObserver(redimensionar).observe(padEl);
    else redimensionar();

    const ponto = (e) => {
      const r = padEl.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 };
    };
    const spray = (x, y) => {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = SPRAY;
      for (let k = 0; k < 18; k++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.pow(Math.random(), 1.6) * 18;
        const s = 0.8 + Math.random() * 1.4;
        ctx.fillRect(x + Math.cos(a) * rr, y + Math.sin(a) * rr, s, s);
      }
      ctx.globalAlpha = 1;
    };
    const segmento = (a, b) => {
      if (cor === SPRAY) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        const passos = Math.max(1, Math.ceil(dist / 4));
        for (let i = 1; i <= passos; i++) spray(a.x + ((b.x - a.x) * i) / passos, a.y + ((b.y - a.y) * i) / passos);
        return;
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (cor === 'borracha') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 26;
      } else if (cor === AMARELO) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = cor;
        ctx.lineWidth = 16;
      } else {
        ctx.strokeStyle = cor;
        ctx.lineWidth = (cor === GRAFITE ? 1.6 : 3) + (b.p || 0.5) * 2.4;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    };
    const sumirDica = () => { if (dica) dica.classList.add('is-gone'); };

    padEl.addEventListener('pointerdown', (e) => {
      desenhando = true;
      padEl.setPointerCapture(e.pointerId);
      ultimo = ponto(e);
      segmento(ultimo, { x: ultimo.x + 0.1, y: ultimo.y, p: ultimo.p });
      sumirDica();
      e.preventDefault();
    });
    padEl.addEventListener('pointermove', (e) => {
      if (!desenhando) return;
      const evs = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) {
        const p = ponto(ev);
        segmento(ultimo, p);
        ultimo = p;
      }
    });
    const parar = () => {
      desenhando = false;
      ultimo = null;
    };
    padEl.addEventListener('pointerup', parar);
    padEl.addEventListener('pointercancel', parar);

    // keyboard drawing: arrows move the nib, space/enter lifts or lowers the pen
    const moverCursor = () => {
      if (cursor) cursor.style.transform = `translate(${fx(kb.x)}px, ${fx(kb.y)}px)`;
    };
    padEl.addEventListener('focus', () => {
      if (cursor) cursor.classList.add('is-on');
      moverCursor();
    });
    padEl.addEventListener('blur', () => {
      if (cursor) cursor.classList.remove('is-on', 'is-baixa');
      kb.caneta = false;
    });
    padEl.addEventListener('keydown', (e) => {
      const passo = e.shiftKey ? 24 : 8;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -passo;
      else if (e.key === 'ArrowRight') dx = passo;
      else if (e.key === 'ArrowUp') dy = -passo;
      else if (e.key === 'ArrowDown') dy = passo;
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        kb.caneta = !kb.caneta;
        if (cursor) cursor.classList.toggle('is-baixa', kb.caneta);
        if (padStatus) padStatus.textContent = kb.caneta ? 'caneta abaixada: as setas desenham' : 'caneta levantada: as setas só movem';
        if (kb.caneta) {
          segmento({ x: kb.x, y: kb.y, p: 0.5 }, { x: kb.x + 0.1, y: kb.y, p: 0.5 });
          sumirDica();
        }
        return;
      } else return;
      e.preventDefault();
      const de = { x: kb.x, y: kb.y, p: 0.5 };
      kb.x = Math.max(2, Math.min((cssW || padEl.clientWidth) - 2, kb.x + dx));
      kb.y = Math.max(2, Math.min((cssH || padEl.clientHeight) - 2, kb.y + dy));
      if (kb.caneta) {
        segmento(de, { x: kb.x, y: kb.y, p: 0.5 });
        sumirDica();
      }
      moverCursor();
    });

    const ferramentas = $$('.rabisco-ferramentas [data-cor]');
    ferramentas.forEach((b) => {
      b.addEventListener('click', () => {
        cor = b.dataset.cor;
        ferramentas.forEach((o) => {
          const on = o === b;
          o.classList.toggle('is-on', on);
          o.setAttribute('aria-pressed', String(on));
        });
      });
    });
    const limpar = $('#padLimpar');
    if (limpar) {
      limpar.addEventListener('click', () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, padEl.width, padEl.height);
        ctx.restore();
        if (dica) dica.classList.remove('is-gone');
        if (padStatus) padStatus.textContent = 'folha limpa.';
      });
    }
    const salvar = $('#padSalvar');
    if (salvar) {
      salvar.addEventListener('click', () => {
        const out = doc.createElement('canvas');
        out.width = padEl.width;
        out.height = padEl.height;
        const o = out.getContext('2d');
        o.fillStyle = '#fffdf7';
        o.fillRect(0, 0, out.width, out.height);
        o.drawImage(padEl, 0, 0);
        const a = doc.createElement('a');
        a.download = 'rabisco-horney.png';
        a.href = out.toDataURL('image/png');
        doc.body.appendChild(a);
        a.click();
        a.remove();
        if (padStatus) padStatus.textContent = 'rabisco salvo como rabisco-horney.png';
      });
    }
  }
})();
