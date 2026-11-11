/* HORNEY — 14 · LAN HOUSE — núcleo: storage, sons, gerenciador de janelas, desktop, boot, documentos.
   Carregado (defer) depois de ../assets/oraculo.js e antes de browser.js / apps.js, que penduram
   LH.browse, LH.openChat, LH.play e LH.pauseMusic neste mesmo objeto. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const NS = 'http://www.w3.org/2000/svg';
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = matchMedia('(max-width: 900px)');
  const reduced = () => mqReduce.matches;
  const mobile = () => mqMobile.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');
  const H = window.Horney && window.Horney.mural && window.Horney.oraculo ? window.Horney : null;

  /* ================= Storage (horney:lan-house:*) ================= */
  const PREFIX = 'horney:lan-house:';
  const store = {
    get(k, fb) {
      try {
        const v = localStorage.getItem(PREFIX + k);
        return v == null ? fb : JSON.parse(v);
      } catch (e) { return fb; }
    },
    set(k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* sem storage: só memória */ }
    }
  };

  /* ================= Tiny helpers ================= */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgUse(id, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#' + id);
    s.append(u);
    return s;
  }
  function extLink(label, href, cls) {
    const a = el('a', cls || null, label);
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const handlers = {};
  const on = (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); };
  const emit = (name, data) => { (handlers[name] || []).slice().forEach((fn) => fn(data)); };

  /* ================= Nick ================= */
  function cleanNick(s) {
    return Array.from(String(s == null ? '' : s).replace(/\s+/g, ' ').trim()).slice(0, 40).join('').trim();
  }
  let nick = cleanNick(store.get('nick', ''));
  const getNick = () => nick || 'visitante';
  function paintNick() { $$('.js-nick').forEach((n) => { n.textContent = getNick(); }); }
  function setNick(v) {
    nick = cleanNick(v) || 'visitante';
    store.set('nick', nick);
    paintNick();
    emit('nick', nick);
  }

  /* ================= Data: shows & photos (one array each) ================= */
  const IG = 'https://www.instagram.com/horney.band/';
  const SHOWS = [
    { date: '2026-09-17', title: 'ROCK NIGHT @ FFFRONT', where: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso', blurb: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.', link: IG, linkPast: 'Fotos no IG ↗', linkNext: 'Infos no IG ↗' },
    { date: '2026-10-03', title: 'HORNEY AO VIVO', where: 'LOCAL NÃO INFORMADO', blurb: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤', link: IG, linkPast: 'Fotos no IG ↗', linkNext: 'Infos no IG ↗' },
    { date: '2026-10-09', title: 'ÚLTIMO SHOW DO ANO', where: 'LOCAL EM BREVE — fica de olho no insta', blurb: 'Último show do ano. Local em breve — fica de olho no IG.', link: IG, linkPast: 'Fotos no IG ↗', linkNext: 'Infos no IG ↗' }
  ];
  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function showStatus(s) {
    const t = todayKey();
    return s.date < t ? 'past' : s.date === t ? 'today' : 'next';
  }
  function upcomingShows() {
    return SHOWS.filter((s) => showStatus(s) !== 'past').sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  function parseDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const PHOTOS = [
    { src: '../assets/ig-post-1.jpg', w: 640, h: 640, name: 'cartaz_chamas.jpg', alt: 'Pôster com a banda HORNEY dentro de um aro de chamas laranja e magenta' },
    { src: '../assets/ig-post-2.jpg', w: 640, h: 640, name: 'duda_microfone.jpg', alt: 'Duda Maiolini cantando no microfone, luz vermelha, guitarrista ao fundo' },
    { src: '../assets/live-crowd.jpg', w: 1366, h: 768, name: 'plateia_lotada.jpg', alt: 'Vocalista de costas diante de uma plateia lotada' },
    { src: '../assets/ig-post-4.jpg', w: 640, h: 640, name: 'um_recado_importante.jpg', alt: 'Guitarrista de cabelo cacheado em luz vermelha com o texto “UM RECADO IMPORTANTE”' },
    { src: '../assets/sympla-rock-night.jpg', w: 1179, h: 662, name: 'flyer_rock_night.jpg', alt: 'Flyer do Rock Night na FFFront, São Paulo, com HORNEY e Mastrobiso' },
    { src: '../assets/ig-post-3.jpg', w: 640, h: 480, name: 'ao_vivo_azul.jpg', alt: 'Frame de vídeo ao vivo em luz azul' },
    { src: '../assets/ig-post-5.jpg', w: 640, h: 639, name: 'chifrinhos.jpg', alt: 'Público fazendo chifrinhos depois de um show da HORNEY' },
    { src: '../assets/ig-reel-1.jpg', w: 360, h: 640, name: 'reel_pos_show.jpg', alt: 'Frame de reel do Instagram da banda' }
  ];

  /* ================= Sounds (Web Audio, muted by default) ================= */
  const prefs = Object.assign({ sound: false, dnd: false }, store.get('prefs', {}));
  let actx = null;
  function audio() {
    if (!actx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { actx = new AC(); } catch (e) { return null; }
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(ctx, t0, freq, dur, type, gain) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.07, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  const SFX = {
    on: [[0, 880, 0.09], [0.08, 1320, 0.12]],
    msg: [[0, 1046, 0.12, 'triangle'], [0.11, 784, 0.2, 'triangle']],
    signin: [[0, 523, 0.14, 'triangle'], [0.1, 659, 0.14, 'triangle'], [0.2, 784, 0.14, 'triangle'], [0.3, 1046, 0.3, 'triangle']],
    nudge: [[0, 150, 0.08, 'square', 0.05], [0.09, 120, 0.08, 'square', 0.05], [0.18, 150, 0.08, 'square', 0.05], [0.27, 110, 0.14, 'square', 0.05]],
    balloon: [[0, 1318, 0.07, 'sine', 0.05], [0.07, 1760, 0.1, 'sine', 0.04]],
    boot: [[0, 392, 1.1, 'triangle', 0.04], [0.04, 523, 1.1, 'triangle', 0.04], [0.08, 659, 1.1, 'triangle', 0.04], [0.14, 784, 1.2, 'triangle', 0.04]],
    done: [[0, 988, 0.08], [0.08, 1318, 0.16]],
    error: [[0, 220, 0.18, 'square', 0.035], [0.2, 165, 0.26, 'square', 0.035]],
    off: [[0, 784, 0.18, 'triangle'], [0.16, 523, 0.18, 'triangle'], [0.32, 392, 0.45, 'triangle']]
  };
  function sfx(name) {
    if (!prefs.sound) return;
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    (SFX[name] || []).forEach(([d, f, du, ty, g]) => tone(ctx, t + d, f, du, ty, g));
  }

  /* ================= Announcer & balloons ================= */
  const announcer = $('#announcer');
  let annT = 0;
  function announce(text) {
    clearTimeout(annT);
    announcer.textContent = '';
    annT = setTimeout(() => { announcer.textContent = text; }, 60);
  }
  const balloon = $('#balloon');
  let balloonT = 0;
  function notify(title, text, opts = {}) {
    $('#balloon-title').textContent = title;
    $('#balloon-text').textContent = text;
    balloon.hidden = false;
    balloon.classList.remove('is-in');
    if (!reduced()) { void balloon.offsetWidth; balloon.classList.add('is-in'); }
    clearTimeout(balloonT);
    balloonT = setTimeout(() => { balloon.hidden = true; }, opts.ms || 7500);
    announce(title + ': ' + text);
    if (opts.sound !== false) sfx('balloon');
  }
  $('#balloon-x').addEventListener('click', () => { balloon.hidden = true; clearTimeout(balloonT); });

  /* Lan-house life: rare ambient balloons (≥45 s apart, "não perturbe" stops them, off under reduced motion). */
  const LAN_LINES = [
    ['Atendente', 'Máquina 07, quer que eu coloque mais meia hora? Só gritar.'],
    ['Máquina 03', 'O moleque da máquina 03 tá jogando CS no volume máximo de novo. Foi mal.'],
    ['Central de segurança', 'Seu antivírus está desatualizado desde 2004.'],
    ['Atendente', 'Alguém esqueceu um pen drive de 128 MB na máquina 05.'],
    ['Máquina 03', '“ei, que som é esse aí? manda o nome da banda no MSN”'],
    ['Atualizações automáticas', 'Há 1 atualização importante disponível. Ninguém nesta lan vai instalar.'],
    ['Atendente', 'A impressora tá sem tinta. Trabalho de escola só amanhã.'],
    ['Atendente', 'Proibido baixar coisa no eMula na rede da lan. (HORNEY pode, termina no Spotify mesmo.)']
  ];
  let ambientT = 0;
  let ambientIdx = Math.floor(Math.random() * LAN_LINES.length);
  let lastBalloonAt = 0;
  function scheduleAmbient() {
    clearTimeout(ambientT);
    if (!session.started || prefs.dnd || reduced() || document.hidden) return;
    ambientT = setTimeout(fireAmbient, 45000 + Math.random() * 50000);
  }
  function fireAmbient() {
    if (prefs.dnd || reduced() || document.hidden) return;
    if (!balloon.hidden || Date.now() - lastBalloonAt < 45000) { scheduleAmbient(); return; }
    const [t, x] = LAN_LINES[ambientIdx++ % LAN_LINES.length];
    lastBalloonAt = Date.now();
    notify(t, x);
    scheduleAmbient();
  }

  /* ================= Tray toggles ================= */
  const sndBtn = $('#snd-btn');
  const dndBtn = $('#dnd-btn');
  function paintPrefs() {
    sndBtn.setAttribute('aria-pressed', String(prefs.sound));
    sndBtn.title = prefs.sound ? 'Som: ligado' : 'Som: desligado';
    $('use', sndBtn).setAttribute('href', prefs.sound ? '#i-snd-on' : '#i-snd-off');
    dndBtn.setAttribute('aria-pressed', String(prefs.dnd));
    dndBtn.title = prefs.dnd ? 'Não perturbe: ligado (sem avisos da lan)' : 'Não perturbe: desligado';
    $('use', dndBtn).setAttribute('href', prefs.dnd ? '#i-bell-off' : '#i-bell');
  }
  sndBtn.addEventListener('click', () => {
    prefs.sound = !prefs.sound;
    store.set('prefs', prefs);
    paintPrefs();
    if (prefs.sound) sfx('on');
    announce(prefs.sound ? 'Som ligado.' : 'Som desligado.');
  });
  dndBtn.addEventListener('click', () => {
    prefs.dnd = !prefs.dnd;
    store.set('prefs', prefs);
    paintPrefs();
    if (prefs.dnd) { clearTimeout(ambientT); balloon.hidden = true; }
    else scheduleAmbient();
    announce(prefs.dnd ? 'Não perturbe ligado: a lan fica quieta.' : 'Não perturbe desligado.');
  });

  /* ================= Window manager ================= */
  const desktop = $('#desktop');
  const iconsEl = $('#icons');
  const tasksEl = $('#tasks');
  const taskbar = $('#taskbar');
  const wins = new Map();
  let zTop = 20;
  let cascade = 0;

  $$('.win').forEach((w) => {
    const st = { el: w, task: null, opener: null, x: null, y: null };
    wins.set(w.id, st);
    w.addEventListener('pointerdown', () => { if (!w.classList.contains('is-active')) activate(w); }, true);
    w.addEventListener('focusin', () => { if (!w.classList.contains('is-active')) activate(w); });
    w.addEventListener('animationend', (e) => { if (e.target === w) w.classList.remove('is-opening', 'is-nudge'); });
    const bar = $('.win__bar', w);
    bar.addEventListener('pointerdown', (e) => startDrag(e, st, bar));
    bar.addEventListener('dblclick', (e) => {
      if (e.target.closest('button') || mobile() || !$('[data-act="max"]', w)) return;
      toggleMax(w);
    });
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.closest('.win') !== w) return;
      const act = b.dataset.act;
      if (act === 'close') closeWin(w);
      else if (act === 'min') minimizeWin(w);
      else if (act === 'max') toggleMax(w);
    });
  });

  function makeTask(st) {
    const b = el('button', 'task');
    b.type = 'button';
    b.append(svgUse('i-' + (st.el.dataset.icon || 'txt')), el('span', 'task__t', st.el.dataset.title));
    b.setAttribute('aria-label', st.el.dataset.title);
    b.addEventListener('click', () => {
      const w = st.el;
      if (w.hidden) openWin(w.id, null);
      else if (w.classList.contains('is-active') && !mobile()) minimizeWin(w);
      else { activate(w); w.focus({ preventScroll: true }); }
    });
    tasksEl.append(b);
    return b;
  }

  function setWinTitle(id, title) {
    const st = wins.get(id);
    if (!st) return;
    st.el.dataset.title = title;
    if (st.task) {
      $('.task__t', st.task).textContent = title;
      st.task.setAttribute('aria-label', title);
    }
  }

  function visibleWins() {
    return [...wins.values()].filter((st) => !st.el.hidden).sort((a, b) => (Number(a.el.style.zIndex) || 0) - (Number(b.el.style.zIndex) || 0));
  }
  function topWin() {
    const v = visibleWins();
    return v.length ? v[v.length - 1].el : null;
  }

  function syncTasks() {
    wins.forEach((st) => {
      if (st.task) st.task.setAttribute('aria-pressed', String(!st.el.hidden && st.el.classList.contains('is-active')));
    });
    const sheet = mobile() && visibleWins().length > 0;
    desktop.classList.toggle('has-sheet', sheet);
    iconsEl.inert = sheet;
  }

  function activate(w) {
    wins.forEach((st) => { if (st.el !== w) st.el.classList.remove('is-active'); });
    w.classList.add('is-active');
    if (zTop > 900) {
      zTop = 20;
      [...wins.values()].sort((a, b) => (Number(a.el.style.zIndex) || 0) - (Number(b.el.style.zIndex) || 0))
        .forEach((st) => { st.el.style.zIndex = String(++zTop); });
    }
    w.style.zIndex = String(++zTop);
    syncTasks();
    saveWins();
  }

  /* Top strip (CSS --win-top) stays free of title bars so the fixed exit link never covers window controls. */
  function winTop() {
    return parseFloat(getComputedStyle(root).getPropertyValue('--win-top')) || 0;
  }

  function setPos(st, x, y) {
    const w = st.el;
    const dw = desktop.clientWidth;
    const dh = desktop.clientHeight;
    const ww = w.offsetWidth;
    const top = winTop();
    const nx = Math.round(clamp(x, Math.min(0, 120 - ww), Math.max(0, dw - 120)));
    const ny = Math.round(clamp(y, top, Math.max(top, dh - 34)));
    w.style.left = nx + 'px';
    w.style.top = ny + 'px';
    st.x = nx;
    st.y = ny;
  }

  function place(st) {
    if (mobile()) return;
    if (st.x != null) { setPos(st, st.x, st.y); return; }
    const w = st.el;
    const dw = desktop.clientWidth;
    const dh = desktop.clientHeight;
    const ww = w.offsetWidth;
    const wh = w.offsetHeight;
    const off = (cascade++ % 6) * 28;
    const x = clamp((dw - ww) / 2 + 40 + off, 8, Math.max(8, dw - ww - 8));
    const top = winTop();
    const y = clamp((dh - wh) / 2 - 40 + off, top, Math.max(top, dh - wh - 8));
    setPos(st, x, y);
  }

  function animIn(w) {
    if (reduced()) return;
    w.classList.remove('is-opening');
    void w.offsetWidth;
    w.classList.add('is-opening');
  }

  function openWin(id, opener, opts = {}) {
    const st = wins.get(id);
    if (!st) return null;
    const w = st.el;
    const wasHidden = w.hidden;
    const wasClosed = !st.task;
    if (opener instanceof HTMLElement && !w.contains(opener)) st.opener = opener;
    w.hidden = false;
    if (!st.task) st.task = makeTask(st);
    if (wasHidden) {
      place(st);
      if (!opts.restore) animIn(w);
    }
    activate(w);
    if (wasClosed) w.dispatchEvent(new CustomEvent('win:open', { detail: opts }));
    if (wasHidden) w.dispatchEvent(new CustomEvent('win:show'));
    if (opts.focus !== false) w.focus({ preventScroll: true });
    saveWins();
    return w;
  }

  function focusHome() {
    const first = $('.dicon', iconsEl);
    if (first) first.focus({ preventScroll: true });
  }

  function minimizeWin(w, opts = {}) {
    const st = wins.get(w.id);
    w.hidden = true;
    w.classList.remove('is-active');
    w.dispatchEvent(new CustomEvent('win:hide'));
    syncTasks();
    saveWins();
    if (!opts.silent && st.task && st.task.getClientRects().length) st.task.focus();
  }

  function closeWin(w) {
    const st = wins.get(w.id);
    w.hidden = true;
    w.classList.remove('is-active', 'is-max');
    if (st.task) { st.task.remove(); st.task = null; }
    w.dispatchEvent(new CustomEvent('win:hide'));
    w.dispatchEvent(new CustomEvent('win:close'));
    syncTasks();
    saveWins();
    const opener = st.opener;
    st.opener = null;
    const top = topWin();
    if (mobile() && top) { activate(top); top.focus({ preventScroll: true }); return; }
    if (opener && opener.isConnected && opener.getClientRects().length && !opener.closest('[inert]')) { opener.focus({ preventScroll: true }); return; }
    if (top) { activate(top); top.focus({ preventScroll: true }); return; }
    focusHome();
  }

  function setMax(w, on) {
    w.classList.toggle('is-max', on);
    const b = $('[data-act="max"]', w);
    if (b) b.setAttribute('aria-label', on ? 'Restaurar' : 'Maximizar');
  }
  function toggleMax(w) {
    setMax(w, !w.classList.contains('is-max'));
    saveWins();
  }

  function startDrag(e, st, bar) {
    const w = st.el;
    if (e.button !== 0 || e.target.closest('button') || mobile() || w.classList.contains('is-max')) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = w.offsetLeft;
    const oy = w.offsetTop;
    bar.setPointerCapture(e.pointerId);
    let px = sx;
    let py = sy;
    let raf = 0;
    const move = (ev) => {
      px = ev.clientX;
      py = ev.clientY;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; setPos(st, ox + px - sx, oy + py - sy); });
    };
    const up = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      setPos(st, ox + px - sx, oy + py - sy);
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      saveWins();
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }

  /* Persistence of open windows + positions */
  let saveT = 0;
  function saveWins() {
    if (!session.started) return;
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const out = {};
      wins.forEach((st, id) => {
        if (!st.task) return;
        out[id] = { m: st.el.hidden ? 1 : 0, M: st.el.classList.contains('is-max') ? 1 : 0, x: st.x, y: st.y, z: Number(st.el.style.zIndex) || 0 };
      });
      store.set('wins', out);
    }, 200);
  }
  function restoreWins() {
    const saved = store.get('wins', null);
    if (!saved || typeof saved !== 'object') return 0;
    const entries = Object.keys(saved)
      .filter((id) => wins.has(id) && saved[id] && typeof saved[id] === 'object')
      .map((id) => [id, saved[id]])
      .sort((a, b) => (Number(a[1].z) || 0) - (Number(b[1].z) || 0));
    entries.forEach(([id, s]) => {
      const st = wins.get(id);
      if (Number.isFinite(s.x) && Number.isFinite(s.y)) { st.x = s.x; st.y = s.y; }
      openWin(id, null, { focus: false, restore: true });
      if (s.M && !mobile()) setMax(st.el, true);
      if (s.m) minimizeWin(st.el, { silent: true });
    });
    return entries.length;
  }

  window.addEventListener('resize', () => {
    if (mobile()) return;
    wins.forEach((st) => { if (!st.el.hidden && st.x != null) setPos(st, st.x, st.y); });
  });
  mqMobile.addEventListener('change', () => {
    wins.forEach((st) => { if (!st.el.hidden) place(st); });
    syncTasks();
  });

  /* Nudge / flash a window (MSN "chamar atenção") */
  function shake(w) {
    if (reduced()) {
      w.classList.add('is-flash');
      setTimeout(() => w.classList.remove('is-flash'), 650);
      return;
    }
    w.classList.remove('is-nudge');
    void w.offsetWidth;
    w.classList.add('is-nudge');
  }

  /* ================= Desktop icons & global delegation ================= */
  let lastPtr = 'mouse';
  document.addEventListener('pointerdown', (e) => { lastPtr = e.pointerType || 'mouse'; }, true);

  function selectIcon(icon) {
    $$('.dicon.is-sel', iconsEl).forEach((i) => { if (i !== icon) i.classList.remove('is-sel'); });
    if (icon) { icon.classList.add('is-sel'); icon.focus({ preventScroll: true }); }
  }

  function activateTarget(t) {
    if (startMenu.contains(t)) setStart(false);
    if (!cal.hidden && cal.contains(t)) setCal(false);
    const d = t.dataset;
    if (d.url != null) { if (typeof LH.browse === 'function') LH.browse(d.url, t); return; }
    if (d.chat) { if (typeof LH.openChat === 'function') LH.openChat(d.chat, t); return; }
    if (d.play != null) { if (typeof LH.play === 'function') LH.play(Number(d.play), t); return; }
    if (d.doc) { openDoc(d.doc, t); return; }
    if (d.open) openWin(d.open, t);
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open],[data-url],[data-chat],[data-play],[data-doc]');
    if (!t) {
      if (e.target === desktop || e.target.closest('.wall')) selectIcon(null);
      return;
    }
    if (t.classList.contains('dicon') && e.detail > 0 && lastPtr === 'mouse' && !mobile()) {
      selectIcon(t);
      return;
    }
    e.preventDefault();
    activateTarget(t);
  });
  iconsEl.addEventListener('dblclick', (e) => {
    const t = e.target.closest('.dicon');
    if (!t || mobile()) return;
    selectIcon(null);
    activateTarget(t);
  });

  /* ================= Start menu & calendar ================= */
  const startBtn = $('#start-btn');
  const startMenu = $('#start-menu');
  const clockBtn = $('#clock');
  const cal = $('#cal');

  function setStart(open) {
    startMenu.hidden = !open;
    startBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      setCal(false);
      const f = $('button, a', startMenu);
      if (f) f.focus();
    }
  }
  function setCal(open) {
    cal.hidden = !open;
    clockBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      setStart(false);
      const now = new Date();
      calView = new Date(now.getFullYear(), now.getMonth(), 1);
      renderCal();
      renderCalShows();
      $('#cal-prev').focus();
    }
  }
  startBtn.addEventListener('click', () => setStart(startMenu.hidden));
  clockBtn.addEventListener('click', () => setCal(cal.hidden));
  document.addEventListener('pointerdown', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) setStart(false);
    if (!cal.hidden && !cal.contains(e.target) && !clockBtn.contains(e.target)) setCal(false);
  });
  startMenu.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !startMenu.contains(e.relatedTarget) && e.relatedTarget !== startBtn) setStart(false);
  });
  cal.addEventListener('focusout', (e) => {
    if (e.relatedTarget && !cal.contains(e.relatedTarget) && e.relatedTarget !== clockBtn) setCal(false);
  });

  let calView = new Date();
  const calGrid = $('#cal-grid');
  function renderCal() {
    const y = calView.getFullYear();
    const m = calView.getMonth();
    $('#cal-title').textContent = calView.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const frag = document.createDocumentFragment();
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((d) => {
      const s = el('span', 'cal__dow', d);
      s.setAttribute('aria-hidden', 'true');
      frag.append(s);
    });
    const lead = new Date(y, m, 1).getDay();
    for (let i = 0; i < lead; i++) frag.append(el('span'));
    const days = new Date(y, m + 1, 0).getDate();
    const tk = todayKey();
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + pad(m + 1) + '-' + pad(d);
      const show = SHOWS.find((s) => s.date === key);
      const c = el(show ? 'button' : 'span', 'cal__d', String(d));
      if (key === tk) c.classList.add('is-today');
      if (show) {
        const stt = showStatus(show);
        c.type = 'button';
        c.classList.add('is-show');
        if (stt === 'past') c.classList.add('is-past');
        c.setAttribute('aria-label', d + ': ' + show.title + (stt === 'past' ? ' (já rolou)' : stt === 'today' ? ' (HOJE!!!)' : ' (próximo)') + '. Abrir a página de shows');
        c.dataset.url = 'www.horney.band/shows';
      }
      frag.append(c);
    }
    calGrid.replaceChildren(frag);
  }
  $('#cal-prev').addEventListener('click', () => { calView = new Date(calView.getFullYear(), calView.getMonth() - 1, 1); renderCal(); });
  $('#cal-next').addEventListener('click', () => { calView = new Date(calView.getFullYear(), calView.getMonth() + 1, 1); renderCal(); });

  /* Under the grid: the next show (or the honest empty state) and every show date as a jump to its month. */
  const calNextShow = $('#cal-next-show');
  const calShows = $('#cal-shows');
  function renderCalShows() {
    const up = upcomingShows();
    if (up.length) {
      const n = up[0];
      calNextShow.textContent = (showStatus(n) === 'today' ? 'HOJE: ' : 'próximo show: ') + parseDate(n.date).toLocaleDateString('pt-BR') + ' · ' + n.title;
    } else {
      calNextShow.replaceChildren('sem shows marcados — ', extLink('cola no Instagram', IG), ' pra saber primeiro');
    }
    const LABEL = { past: 'já rolou', today: 'HOJE!!!', next: 'vem aí' };
    const items = SHOWS.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).map((s) => {
      const d = parseDate(s.date);
      const st = showStatus(s);
      const b = el('button', 'cal__sh');
      b.type = 'button';
      b.append(el('b', null, pad(d.getDate()) + '/' + pad(d.getMonth() + 1)), el('span', null, s.title), el('small', null, LABEL[st]));
      b.setAttribute('aria-label', d.toLocaleDateString('pt-BR') + ', ' + s.title + ', ' + LABEL[st] + '. Mostrar no calendário');
      b.addEventListener('click', () => {
        calView = new Date(d.getFullYear(), d.getMonth(), 1);
        renderCal();
      });
      const li = el('li');
      li.append(b);
      return li;
    });
    calShows.replaceChildren(...items);
  }

  /* ================= Clock & lan-house session timer ================= */
  const phoneClock = $('#phone-clock');
  function tick() {
    const d = new Date();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    clockBtn.textContent = time;
    clockBtn.title = date;
    clockBtn.setAttribute('aria-label', time + ', ' + date + '. Abrir calendário de shows');
    phoneClock.textContent = time;
  }
  let clockT = 0;
  function startClock() {
    clearTimeout(clockT);
    tick();
    clockT = setTimeout(startClock, (60 - new Date().getSeconds()) * 1000 + 50);
  }

  const session = { started: false, start: 0 };
  const usageEl = $('#usage');
  const phoneUsage = $('#phone-usage');
  const usageT = el('span', 'usage__t');
  const usageP = el('span', 'usage__p');
  usageEl.replaceChildren(usageT, usageP);
  let usageTimer = 0;
  let freeHour = false;
  function fmtDur(s) { return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60); }
  function paintUsage() {
    const s = Math.max(0, Math.floor((Date.now() - session.start) / 1000));
    if (!freeHour && s >= 60) {
      freeHour = true;
      if (!prefs.dnd) {
        lastBalloonAt = Date.now();
        notify('Atendente', 'Relaxa, Máquina 07: essa hora é por conta da casa. Aproveita e ouve o ANTI-RASO inteiro ⚡');
      }
    }
    const price = 'R$ ' + (s * 2 / 3600).toFixed(2).replace('.', ',');
    usageT.textContent = 'tempo de uso ' + fmtDur(s) + ' · ';
    usageP.textContent = freeHour ? price + ' → por conta da casa' : price;
    usageEl.classList.toggle('is-free', freeHour);
    phoneUsage.textContent = fmtDur(s);
  }
  function startUsage() {
    clearInterval(usageTimer);
    if (!session.started || document.hidden) return;
    paintUsage();
    usageTimer = setInterval(paintUsage, 1000);
  }

  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-tab-hidden', document.hidden);
    if (document.hidden) { clearInterval(usageTimer); clearTimeout(ambientT); }
    else { startUsage(); scheduleAmbient(); startClock(); }
    emit('visibility', document.hidden);
  });
  mqReduce.addEventListener('change', () => { scheduleAmbient(); emit('motion', reduced()); });

  /* ================= Meus documentos (explorer) ================= */
  const exView = $('#ex-view');
  const exPath = $('#ex-path');
  const exUp = $('#ex-up');
  const exStatus = $('#ex-status');
  let exDir = 'root';

  function fileBtn(label, icon, onAct) {
    const b = el('button', 'file');
    b.type = 'button';
    if (typeof icon === 'string') b.append(svgUse(icon));
    else b.append(icon);
    b.append(el('span', null, label));
    b.addEventListener('click', () => onAct(b));
    return b;
  }
  function renderDocs(dir, focusFirst) {
    exDir = dir;
    const items = [];
    if (dir === 'fotos') {
      PHOTOS.forEach((p, i) => {
        const img = el('img');
        img.src = p.src;
        img.alt = '';
        img.width = p.w;
        img.height = p.h;
        img.loading = 'lazy';
        items.push(fileBtn(p.name, img, (b) => openImage(i, b)));
      });
      exPath.textContent = '\\FOTOS';
      exUp.disabled = false;
      exStatus.textContent = PHOTOS.length + ' objeto(s) · fotos da HORNEY';
    } else {
      items.push(fileBtn('FOTOS', 'i-folder', () => renderDocs('fotos', true)));
      items.push(fileBtn('VÍDEOS', 'i-folder', (b) => { if (typeof LH.browse === 'function') LH.browse('www.youtube.com/horney', b); }));
      items.push(fileBtn('LEIA-ME.txt', 'i-txt', (b) => openDoc('leiame', b)));
      items.push(fileBtn('SHOWS.txt', 'i-txt', (b) => openDoc('shows', b)));
      exPath.textContent = '';
      exUp.disabled = true;
      exStatus.textContent = '4 objeto(s)';
    }
    exView.replaceChildren(...items);
    if (focusFirst && items[0]) items[0].focus();
  }
  exUp.addEventListener('click', () => renderDocs('root', true));
  $('#win-docs').addEventListener('win:open', () => renderDocs('root', false));

  /* ================= Image viewer ================= */
  const imgView = $('#img-view');
  let imgIdx = 0;
  function showImage(i) {
    imgIdx = (i + PHOTOS.length) % PHOTOS.length;
    const p = PHOTOS[imgIdx];
    imgView.width = p.w;
    imgView.height = p.h;
    imgView.src = p.src;
    imgView.alt = p.alt;
    $('#img-cap').textContent = p.alt;
    $('#img-count').textContent = (imgIdx + 1) + ' de ' + PHOTOS.length;
    $('#t-img').textContent = p.name + ' — Visualizador de imagens';
    setWinTitle('win-img', p.name);
  }
  function openImage(i, opener) {
    showImage(i);
    openWin('win-img', opener);
  }
  $('#img-prev').addEventListener('click', () => showImage(imgIdx - 1));
  $('#img-next').addEventListener('click', () => showImage(imgIdx + 1));
  $('#win-img').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); showImage(imgIdx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); showImage(imgIdx + 1); }
  });

  /* ================= Notepad: LEIA-ME.txt & SHOWS.txt ================= */
  const npText = $('#np-text');
  function txt(lines) {
    const frag = document.createDocumentFragment();
    lines.forEach((ln) => {
      if (Array.isArray(ln)) {
        ln.forEach((part) => {
          if (typeof part === 'string') frag.append(part);
          else frag.append(extLink(part.label, part.href));
        });
        frag.append('\n');
      } else frag.append(ln + '\n');
    });
    return frag;
  }
  function buildLeiame() {
    return txt([
      'HORNEY — LEIA-ME.txt',
      '====================',
      '',
      'Quarteto de alt/indie rock de Joinville (SC). Punk, hardcore e grunge no sangue, com toques de MPB — e cantando em português desde 2026. Voz e letras: Duda Maiolini. Composição com Rafa Bello. +2 que fazem o barulho todo acontecer.',
      '',
      ' ORIGEM ....... Joinville (SC), Brasil',
      ' SOM .......... alt / indie rock — punk,',
      '                hardcore, grunge e uma',
      '                pitada de MPB',
      ' FORMAÇÃO ..... quarteto',
      '   Duda (Eduarda) Maiolini .. voz & letras',
      '   Rafa Bello ............... composição',
      '   + 2',
      ' IDIOMA ....... português, desde 2026',
      '',
      '── PALAVRA DA DUDA ──',
      '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.”',
      '“A Horney não é uma banda que vai tocar só rock pesado, nem uma banda que vai tocar só música melancólica.”',
      '— Duda Maiolini, voz & letras',
      '',
      'DISCOGRAFIA',
      '  ANTI-RASO ........ EP · 30.07.2026 · 4 faixas · 7.8/10 na Unglued',
      '    01  OFF! ................................ 3:19',
      '    02  QUEBRA-CABEÇA (feat. Dani Buarque) .. 4:20',
      '    03  MERGULHAR ........................... 3:44',
      '    04  ROMÂNTICA ........................... 2:28',
      '        4 faixas · 13:53',
      '  MERGULHAR ........ single · 2026',
      '  OFF! ............. single · 13.11.2025',
      '  Four Rooms for Four Fools .. EP · 2022',
      '',
      'CRÉDITOS',
      '  voz & letras ...... Duda (Eduarda) Maiolini',
      '  composição ........ Rafa Bello',
      '  feat. ............. Dani Buarque em QUEBRA-CABEÇA',
      '  Fool\'s Game ....... clipe oficial (2022), dir. Rique Duarte',
      '',
      'NÚMEROS',
      '  7.3K seguidores no IG · 1.8K ouvintes/mês no Spotify',
      '',
      'LINKS',
      ['  ', { label: 'instagram.com/horney.band', href: 'https://www.instagram.com/horney.band/' }],
      ['  ', { label: 'tiktok.com/@horney.band', href: 'https://www.tiktok.com/@horney.band' }],
      ['  ', { label: 'threads.com/@horney.band', href: 'https://www.threads.com/@horney.band' }],
      ['  ', { label: 'youtube.com/@bandaHorney', href: 'https://www.youtube.com/@bandaHorney' }],
      ['  ', { label: '♫ Artista no Spotify', href: 'https://open.spotify.com/artist/5zJVmieIGGEeOKbIrXmhZi' }],
      ['  ', { label: 'Todas as plataformas', href: 'https://ps.algohits.com/horney-anti-raso' }],
      ['  ', { label: 'Unglued: 7.8/10', href: 'https://www.unglued.com.br/reviews/anti-raso' }],
      ['  contato: ', { label: 'DM no Instagram', href: 'https://ig.me/m/horney.band' }],
      '',
      'greetz: todo mundo que cola nos shows ⚡😈',
      '-- fim do arquivo --'
    ]);
  }
  function buildShowsTxt() {
    const LABEL = { past: '[JÁ FOI]', today: '[HOJE!!!]', next: '[PRÓXIMO]' };
    const up = upcomingShows();
    const lines = [
      'SHOWS.txt — HORNEY 2026',
      '=======================',
      'SAI DE CASA E COLE NOS SHOWS!!! ⚡️😈',
      ''
    ];
    if (up.length) {
      const n = up[0];
      lines.push('PRÓXIMO: ' + parseDate(n.date).toLocaleDateString('pt-BR') + ' — ' + n.title + ' — ' + n.where);
    } else {
      lines.push('PRÓXIMO: sem shows marcados — cola no Instagram pra saber primeiro.');
    }
    lines.push('');
    let nextSeen = false;
    SHOWS.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((s) => {
      const st = showStatus(s);
      let label = LABEL[st];
      if (st === 'next') { label = nextSeen ? '[EM BREVE]' : '[PRÓXIMO]'; nextSeen = true; }
      const d = parseDate(s.date);
      const wd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
      lines.push(label + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + wd + ' · ' + s.title);
      lines.push('         ' + s.where);
      lines.push('         ' + s.blurb);
      lines.push(['         ', { label: st === 'past' ? s.linkPast : s.linkNext, href: s.link }]);
      lines.push('');
    });
    lines.push('==========================================');
    lines.push(['quer HORNEY na tua cidade? chama no ', { label: 'DM', href: 'https://ig.me/m/horney.band' }, '.']);
    lines.push('-- fim do arquivo --');
    return txt(lines);
  }
  const DOCS = {
    leiame: { name: 'LEIA-ME.txt', build: buildLeiame },
    shows: { name: 'SHOWS.txt', build: buildShowsTxt }
  };
  function openDoc(key, opener) {
    const d = DOCS[key];
    if (!d) return;
    npText.replaceChildren(d.build());
    npText.scrollTop = 0;
    $('#t-notepad').textContent = d.name + ' — Bloco de notas';
    $('#np-status').textContent = d.name + ' · ' + npText.textContent.split('\n').length + ' linhas · UTF-8';
    setWinTitle('win-notepad', d.name);
    openWin('win-notepad', opener);
  }
  $('#win-notepad').addEventListener('win:open', () => {
    if (!npText.firstChild) {
      npText.replaceChildren(buildLeiame());
      $('#np-status').textContent = 'LEIA-ME.txt · UTF-8';
    }
  });

  /* ================= Lixeira ================= */
  const trashStatus = $('#trash-status');
  $$('[data-trash]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.trash === '0') {
      trashStatus.textContent = 'Restaurar musica_rasa.mp3? Não. Aqui é ANTI-RASO: música rasa fica na lixeira.';
      sfx('error');
    } else {
      trashStatus.textContent = 'Restaurado no lugar certo: o mural do Horkut. Manda o recado que você não mandou.';
      if (typeof LH.browse === 'function') LH.browse('www.horkut.com.br/horney', b);
    }
  }));
  $('#trash-empty').addEventListener('click', () => {
    trashStatus.textContent = 'Não dá pra esvaziar: a lixeira é da lan. O próximo cliente também precisa jogar coisa rasa fora.';
    sfx('error');
  });

  /* ================= Boot → login ================= */
  const boot = $('#boot');
  const biosWrap = $('#boot-bios');
  const bios = $('#bios-lines');
  const splash = $('#boot-splash');
  const splashBar = $('#splash-bar');
  const login = $('#login');
  const nickInput = $('#nick-input');
  const loginCancel = $('#login-cancel');
  const BIOS = [
    'LANBIOS v2.06  (C) 2006 Lan House ANTI-RASO',
    '',
    'CPU: AMD Sempron(tm) 2800+  1.60 GHz',
    'Memória ................ 256 MB  OK',
    'HD primário ............ 40 GB   OK',
    'Gravador de CD-RW ...... OK',
    'Placa de rede (LAN) .... OK',
    'Mouse de bolinha ....... OK (limpar a bolinha)',
    '',
    'Máquina 07 · servidor: ATENDENTE · R$ 2,00/hora',
    'Iniciando HorneyOS xp…'
  ];
  let bootStage = 'off';
  let bootTimers = [];
  let bootThen = null;
  const later = (fn, ms) => { bootTimers.push(setTimeout(fn, ms)); };
  function clearBoot() { bootTimers.forEach(clearTimeout); bootTimers = []; }
  function lockDesktop(lock) {
    desktop.inert = lock;
    taskbar.inert = lock;
  }
  function runBoot(withLogin) {
    clearBoot();
    setStart(false);
    setCal(false);
    boot.classList.remove('is-off');
    boot.classList.add('is-on');
    lockDesktop(true);
    bootThen = withLogin ? showLogin : finishBoot;
    login.hidden = true;
    if (reduced()) { biosWrap.hidden = true; splash.hidden = true; bootThen(); return; }
    bootStage = 'bios';
    biosWrap.hidden = false;
    splash.hidden = true;
    bios.textContent = '';
    BIOS.forEach((line, i) => later(() => { bios.textContent += line + '\n'; }, 60 + i * 70));
    const t1 = 60 + BIOS.length * 70 + 250;
    later(() => {
      bootStage = 'splash';
      biosWrap.hidden = true;
      splash.hidden = false;
      splashBar.classList.remove('is-go');
      void splashBar.offsetWidth;
      splashBar.classList.add('is-go');
      sfx('boot');
    }, t1);
    later(() => bootThen(), t1 + 1000);
  }
  function skipBoot() {
    clearBoot();
    if (bootThen) bootThen();
  }
  function showLogin() {
    clearBoot();
    bootStage = 'login';
    biosWrap.hidden = true;
    splash.hidden = true;
    login.hidden = false;
    nickInput.value = nick || '';
    $('#login-msg').textContent = '';
    loginCancel.hidden = !session.started;
    nickInput.focus();
  }
  function finishBoot() {
    clearBoot();
    const first = !session.started;
    bootStage = 'off';
    boot.classList.remove('is-on');
    boot.classList.add('is-off');
    root.classList.add('is-returning');
    lockDesktop(false);
    if (first) startSession(true);
    else startBtn.focus();
  }
  login.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = cleanNick(nickInput.value);
    const wasStarted = session.started;
    setNick(v || 'visitante');
    finishBoot();
    if (wasStarted) notify('Nick trocado', 'Agora você é ' + getNick() + ' nesta máquina. Os próximos recados saem com esse nome.');
  });
  loginCancel.addEventListener('click', finishBoot);
  $('#relogin-btn').addEventListener('click', () => {
    setStart(false);
    boot.classList.remove('is-off');
    boot.classList.add('is-on');
    lockDesktop(true);
    bootThen = showLogin;
    showLogin();
  });

  document.addEventListener('pointerdown', () => {
    if (bootStage === 'bios' || bootStage === 'splash') skipBoot();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (bootStage === 'bios' || bootStage === 'splash') {
      if (['Shift', 'Control', 'Alt', 'Meta'].indexOf(e.key) === -1) { e.preventDefault(); skipBoot(); }
      return;
    }
    if (e.key !== 'Escape') return;
    if (bootStage === 'login') { if (session.started) finishBoot(); return; }
    if (!shutdown.hidden) { reboot(); return; }
    if (!startMenu.hidden) { setStart(false); startBtn.focus(); return; }
    if (!cal.hidden) { setCal(false); clockBtn.focus(); return; }
    const w = document.activeElement && document.activeElement.closest ? document.activeElement.closest('.win') : null;
    if (w) { e.preventDefault(); closeWin(w); }
  });

  /* ================= Shutdown ================= */
  const shutdown = $('#shutdown');
  function reboot() {
    shutdown.hidden = true;
    runBoot(false);
  }
  $('#shutdown-btn').addEventListener('click', () => {
    setStart(false);
    emit('shutdown');
    sfx('off');
    lockDesktop(true);
    shutdown.hidden = false;
    $('#reboot-btn').focus();
  });
  $('#reboot-btn').addEventListener('click', reboot);

  /* ================= Session ================= */
  function startSession(firstLogin) {
    session.started = true;
    session.start = Date.now();
    startUsage();
    scheduleAmbient();
    const restored = restoreWins();
    emit('start');
    if (firstLogin) {
      if (!restored && !mobile()) {
        if (typeof LH.browse === 'function') LH.browse('www.horkut.com.br/horney', null, { focus: false });
        openWin('win-msn', null, { focus: false });
      }
      focusHome();
      lastBalloonAt = Date.now();
      setTimeout(() => notify('Máquina 07 liberada', 'Bem-vindo(a), ' + getNick() + '! ' + (mobile() ? 'Toca nos ícones pra abrir.' : 'Clique duas vezes nos ícones.') + ' O Olho tá online no MSN ◎'), 600);
    }
  }

  /* ================= Public API for browser.js / apps.js ================= */
  const LH = window.LH = {
    $, $$, el, svgUse, extLink, store, H, reduced, mobile, sfx, notify, announce, on, emit,
    openWin, closeWin, activate, setWinTitle, shake, fmtWhen,
    isOpen: (id) => { const st = wins.get(id); return !!(st && !st.el.hidden); },
    nick: getNick, paintNick,
    SHOWS, showStatus, upcomingShows, parseDate, PHOTOS, openImage, openDoc,
    browse: null, openChat: null, play: null, pauseMusic: null
  };

  /* ================= Init (after browser.js / apps.js registered) ================= */
  function init() {
    paintNick();
    paintPrefs();
    startClock();
    root.classList.toggle('is-tab-hidden', document.hidden);
    if (nick) {
      boot.classList.add('is-off');
      startSession(false);
    } else {
      runBoot(true);
    }
  }
  /* Deferred scripts all run before DOMContentLoaded, so browser.js and apps.js are registered by then. */
  document.addEventListener('DOMContentLoaded', init);
})();
