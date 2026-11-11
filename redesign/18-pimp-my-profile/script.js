/* H◎RNEYSPACE 2.0 — Pimp My Profile · concept 18.
   Vanilla JS. Consumes ../assets/oraculo.js (window.Horney.mural / window.Horney.oraculo).
   Every fan-provided string is rendered with textContent / text nodes. */
(function () {
  'use strict';

  /* ================= helpers ================= */
  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(pointer: fine)');
  var mqPhone = window.matchMedia('(max-width: 800px)');
  function reduced() { return mqReduce.matches; }
  function phone() { return mqPhone.matches; }
  function onMQ(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function cleanText(s, max) {
    return Array.from(String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ')).slice(0, max).join('').trim();
  }
  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') el.textContent = String(v);
        else if (k === 'class') el.className = v;
        else el.setAttribute(k, v === true ? '' : String(v));
      });
    }
    if (kids != null) {
      (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
        if (c == null || c === false) return;
        el.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
      });
    }
    return el;
  }
  function visible(el) { return !!(el && el.isConnected && el.getClientRects().length); }
  function smooth() { return reduced() ? 'auto' : 'smooth'; }
  function dayNumber(d) { d = d || new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }

  var HM = window.Horney && window.Horney.mural && window.Horney.oraculo ? window.Horney : null;

  /* ================= local storage (own prefix) ================= */
  var PREFIX = 'horney:pimp-my-profile:';
  var store = {
    get: function (k, fb) {
      try { var v = localStorage.getItem(PREFIX + k); return v === null ? fb : JSON.parse(v); } catch (e) { return fb; }
    },
    set: function (k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { /* private mode: memory only */ }
    },
    del: function (k) {
      try { localStorage.removeItem(PREFIX + k); } catch (e) { /* ignore */ }
    }
  };

  /* ================= toast + screen-reader live line ================= */
  var toastEl = $('#toast');
  var toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3600);
  }
  var srEl = $('#sr-live');
  var sayT = 0;
  function say(msg) {
    srEl.textContent = '';
    clearTimeout(sayT);
    sayT = setTimeout(function () { srEl.textContent = msg; }, 40);
  }

  /* ================= constants ================= */
  var IG = 'https://www.instagram.com/horney.band/';
  var SKINS = {
    classico: { label: 'Clássico 2004', theme: '#6698cb', pat: null },
    scene: { label: 'Scene Kid 2006', theme: '#000000', pat: 'zebra' },
    antiraso: { label: 'ANTI-RASO 2026', theme: '#050a3a', pat: null },
    amarelo: { label: 'Amarelo HORNEY', theme: '#0a0a0a', pat: 'olhos' },
    luna: { label: 'Luna XP', theme: '#245edb', pat: null },
    horkut: { label: 'Horkut', theme: '#e8eefa', pat: null },
    xerox: { label: 'Xerox', theme: '#ffffff', pat: 'ruido' }
  };
  var PATTERNS = ['padrao', 'liso', 'estrelas', 'xadrez', 'olhos', 'chamas', 'raios', 'zebra'];
  var TRAILS = ['nenhum', 'glitter', 'olhos'];
  var FXS = ['liso', 'glitter', 'arco-iris', 'fogo', 'antiraso', 'pisca'];
  var WIDGETS = ['visitas', 'relogio', 'humor', 'tocando', 'olho'];
  var WIDGET_META = {
    visitas: { title: 'contador de visitas', icon: '🔢' },
    relogio: { title: 'relógio', icon: '🕒' },
    humor: { title: 'humor de hoje', icon: '🌡' },
    tocando: { title: 'tocando agora', icon: '🎧' },
    olho: { title: 'Olho que te segue', icon: '👁' }
  };
  var CORE = ['perfil', 'player', 'contato', 'merch', 'quiz', 'blurbs', 'blog', 'boletins', 'top8', 'videos', 'fotos', 'comentarios'];
  var DEFAULT_SEQ = ['perfil', 'player', 'blurbs', 'contato', 'blog', 'boletins', 'top8', 'videos', 'merch', 'fotos', 'quiz', 'comentarios'];
  var DEFAULT_HEAD = 'SAI DE CASA E COLE NOS SHOWS!!!';
  var MOODS = ['ANTI-RASO 😈⚡️', 'mergulhando 🌊', 'quebrando a cabeça 🧩', 'romântica 💔', 'OFF! 🔌', 'com saudade do palco 🎸', 'sem superfície nenhuma ◎'];
  var GLYPHS = ['🖤', '😈', '⚡', '🌊', '🎸', '🧩', '🔌', '◎'];
  var GLYPH_NAMES = ['coração preto', 'diabinho', 'raio', 'onda', 'guitarra', 'quebra-cabeça', 'tomada', 'olho'];
  var MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  var MESES_UP = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  /* ================= state ================= */
  function defaults() {
    return {
      v: 1, skin: 'classico', bg: 'padrao', bgc: '', trail: 'glitter', head: DEFAULT_HEAD, fx: 'liso',
      widgets: ['visitas'], seq: normSeq(DEFAULT_SEQ, ['visitas']), desk: false, pos: {}, min: [], olho: null
    };
  }
  function panelIds(widgets) {
    return CORE.concat(widgets.filter(function (w) { return w !== 'olho'; }));
  }
  function normSeq(seq, widgets) {
    var known = panelIds(widgets);
    var out = [];
    (Array.isArray(seq) ? seq : []).forEach(function (id) {
      if (known.indexOf(id) > -1 && out.indexOf(id) < 0) out.push(id);
    });
    DEFAULT_SEQ.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    var at = out.indexOf('contato') + 1;
    widgets.forEach(function (w) {
      if (w === 'olho' || out.indexOf(w) > -1) return;
      out.splice(at++, 0, w);
    });
    return out;
  }
  function cleanPos(p) {
    if (!Array.isArray(p) || p.length !== 4) return null;
    var n = p.map(Number);
    if (n.some(function (x) { return !isFinite(x); })) return null;
    var w = clamp(Math.round(n[1]), 2, 12);
    var c = clamp(Math.round(n[0]), 0, 12 - w);
    var y = clamp(Math.round(n[2]), 0, 20000);
    var hh = Math.round(n[3]);
    hh = hh <= 0 ? 0 : clamp(hh, 120, 4000);
    return [c, w, y, hh];
  }
  function sanitize(o) {
    var s = defaults();
    if (!o || typeof o !== 'object') return s;
    if (typeof o.skin === 'string' && Object.prototype.hasOwnProperty.call(SKINS, o.skin)) s.skin = o.skin;
    if (PATTERNS.indexOf(o.bg) > -1) s.bg = o.bg;
    if (typeof o.bgc === 'string' && /^#[0-9a-f]{6}$/i.test(o.bgc)) s.bgc = o.bgc.toLowerCase();
    if (TRAILS.indexOf(o.trail) > -1) s.trail = o.trail;
    if (typeof o.head === 'string') s.head = cleanText(o.head, 60) || DEFAULT_HEAD;
    if (FXS.indexOf(o.fx) > -1) s.fx = o.fx;
    if (Array.isArray(o.widgets)) s.widgets = WIDGETS.filter(function (w) { return o.widgets.indexOf(w) > -1; });
    s.seq = normSeq(o.seq, s.widgets);
    s.desk = o.desk === true;
    if (o.pos && typeof o.pos === 'object' && !Array.isArray(o.pos)) {
      Object.keys(o.pos).forEach(function (id) {
        if (s.seq.indexOf(id) < 0) return;
        var p = cleanPos(o.pos[id]);
        if (p) s.pos[id] = p;
      });
    }
    if (Array.isArray(o.min)) {
      s.min = o.min.filter(function (id, i) { return typeof id === 'string' && s.seq.indexOf(id) > -1 && o.min.indexOf(id) === i; });
    }
    if (Array.isArray(o.olho) && o.olho.length === 2 && isFinite(o.olho[0]) && isFinite(o.olho[1])) {
      s.olho = [clamp(+o.olho[0], 0, 1), clamp(+o.olho[1], 0, 1)];
    }
    return s;
  }
  var state = sanitize(store.get('state', null));
  function save() { store.set('state', state); }

  /* ================= generated tiles (canvas → PNG, once) ================= */
  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function canvasOf(size) {
    var c = doc.createElement('canvas');
    c.width = c.height = size;
    return c;
  }
  function tile(size, draw) {
    var c = canvasOf(size);
    draw(c.getContext('2d'), size);
    return c.toDataURL('image/png');
  }
  function wrapDraw(T, x, y, fn) {
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) fn(x + i * T, y + j * T);
  }
  function starPath(g, x, y, r, inner, pts, rot) {
    g.beginPath();
    for (var i = 0; i < pts * 2; i++) {
      var rad = i % 2 ? r * inner : r;
      var a = rot + i * Math.PI / pts;
      g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    g.closePath();
  }
  function almond(g, x, y, w) {
    g.beginPath();
    g.moveTo(x - w, y);
    g.quadraticCurveTo(x, y - w * 0.85, x + w, y);
    g.quadraticCurveTo(x, y + w * 0.85, x - w, y);
    g.closePath();
  }
  var PAT_DRAW = {
    estrelas: function (g, T, ink, r) {
      g.fillStyle = ink;
      for (var i = 0; i < 11; i++) {
        var x = r() * T, y = r() * T, s = 2.5 + r() * 7, rot = r() * Math.PI;
        wrapDraw(T, x, y, function (a, b) { starPath(g, a, b, s, 0.32, 4, rot); g.fill(); });
      }
    },
    xadrez: function (g, T, ink) {
      g.fillStyle = ink;
      var q = T / 2;
      g.fillRect(0, 0, q, q);
      g.fillRect(q, q, q, q);
    },
    olhos: function (g, T, ink) {
      [[T * 0.25, T * 0.27], [T * 0.75, T * 0.77]].forEach(function (p) {
        g.strokeStyle = ink;
        g.fillStyle = ink;
        g.lineWidth = 2.5;
        almond(g, p[0], p[1], T * 0.16);
        g.stroke();
        g.beginPath();
        g.arc(p[0], p[1], T * 0.05, 0, Math.PI * 2);
        g.fill();
        for (var k = 0; k < 10; k++) {
          var a = k * Math.PI / 5;
          g.beginPath();
          g.moveTo(p[0] + Math.cos(a) * T * 0.2, p[1] + Math.sin(a) * T * 0.17);
          g.lineTo(p[0] + Math.cos(a) * T * 0.235, p[1] + Math.sin(a) * T * 0.21);
          g.stroke();
        }
      });
    },
    chamas: function (g, T, ink) {
      g.fillStyle = ink;
      for (var i = 0; i < 4; i++) {
        var x0 = i * T / 4, w = T / 4, base = T, hg = T * (i % 2 ? 0.5 : 0.78);
        g.beginPath();
        g.moveTo(x0, base);
        g.bezierCurveTo(x0, base - hg * 0.5, x0 + w * 0.55, base - hg * 0.55, x0 + w * 0.48, base - hg);
        g.bezierCurveTo(x0 + w * 0.9, base - hg * 0.6, x0 + w, base - hg * 0.32, x0 + w, base);
        g.closePath();
        g.fill();
      }
    },
    raios: function (g, T, ink) {
      g.fillStyle = ink;
      [[T * 0.28, T * 0.08, 1], [T * 0.74, T * 0.52, 0.8]].forEach(function (b) {
        var x = b[0], y = b[1], k = b[2] * T / 128;
        g.beginPath();
        g.moveTo(x + 10 * k, y);
        g.lineTo(x - 8 * k, y + 30 * k);
        g.lineTo(x + 2 * k, y + 30 * k);
        g.lineTo(x - 10 * k, y + 56 * k);
        g.lineTo(x + 18 * k, y + 22 * k);
        g.lineTo(x + 6 * k, y + 22 * k);
        g.lineTo(x + 18 * k, y);
        g.closePath();
        g.fill();
      });
    },
    zebra: function (g, T, ink) {
      g.fillStyle = ink;
      var n = 4, sp = T / n;
      function yAt(x, k) { return k * sp + Math.sin((x / T) * Math.PI * 2 + (k % n) * 1.3) * sp * 0.28; }
      function th(x, k) { return sp * (0.2 + 0.14 * Math.sin((x / T) * Math.PI * 4 + (k % n))); }
      for (var k = 0; k <= n; k++) {
        g.beginPath();
        var x;
        for (x = 0; x <= T; x += 2) g.lineTo(x, yAt(x, k) - th(x, k));
        for (x = T; x >= 0; x -= 2) g.lineTo(x, yAt(x, k) + th(x, k));
        g.closePath();
        g.fill();
      }
    },
    ruido: function (g, T, ink, r, dark) {
      var img = g.createImageData(T, T), d = img.data, c = dark ? 255 : 0;
      for (var i = 0; i < d.length; i += 4) {
        if (r() < 0.22) {
          d[i] = d[i + 1] = d[i + 2] = c;
          d[i + 3] = (14 + r() * 48) | 0;
        }
      }
      g.putImageData(img, 0, 0);
    }
  };
  var patCache = {};
  function patternURL(key, dark) {
    var ck = key + (dark ? ':d' : ':l');
    if (patCache[ck]) return patCache[ck];
    var strong = key === 'zebra';
    var ink = dark ? 'rgba(255,255,255,' + (strong ? 0.85 : 0.16) + ')' : 'rgba(0,0,0,' + (strong ? 0.82 : 0.12) + ')';
    var T = key === 'xadrez' ? 64 : key === 'ruido' ? 160 : 128;
    patCache[ck] = tile(T, function (g) { PAT_DRAW[key](g, T, ink, rng(1312 + key.length * 7), dark); });
    return patCache[ck];
  }
  function glitterURL() {
    return tile(96, function (g, T) {
      var r = rng(77);
      var cols = ['#fff6c8', '#ffd75e', '#ff8be9', '#ffffff', '#c98c00', '#8fe3ff', '#ff2bd6'];
      g.fillStyle = '#f2a900';
      g.fillRect(0, 0, T, T);
      for (var i = 0; i < 300; i++) {
        g.fillStyle = cols[(r() * cols.length) | 0];
        var s = 1 + r() * 2.6;
        g.fillRect(r() * T, r() * T, s, s);
      }
    });
  }
  function isDark(c) {
    c = String(c).trim();
    var m = /^#([0-9a-f]{6})$/i.exec(c), r, g, b;
    if (m) {
      var n = parseInt(m[1], 16);
      r = n >> 16; g = (n >> 8) & 255; b = n & 255;
    } else {
      m = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c);
      if (!m) return false;
      r = +m[1]; g = +m[2]; b = +m[3];
    }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 140;
  }

  /* ================= look: skin, wall, headline, labels ================= */
  var themeMeta = $('meta[name="theme-color"]');
  var headEl = $('#headline');
  var brandName = $('#brand-name');
  var brandTail = brandName.lastChild;
  var brandTag = $('#brand-tag');

  function applyLook() {
    root.setAttribute('data-skin', state.skin);
    themeMeta.setAttribute('content', SKINS[state.skin].theme);
    if (state.bgc) {
      root.style.setProperty('--wall', state.bgc);
      root.style.setProperty('--wall-grad', 'none');
    } else {
      root.style.removeProperty('--wall');
      root.style.removeProperty('--wall-grad');
    }
    var key = state.bg === 'padrao' ? SKINS[state.skin].pat : state.bg === 'liso' ? null : state.bg;
    if (key) {
      var wall = getComputedStyle(root).getPropertyValue('--wall');
      root.style.setProperty('--wall-img', 'url("' + patternURL(key, isDark(wall)) + '")');
    } else {
      root.style.removeProperty('--wall-img');
    }
    relabel();
    applyHeadline();
    sparksStale = true;
    syncTrail();
  }
  function applyHeadline() {
    headEl.textContent = state.head || DEFAULT_HEAD;
    headEl.setAttribute('data-fx', state.fx);
    if (state.fx === 'glitter') ensureGlitter();
  }
  var glitterSet = false;
  function ensureGlitter() {
    if (glitterSet) return;
    glitterSet = true;
    root.style.setProperty('--glitter', 'url("' + glitterURL() + '")');
  }
  function relabel() {
    var ork = state.skin === 'horkut';
    $$('.win[data-orkut]').forEach(function (el) {
      var t = $('.win__title', el);
      if (!t.hasAttribute('data-label')) t.setAttribute('data-label', t.textContent);
      t.textContent = ork ? el.getAttribute('data-orkut') : t.getAttribute('data-label');
    });
    if (brandTail && brandTail.nodeType === 3) brandTail.nodeValue = ork ? 'RKUT' : 'RNEYspace';
    brandTag.textContent = ork ? 'rede social sem amarra gringa · feita em Joinville' : 'a place for fools';
    Object.keys(wins).forEach(function (id) { labelButtons(wins[id]); });
    syncDock();
  }

  /* ================= cursor trail (pooled particles) ================= */
  var trailCv = $('#trail');
  var tctx = trailCv.getContext('2d');
  var POOL = 90;
  var parts = [];
  var pIdx = 0;
  var trailRaf = 0;
  var tdpr = 1;
  var trailSized = false;
  var sparksStale = true;
  var sprites = { glitter: [], olhos: null };
  for (var pi = 0; pi < POOL; pi++) parts.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, decay: 0, s: 0, rot: 0, spin: 0, grav: 0, spr: null });

  /* The full-viewport canvas is only displayed (and its backing store only allocated) while
     particles are alive, so an idle page composites no extra layer. */
  function trailAllowed() { return state.trail !== 'nenhum' && mqFine.matches && !reduced(); }
  function sizeTrail() {
    tdpr = Math.min(window.devicePixelRatio || 1, 1.5);
    trailCv.width = Math.round(window.innerWidth * tdpr);
    trailCv.height = Math.round(window.innerHeight * tdpr);
    trailSized = true;
  }
  function showTrail() {
    if (trailCv.classList.contains('is-on')) return;
    if (!trailSized) sizeTrail();
    trailCv.classList.add('is-on');
  }
  function hideTrail() {
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, trailCv.width, trailCv.height);
    trailCv.classList.remove('is-on');
  }
  function killTrail() {
    for (var i = 0; i < POOL; i++) parts[i].on = false;
    if (trailRaf) cancelAnimationFrame(trailRaf);
    trailRaf = 0;
    hideTrail();
  }
  function syncTrail() {
    if (!trailAllowed()) killTrail();
    syncTrailNote();
  }
  function starSprite(color) {
    var c = canvasOf(32), g = c.getContext('2d');
    g.fillStyle = color;
    g.shadowColor = color;
    g.shadowBlur = 4;
    starPath(g, 16, 16, 12, 0.28, 4, 0);
    g.fill();
    return c;
  }
  function eyeSprite() {
    var c = canvasOf(40), g = c.getContext('2d');
    g.fillStyle = '#f2a900';
    g.beginPath(); g.arc(20, 20, 19, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111111';
    starPath(g, 20, 20, 17.5, 0.74, 12, 0); g.fill();
    g.fillStyle = '#ffffff';
    almond(g, 20, 20, 12); g.fill();
    g.fillStyle = '#111111';
    g.beginPath(); g.arc(20, 20, 4.6, 0, Math.PI * 2); g.fill();
    return c;
  }
  function readSparks() {
    sparksStale = false;
    var raw = getComputedStyle(root).getPropertyValue('--spark');
    var cols = raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!cols.length) cols = ['#ffcc00', '#ff6600'];
    sprites.glitter = cols.map(starSprite);
    if (!sprites.olhos) sprites.olhos = eyeSprite();
  }
  var lastTX = -99, lastTY = -99;
  function onTrailMove(e) {
    if (e.pointerType !== 'mouse' || !trailAllowed()) return;
    var dx = e.clientX - lastTX, dy = e.clientY - lastTY;
    if (dx * dx + dy * dy < 49) return;
    lastTX = e.clientX; lastTY = e.clientY;
    spawn(e.clientX, e.clientY, dx * dx + dy * dy > 1600 ? 2 : 1);
  }
  function spawn(x, y, n) {
    if (sparksStale) readSparks();
    showTrail();
    var eyesMode = state.trail === 'olhos';
    for (var k = 0; k < n; k++) {
      var p = parts[pIdx];
      pIdx = (pIdx + 1) % POOL;
      p.on = true;
      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = (Math.random() - 0.5) * 1.3;
      p.vy = eyesMode ? -0.3 - Math.random() * 0.5 : Math.random() * 0.6;
      p.grav = eyesMode ? 0 : 0.05;
      p.life = 1;
      p.decay = (eyesMode ? 0.018 : 0.02) + Math.random() * 0.02;
      p.s = eyesMode ? 16 + Math.random() * 10 : 9 + Math.random() * 12;
      p.rot = eyesMode ? 0 : Math.random() * Math.PI;
      p.spin = eyesMode ? 0 : (Math.random() - 0.5) * 0.2;
      p.spr = eyesMode ? sprites.olhos : sprites.glitter[(Math.random() * sprites.glitter.length) | 0];
    }
    if (!trailRaf) trailRaf = requestAnimationFrame(trailTick);
  }
  function burstAt(el, n) {
    if (!trailAllowed() || !el) return;
    var r = el.getBoundingClientRect();
    for (var i = 0; i < (n || 18); i++) {
      spawn(r.left + Math.random() * r.width, r.top + Math.random() * r.height, 1);
    }
  }
  function trailTick() {
    trailRaf = 0;
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, trailCv.width, trailCv.height);
    var live = 0;
    for (var i = 0; i < POOL; i++) {
      var p = parts[i];
      if (!p.on) continue;
      p.x += p.vx; p.y += p.vy; p.vy += p.grav; p.vx *= 0.98;
      p.rot += p.spin;
      p.life -= p.decay;
      if (p.life <= 0) { p.on = false; continue; }
      live++;
      var s = p.s * (0.4 + p.life * 0.6), cs = Math.cos(p.rot) * tdpr, sn = Math.sin(p.rot) * tdpr;
      tctx.globalAlpha = p.life;
      tctx.setTransform(cs, sn, -sn, cs, p.x * tdpr, p.y * tdpr);
      tctx.drawImage(p.spr, -s / 2, -s / 2, s, s);
    }
    tctx.globalAlpha = 1;
    if (live) trailRaf = requestAnimationFrame(trailTick);
    else hideTrail();
  }

  /* ================= window manager ================= */
  var board = $('#board');
  var colL = $('#col-l');
  var ghost = $('#ghost');
  var dock = $('#dock');
  var dockList = $('#dock-list');
  var wins = {};
  var zTop = 10;

  function titleOf(w) { return w.title.textContent; }
  function mkBtn(act, glyph, cls) {
    return h('button', { type: 'button', class: 'wb wb--' + cls, 'data-act': act, text: glyph });
  }
  function registerWin(el) {
    var id = el.getAttribute('data-win');
    var w = {
      id: id, el: el, bar: $('.win__bar', el), title: $('.win__title', el),
      float: el.classList.contains('win--float'), widget: el.classList.contains('win--widget'),
      col: el.parentNode === colL ? 'l' : 'r', btn: {}, api: null
    };
    var box = h('div', { class: 'win__btns' });
    if (!w.float) {
      w.btn.grip = mkBtn('grip', '⠿', 'grip');
      w.btn.up = mkBtn('up', '↑', 'up');
      w.btn.down = mkBtn('down', '↓', 'down');
      box.appendChild(w.btn.grip);
      box.appendChild(w.btn.up);
      box.appendChild(w.btn.down);
    }
    w.btn.min = mkBtn('min', '_', 'min');
    box.appendChild(w.btn.min);
    if (id !== 'olho') {
      w.btn.max = mkBtn('max', '□', 'max');
      box.appendChild(w.btn.max);
    }
    if (w.float || w.widget) {
      w.btn.close = mkBtn('close', '×', 'close');
      box.appendChild(w.btn.close);
    }
    w.bar.appendChild(box);
    if (!w.float) {
      w.btn.resize = h('button', { type: 'button', class: 'win__resize', 'data-act': 'resize' });
      el.appendChild(w.btn.resize);
      w.btn.resize.addEventListener('pointerdown', function (e) { onResizeDown(e, w); });
      w.btn.resize.addEventListener('keydown', function (e) { onWinKey(e, w, 'resize'); });
      w.btn.grip.addEventListener('keydown', function (e) { onWinKey(e, w, 'grip'); });
    }
    el.setAttribute('tabindex', '-1');
    wins[id] = w;
    labelButtons(w);
    w.bar.addEventListener('pointerdown', function (e) { onBarDown(e, w); });
    w.bar.addEventListener('dblclick', function (e) {
      if (e.target.closest('button, a') || id === 'olho') return;
      toggleMax(w);
    });
    el.addEventListener('pointerdown', function () { front(w); }, true);
    el.addEventListener('focusin', function () { front(w); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.classList.contains('is-max')) {
        e.stopPropagation();
        toggleMax(w);
        if (w.btn.max) w.btn.max.focus();
      }
    });
    if (ro && !w.float) ro.observe(el);
    return w;
  }
  function labelButtons(w) {
    var t = titleOf(w);
    var L = {
      grip: 'Mover ' + t + ' (setas movem, Shift+setas redimensionam)',
      up: 'Subir ' + t,
      down: 'Descer ' + t,
      min: 'Minimizar ' + t,
      max: (w.el.classList.contains('is-max') ? 'Restaurar ' : 'Maximizar ') + t,
      close: (w.widget || w.id === 'olho' ? 'Remover o widget ' : 'Fechar ') + t,
      resize: 'Redimensionar ' + t + ' (setas)'
    };
    Object.keys(w.btn).forEach(function (k) {
      w.btn[k].setAttribute('aria-label', L[k]);
      w.btn[k].setAttribute('title', L[k]);
    });
  }
  function front(w) {
    if (phone()) return;
    if (!w.float && !root.classList.contains('is-desk')) return;
    if (w.el.style.zIndex === String(zTop)) return;
    if (zTop > 600) {
      var list = Object.keys(wins).map(function (k) { return wins[k]; })
        .sort(function (a, b) { return (+a.el.style.zIndex || 0) - (+b.el.style.zIndex || 0); });
      zTop = 10;
      list.forEach(function (o) { if (o.el.style.zIndex) o.el.style.zIndex = String(++zTop); });
    }
    w.el.style.zIndex = String(++zTop);
  }
  function deskOn() { return state.desk && !phone(); }
  function isMin(id) { return state.min.indexOf(id) > -1; }

  doc.addEventListener('click', function (e) {
    var b = e.target.closest('.win [data-act]');
    if (!b) return;
    var host = b.closest('.win');
    var w = host && wins[host.getAttribute('data-win')];
    if (!w) return;
    var act = b.getAttribute('data-act');
    if (act === 'min') minimize(w);
    else if (act === 'max') toggleMax(w);
    else if (act === 'close') closeWin(w);
    else if (act === 'up' || act === 'down') {
      if (b.getAttribute('aria-disabled') !== 'true') moveSeq(w, act === 'up' ? -1 : 1);
    } else if (act === 'grip') say('Use as setas pra mover ' + titleOf(w) + ' e Shift+setas pra redimensionar.');
  });

  function minimize(w) {
    if (w.el.classList.contains('is-max')) toggleMax(w);
    if (w.float) {
      w.el.classList.add('is-min');
      syncDock();
      scheduleBlink();
    } else {
      if (!isMin(w.id)) state.min.push(w.id);
      save();
      layout();
      refreshCode();
    }
    var db = dockList.querySelector('[data-dock="' + w.id + '"]');
    if (db) db.focus();
    say(titleOf(w) + ' minimizada no dock.');
  }
  function restore(id) {
    var w = wins[id];
    if (!w) return;
    if (w.float) {
      w.el.classList.remove('is-min');
      syncDock();
      scheduleBlink();
    } else {
      state.min = state.min.filter(function (x) { return x !== id; });
      save();
      layout();
      refreshCode();
      w.el.scrollIntoView({ behavior: smooth(), block: 'start' });
    }
    front(w);
    w.el.focus({ preventScroll: true });
  }
  function toggleMax(w) {
    if (!w.btn.max) return;
    var on = !w.el.classList.contains('is-max');
    $$('.win.is-max').forEach(function (el) {
      if (el === w.el) return;
      el.classList.remove('is-max');
      var o = wins[el.getAttribute('data-win')];
      if (o && o.btn.max) { o.btn.max.textContent = '□'; labelButtons(o); }
    });
    w.el.classList.toggle('is-max', on);
    w.btn.max.textContent = on ? '❐' : '□';
    labelButtons(w);
    if (on) w.el.focus({ preventScroll: true });
    else if (deskOn()) placeAll();
    say(titleOf(w) + (on ? ' maximizada. Esc restaura.' : ' restaurada.'));
  }
  function closeWin(w) {
    if (w.id === 'im') closeIM();
    else if (w.widget || w.id === 'olho') {
      toggleWidget(w.id, false);
      wins.perfil.el.focus({ preventScroll: true });
    }
  }
  function visibleSeq(w) {
    return state.seq.filter(function (id) {
      var o = wins[id];
      return o && !isMin(id) && (phone() || o.col === w.col);
    });
  }
  function moveSeq(w, dir) {
    var vis = visibleSeq(w);
    var i = vis.indexOf(w.id), j = i + dir;
    if (i < 0 || j < 0 || j >= vis.length) return;
    var other = vis[j];
    var a = state.seq.indexOf(w.id), b = state.seq.indexOf(other);
    state.seq[a] = other;
    state.seq[b] = w.id;
    save();
    layout();
    refreshCode();
    var btn = w.btn[dir < 0 ? 'up' : 'down'];
    if (btn.getAttribute('aria-disabled') === 'true') btn = w.btn[dir < 0 ? 'down' : 'up'];
    btn.focus({ preventScroll: true });
    w.el.scrollIntoView({ block: 'nearest', behavior: smooth() });
    say(titleOf(w) + (dir < 0 ? ' subiu' : ' desceu') + ': posição ' + (j + 1) + ' de ' + vis.length + '.');
  }
  function syncUpDown() {
    Object.keys(wins).forEach(function (id) {
      var w = wins[id];
      if (w.float || !w.btn.up) return;
      var vis = visibleSeq(w);
      var i = vis.indexOf(id);
      w.btn.up.setAttribute('aria-disabled', String(i <= 0));
      w.btn.down.setAttribute('aria-disabled', String(i < 0 || i >= vis.length - 1));
    });
  }

  var MIN_W = 300;
  function metrics() {
    var W = board.clientWidth, gap = 16, colW = (W - gap * 11) / 12;
    return { W: W, gap: gap, colW: colW, step: colW + gap };
  }
  function minSpan(m) { return clamp(Math.ceil((MIN_W + m.gap) / m.step - 0.01), 2, 12); }
  /* Desktop mode: positions are grid units; rendered width never drops under MIN_W (so opening
     the editor never squeezes a panel into one word per line). Windows without a position are
     packed like the classic profile — left column at least MIN_W wide — each stacked under
     whatever already occupies its horizontal band, so default positions never overlap. */
  function placeAll() {
    var m = metrics();
    board.style.setProperty('--colw', m.colW.toFixed(2) + 'px');
    var L = clamp(minSpan(m), 3, 6);
    var shown = [], fresh = [], box = {};
    state.seq.forEach(function (id) {
      var w = wins[id];
      if (!w || isMin(id)) return;
      var p = state.pos[id];
      if (!p) {
        p = state.pos[id] = w.col === 'l' ? [0, L, 0, 0] : [L, 12 - L, 0, 0];
        fresh.push(id);
      }
      var wpx = Math.round(Math.max(p[1] * m.colW + (p[1] - 1) * m.gap, Math.min(MIN_W, m.W)));
      var x = Math.round(Math.max(0, Math.min(p[0] * m.step, m.W - wpx)));
      var s = w.el.style;
      s.left = x + 'px';
      s.width = wpx + 'px';
      s.height = p[3] ? p[3] + 'px' : '';
      w.el.classList.toggle('has-h', !!p[3]);
      box[id] = { x: x, w: wpx };
      shown.push(id);
    });
    if (fresh.length) {
      var hts = {};
      shown.forEach(function (id) { hts[id] = wins[id].el.offsetHeight; });
      var done = shown.filter(function (id) { return fresh.indexOf(id) < 0; });
      fresh.forEach(function (id) {
        var a = box[id], y = 0;
        done.forEach(function (o) {
          var b = box[o];
          if (a.x < b.x + b.w && b.x < a.x + a.w) y = Math.max(y, state.pos[o][2] + hts[o] + m.gap);
        });
        state.pos[id][2] = Math.ceil(y / 8) * 8;
        done.push(id);
      });
      save();
    }
    shown.forEach(function (id) { wins[id].el.style.top = state.pos[id][2] + 'px'; });
    fitBoard(shown.map(function (id) { return wins[id].el; }));
    lastBoardW = m.W;
  }
  function fitBoard(list) {
    if (!deskOn()) return;
    var bottom = 0;
    (list || state.seq.map(function (id) { return wins[id] && !isMin(id) ? wins[id].el : null; }).filter(Boolean))
      .forEach(function (el) { bottom = Math.max(bottom, el.offsetTop + el.offsetHeight); });
    var hgt = (bottom + 48) + 'px';
    if (board.style.height !== hgt) board.style.height = hgt;
  }
  function clearPlace() {
    Object.keys(wins).forEach(function (id) {
      var w = wins[id];
      if (w.float) return;
      var s = w.el.style;
      s.left = s.top = s.width = s.height = s.transform = s.zIndex = '';
      w.el.classList.remove('has-h');
    });
    board.style.height = '';
  }
  function layout() {
    var on = deskOn();
    root.classList.toggle('is-desk', on);
    Object.keys(wins).forEach(function (id) {
      var w = wins[id];
      if (w.float) return;
      w.el.style.order = String(state.seq.indexOf(id));
      w.el.classList.toggle('is-min', isMin(id));
    });
    if (on) placeAll();
    else clearPlace();
    syncUpDown();
    syncDock();
    syncDeskUI();
  }
  function setDesk(on, quiet) {
    if (on && phone()) {
      toast('no celular as janelas ficam empilhadas — usa ↑↓ pra reordenar');
      return;
    }
    if (on === state.desk) { layout(); return; }
    state.desk = on;
    save();
    layout();
    refreshCode();
    updateShare();
    if (!quiet) toast(on ? 'modo desktop ON — arrasta as janelas pela barra de título ⚡' : 'modo clássico: duas colunas de novo (as posições ficam guardadas)');
  }
  function unmaxAll() {
    $$('.win.is-max').forEach(function (el) {
      el.classList.remove('is-max');
      var o = wins[el.getAttribute('data-win')];
      if (o && o.btn.max) { o.btn.max.textContent = '□'; labelButtons(o); }
    });
  }
  function tidy() {
    unmaxAll();
    state.pos = {};
    state.min = [];
    state.desk = false;
    state.seq = normSeq(DEFAULT_SEQ, state.widgets);
    save();
    layout();
    refreshCode();
    updateShare();
    toast('tudo arrumado: perfil clássico de volta ✨');
  }

  /* --- drag (title bar) --- */
  var drag = null;
  function onBarDown(e, w) {
    if (e.button !== 0 || e.target.closest('button, a, input, select, textarea')) return;
    if (w.el.classList.contains('is-max')) return;
    if (w.float) { if (!phone()) startFloatDrag(e, w); return; }
    if (phone()) return;
    if (e.pointerType !== 'mouse' && !deskOn()) return;
    e.preventDefault();
    try { w.bar.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    drag = { w: w, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, started: false, raf: 0 };
    w.bar.addEventListener('pointermove', onDragMove);
    w.bar.addEventListener('pointerup', onDragEnd);
    w.bar.addEventListener('pointercancel', onDragEnd);
  }
  function onDragMove(e) {
    var d = drag;
    if (!d) return;
    d.dx = e.clientX - d.sx;
    d.dy = e.clientY - d.sy;
    if (!d.started) {
      if (Math.abs(d.dx) + Math.abs(d.dy) < 6) return;
      d.started = true;
      if (!state.desk) {
        setDesk(true, true);
        toast('modo desktop destravado — solta onde quiser ⚡');
      }
      var el = d.w.el;
      d.ox = el.offsetLeft;
      d.oy = el.offsetTop;
      d.ww = el.offsetWidth;
      d.W = board.clientWidth;
      el.classList.add('is-dragging');
      board.classList.add('show-grid');
      front(d.w);
    }
    if (!d.raf) d.raf = requestAnimationFrame(applyDrag);
  }
  function dragXY(d) {
    return { x: clamp(d.ox + d.dx, 0, Math.max(0, d.W - d.ww)), y: Math.max(0, d.oy + d.dy) };
  }
  function applyDrag() {
    var d = drag;
    if (!d) return;
    d.raf = 0;
    var p = dragXY(d);
    d.w.el.style.transform = 'translate3d(' + (p.x - d.ox) + 'px,' + (p.y - d.oy) + 'px,0)';
  }
  function onDragEnd(e) {
    var d = drag;
    drag = null;
    if (!d) return;
    var bar = d.w.bar;
    bar.removeEventListener('pointermove', onDragMove);
    bar.removeEventListener('pointerup', onDragEnd);
    bar.removeEventListener('pointercancel', onDragEnd);
    try { bar.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (d.raf) cancelAnimationFrame(d.raf);
    if (!d.started) return;
    var el = d.w.el, p = dragXY(d), m = metrics(), pos = state.pos[d.w.id];
    el.style.transform = '';
    el.classList.remove('is-dragging');
    board.classList.remove('show-grid');
    if (!pos) return;
    pos[0] = clamp(Math.round(p.x / m.step), 0, 12 - pos[1]);
    pos[2] = clamp(Math.round(p.y / 8) * 8, 0, 20000);
    save();
    placeAll();
    refreshCode();
    updateShare();
    say(titleOf(d.w) + ': coluna ' + (pos[0] + 1) + ', topo ' + pos[2] + ' pixels.');
  }

  /* --- resize (outline ghost, applied on release) --- */
  function onResizeDown(e, w) {
    if (e.button !== 0 || !deskOn()) return;
    e.preventDefault();
    e.stopPropagation();
    var el = w.el, m = metrics(), handle = w.btn.resize;
    var rs = { sx: e.clientX, sy: e.clientY, x: el.offsetLeft, y: el.offsetTop, ow: el.offsetWidth, oh: el.offsetHeight, cw: el.offsetWidth, ch: el.offsetHeight, raf: 0 };
    ghost.style.left = rs.x + 'px';
    ghost.style.top = rs.y + 'px';
    ghost.style.width = rs.ow + 'px';
    ghost.style.height = rs.oh + 'px';
    ghost.classList.add('is-on');
    board.classList.add('show-grid');
    front(w);
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    function move(ev) {
      rs.cw = clamp(rs.ow + ev.clientX - rs.sx, Math.min(MIN_W, m.W - rs.x), m.W - rs.x);
      rs.ch = Math.max(120, rs.oh + ev.clientY - rs.sy);
      if (!rs.raf) rs.raf = requestAnimationFrame(function () {
        rs.raf = 0;
        ghost.style.width = Math.round(rs.cw) + 'px';
        ghost.style.height = Math.round(rs.ch) + 'px';
      });
    }
    function up(ev) {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      try { handle.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
      if (rs.raf) cancelAnimationFrame(rs.raf);
      ghost.classList.remove('is-on');
      board.classList.remove('show-grid');
      var pos = state.pos[w.id];
      if (!pos || (rs.cw === rs.ow && rs.ch === rs.oh)) return;
      pos[1] = clamp(Math.round((rs.cw + m.gap) / m.step), Math.min(minSpan(m), 12 - pos[0]), 12 - pos[0]);
      pos[3] = clamp(Math.round(rs.ch / 8) * 8, 120, 4000);
      save();
      placeAll();
      refreshCode();
      updateShare();
      say(titleOf(w) + ': largura ' + pos[1] + ' colunas, altura ' + pos[3] + ' pixels.');
    }
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  /* --- keyboard move / resize --- */
  function onWinKey(e, w, mode) {
    var k = e.key;
    if (k !== 'ArrowLeft' && k !== 'ArrowRight' && k !== 'ArrowUp' && k !== 'ArrowDown') return;
    if (!deskOn()) return;
    var p = state.pos[w.id];
    if (!p) return;
    e.preventDefault();
    if (mode === 'resize' || e.shiftKey) {
      if (k === 'ArrowLeft') p[1] = Math.max(Math.min(minSpan(metrics()), 12 - p[0]), p[1] - 1);
      if (k === 'ArrowRight') p[1] = Math.min(12 - p[0], p[1] + 1);
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        var cur = p[3] || w.el.offsetHeight;
        p[3] = clamp(cur + (k === 'ArrowUp' ? -24 : 24), 120, 4000);
      }
    } else {
      if (k === 'ArrowLeft') p[0] = Math.max(0, p[0] - 1);
      if (k === 'ArrowRight') p[0] = Math.min(12 - p[1], p[0] + 1);
      if (k === 'ArrowUp') p[2] = Math.max(0, p[2] - 24);
      if (k === 'ArrowDown') p[2] = Math.min(20000, p[2] + 24);
    }
    front(w);
    save();
    placeAll();
    refreshCode();
    say(titleOf(w) + ': coluna ' + (p[0] + 1) + ', largura ' + p[1] + ', topo ' + p[2] + (p[3] ? ', altura ' + p[3] : '') + '.');
  }

  /* --- floating windows (HorneyIM, olho) --- */
  function setFloatPos(w, x, y, persist) {
    var s = w.el.style;
    s.left = Math.round(x) + 'px';
    s.top = Math.round(y) + 'px';
    s.right = 'auto';
    s.bottom = 'auto';
    if (persist && w.id === 'olho') {
      state.olho = [x / window.innerWidth, y / window.innerHeight];
      save();
    }
  }
  function clampFloat(w) {
    if (!w || w.el.hidden || phone() || !w.el.style.left) return;
    var r = w.el.getBoundingClientRect();
    var x = clamp(r.left, 80 - r.width, window.innerWidth - 80);
    var y = clamp(r.top, 0, Math.max(0, window.innerHeight - 48));
    if (x !== r.left || y !== r.top) setFloatPos(w, x, y, false);
  }
  function startFloatDrag(e, w) {
    e.preventDefault();
    var el = w.el, bar = w.bar, r = el.getBoundingClientRect();
    var fd = { sx: e.clientX, sy: e.clientY, x: r.left, y: r.top, dx: 0, dy: 0, raf: 0, ww: r.width };
    try { bar.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    el.classList.add('is-dragging');
    front(w);
    function at() {
      return {
        x: clamp(fd.x + fd.dx, 80 - fd.ww, window.innerWidth - 80),
        y: clamp(fd.y + fd.dy, 0, Math.max(0, window.innerHeight - 48))
      };
    }
    function move(ev) {
      fd.dx = ev.clientX - fd.sx;
      fd.dy = ev.clientY - fd.sy;
      if (!fd.raf) fd.raf = requestAnimationFrame(function () {
        fd.raf = 0;
        var p = at();
        el.style.transform = 'translate3d(' + (p.x - fd.x) + 'px,' + (p.y - fd.y) + 'px,0)';
      });
    }
    function up(ev) {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      try { bar.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
      if (fd.raf) cancelAnimationFrame(fd.raf);
      el.classList.remove('is-dragging');
      el.style.transform = '';
      if (fd.dx || fd.dy) {
        var p = at();
        setFloatPos(w, p.x, p.y, true);
      }
    }
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }

  /* --- dock --- */
  function syncDock() {
    if (!dockList) return;
    dockList.textContent = '';
    var ids = state.seq.filter(function (id) { return wins[id] && isMin(id); });
    ['im', 'olho'].forEach(function (id) {
      var w = wins[id];
      if (w && !w.el.hidden && w.el.classList.contains('is-min')) ids.push(id);
    });
    ids.forEach(function (id) {
      var w = wins[id];
      var b = h('button', { type: 'button', class: 'dock__item', 'data-dock': id, 'aria-label': 'Restaurar ' + titleOf(w) }, [
        h('span', { 'aria-hidden': 'true', text: w.el.getAttribute('data-icon') || '▢' }),
        h('span', { text: titleOf(w) })
      ]);
      b.addEventListener('click', function () { restore(id); });
      dockList.appendChild(h('li', null, b));
    });
    var show = ids.length > 0 || root.classList.contains('is-desk');
    dock.hidden = !show;
    root.classList.toggle('has-dock', show);
  }
  $('#dock-tidy').addEventListener('click', tidy);

  /* --- size observers --- */
  var lastBoardW = 0;
  var fitRaf = 0;
  var ro = 'ResizeObserver' in window ? new ResizeObserver(function () {
    if (fitRaf) return;
    fitRaf = requestAnimationFrame(function () {
      fitRaf = 0;
      if (!deskOn()) return;
      if (board.clientWidth !== lastBoardW) placeAll();
      else fitBoard();
    });
  }) : null;
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      if (trailCv.classList.contains('is-on')) sizeTrail();
      else trailSized = false;
      if (!ro && deskOn()) placeAll();
      clampFloat(wins.im);
      clampFloat(wins.olho);
    });
  });
  onMQ(mqPhone, function () {
    layout();
    unmaxAll();
  });

  /* ================= eyes (SVG, follow pointer, blink) ================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var eyes = [];
  var eyeN = 0;
  function sv(tag, attrs) {
    var el = doc.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function makeEye() {
    var n = ++eyeN;
    var svg = sv('svg', { viewBox: '-50 -50 100 100', class: 'eye-svg', 'aria-hidden': 'true', focusable: 'false' });
    var pts = [];
    for (var i = 0; i < 32; i++) {
      var rr = i % 2 ? 33 : 45, a = i * Math.PI / 16;
      pts.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr).toFixed(1));
    }
    var shape = 'M-30 0 Q0 -27 30 0 Q0 27 -30 0Z';
    svg.appendChild(sv('circle', { r: 49, fill: '#f2a900' }));
    svg.appendChild(sv('polygon', { points: pts.join(' '), fill: '#111111' }));
    var defs = sv('defs');
    var cp = sv('clipPath', { id: 'eyeclip-' + n });
    cp.appendChild(sv('path', { d: shape }));
    defs.appendChild(cp);
    svg.appendChild(defs);
    svg.appendChild(sv('path', { d: shape, fill: '#ffffff' }));
    var g = sv('g', { 'clip-path': 'url(#eyeclip-' + n + ')' });
    var pupil = sv('g', { class: 'eye-pupil' });
    pupil.appendChild(sv('circle', { r: 11, fill: '#111111' }));
    pupil.appendChild(sv('circle', { cx: -4, cy: -4, r: 3.4, fill: '#ffffff' }));
    g.appendChild(pupil);
    g.appendChild(sv('path', { d: shape, fill: '#111111', class: 'eye-lid' }));
    svg.appendChild(g);
    svg.appendChild(sv('path', { d: shape, fill: 'none', stroke: '#111111', 'stroke-width': 3 }));
    svg.addEventListener('animationend', function () { svg.classList.remove('is-blink'); });
    var e = { svg: svg, pupil: pupil, lx: 0, ly: 0 };
    eyes.push(e);
    return e;
  }
  var ptr = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  var eyeRaf = 0;
  function eyesOn() {
    return (!im.el.hidden && !im.el.classList.contains('is-min')) || (!olhoWin.hidden && !olhoWin.classList.contains('is-min'));
  }
  function queueEyes() { if (!eyeRaf && eyesOn()) eyeRaf = requestAnimationFrame(updateEyes); }
  function updateEyes() {
    eyeRaf = 0;
    eyes.forEach(function (e) {
      if (!visible(e.svg)) return;
      var r = e.svg.getBoundingClientRect();
      var dx = ptr.x - (r.left + r.width / 2), dy = ptr.y - (r.top + r.height / 2);
      var d = Math.sqrt(dx * dx + dy * dy) || 1, k = Math.min(1, d / 160);
      var x = Math.round(dx / d * 12 * k * 10) / 10, y = Math.round(dy / d * 6.5 * k * 10) / 10;
      if (x !== e.lx || y !== e.ly) {
        e.lx = x; e.ly = y;
        e.pupil.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      }
    });
  }
  window.addEventListener('pointermove', function (e) {
    ptr.x = e.clientX; ptr.y = e.clientY;
    queueEyes();
    onTrailMove(e);
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    ptr.x = e.clientX; ptr.y = e.clientY;
    queueEyes();
  }, { passive: true });
  var blinkT = 0;
  function visibleEyes() { return eyes.filter(function (e) { return visible(e.svg); }); }
  function scheduleBlink() {
    clearTimeout(blinkT);
    blinkT = 0;
    if (reduced() || doc.hidden || root.classList.contains('is-idle')) return;
    if (!visibleEyes().length) return;
    blinkT = setTimeout(function () {
      visibleEyes().forEach(function (e) { e.svg.classList.add('is-blink'); });
      scheduleBlink();
    }, 2400 + Math.random() * 3800);
  }
  function blinkNow() {
    if (reduced()) return;
    visibleEyes().forEach(function (e) { e.svg.classList.add('is-blink'); });
  }

  /* ================= widgets ================= */
  var visits = 1;
  var clockFmt = null;
  var dateFmt = null;
  try {
    clockFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    clockFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    dateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function moodStart() {
    var v = store.get('humor', null);
    if (typeof v === 'number' && v >= 0 && v < MOODS.length) return v;
    return dayNumber() % MOODS.length;
  }
  var moodI = moodStart();
  function setMood(i) {
    moodI = (i + MOODS.length) % MOODS.length;
    store.set('humor', moodI);
    $('#pf-mood').textContent = MOODS[moodI];
    if (wins.humor && wins.humor.api) wins.humor.api.update();
  }

  var WIDGET_BUILD = {
    visitas: function (body) {
      var digits = String(Math.min(visits, 999999));
      while (digits.length < 6) digits = '0' + digits;
      var odo = h('div', { class: 'odo', role: 'img', 'aria-label': visits + (visits === 1 ? ' visita' : ' visitas') });
      var strips = [];
      for (var i = 0; i < 6; i++) {
        var strip = h('span', { class: 'odo__strip' });
        for (var n = 0; n <= 9; n++) strip.appendChild(h('span', { text: String(n) }));
        strips.push(strip);
        odo.appendChild(h('span', { class: 'odo__d', 'aria-hidden': 'true' }, strip));
      }
      body.appendChild(odo);
      body.appendChild(h('p', { class: 'wg-note', text: 'vezes que você abriu este perfil. contador local, igual os de 2005: ninguém tá te rastreando (só o Olho, de brincadeira).' }));
      function roll() {
        strips.forEach(function (s, k) { s.style.transform = 'translateY(-' + (digits.charCodeAt(k) - 48) * 10 + '%)'; });
      }
      if (reduced()) roll();
      else requestAnimationFrame(function () { requestAnimationFrame(roll); });
      return null;
    },
    relogio: function (body) {
      var t = h('p', { class: 'clock', role: 'timer' });
      var d = h('p', { class: 'clock__date' });
      body.appendChild(t);
      body.appendChild(d);
      body.appendChild(h('p', { class: 'wg-note', text: 'horário de Joinville (SC). o mesmo do palco.' }));
      var timer = 0, seen = true;
      function tick() {
        var now = new Date();
        t.textContent = clockFmt.format(now);
        d.textContent = dateFmt.format(now);
      }
      function stop() { clearInterval(timer); timer = 0; }
      function run() {
        stop();
        if (seen && !doc.hidden) { tick(); timer = setInterval(tick, 1000); }
      }
      tick();
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
        seen = en[en.length - 1].isIntersecting;
        run();
      }) : null;
      if (io) io.observe(body); else run();
      return { wake: run, destroy: function () { stop(); if (io) io.disconnect(); } };
    },
    humor: function (body) {
      var v = h('p', { class: 'humor__v', text: MOODS[moodI] });
      var prev = h('button', { type: 'button', class: 'btn', 'aria-label': 'humor anterior', text: '◀' });
      var next = h('button', { type: 'button', class: 'btn', 'aria-label': 'próximo humor', text: '▶' });
      body.appendChild(h('div', { class: 'humor' }, [prev, v, next]));
      body.appendChild(h('p', { class: 'wg-note', text: 'o Mood do perfil muda junto. igualzinho 2006.' }));
      prev.addEventListener('click', function () { setMood(moodI - 1); say('Mood: ' + MOODS[moodI]); });
      next.addEventListener('click', function () { setMood(moodI + 1); say('Mood: ' + MOODS[moodI]); burstAt(next, 8); });
      return { update: function () { v.textContent = MOODS[moodI]; } };
    },
    tocando: function (body) {
      var img = h('img', { src: '../assets/cover-anti-raso.jpg', alt: '', width: 640, height: 640, loading: 'lazy' });
      var t = h('p', { class: 'now__t' });
      var s = h('p', { class: 'now__s' });
      var fill = h('span');
      var prev = h('button', { type: 'button', class: 'pbtn', 'aria-label': 'Faixa anterior', text: '⏮' });
      var play = h('button', { type: 'button', class: 'pbtn pbtn--play', 'aria-label': 'Tocar', text: '▶' });
      var next = h('button', { type: 'button', class: 'pbtn', 'aria-label': 'Próxima faixa', text: '⏭' });
      body.appendChild(h('div', { class: 'now' }, [img, h('div', null, [t, s, h('div', { class: 'now__bar' }, fill)])]));
      body.appendChild(h('div', { class: 'now__ctl' }, [prev, play, next]));
      body.appendChild(h('p', { class: 'wg-note', text: 'espelho do player do perfil.' }));
      function upd(ps) {
        t.textContent = ps.title;
        s.textContent = ps.label;
        fill.style.transform = 'scaleX(' + ps.frac + ')';
        play.textContent = ps.playing ? '❚❚' : '▶';
        play.setAttribute('aria-label', ps.playing ? 'Pausar' : 'Tocar');
      }
      prev.addEventListener('click', function () { playerGo(pl.cur - 1, pl.mode !== 'fallback'); });
      next.addEventListener('click', function () { playerGo(pl.cur + 1, pl.mode !== 'fallback'); });
      play.addEventListener('click', playerToggle);
      playerSubs.push(upd);
      upd(playerState());
      return { destroy: function () { var i = playerSubs.indexOf(upd); if (i > -1) playerSubs.splice(i, 1); } };
    }
  };
  function buildWidget(id) {
    var meta = WIDGET_META[id];
    var body = h('div', { class: 'win__body' });
    var el = h('section', { class: 'win win--widget', id: 'win-' + id, 'data-win': id, 'data-icon': meta.icon, 'aria-labelledby': 't-' + id }, [
      h('div', { class: 'win__bar' }, [
        h('span', { class: 'win__ico', 'aria-hidden': 'true', text: meta.icon }),
        h('h2', { class: 'win__title', id: 't-' + id, text: meta.title })
      ]),
      body
    ]);
    colL.appendChild(el);
    var w = registerWin(el);
    w.api = WIDGET_BUILD[id](body);
  }
  function destroyWidget(id) {
    var w = wins[id];
    if (!w) return;
    if (w.api && w.api.destroy) w.api.destroy();
    if (ro) ro.unobserve(w.el);
    w.el.remove();
    delete wins[id];
    delete state.pos[id];
    state.min = state.min.filter(function (x) { return x !== id; });
  }
  var olhoWin = $('#win-olho');
  var olhoBtn = $('#olho-btn');
  var olhoEye = null;
  function syncOlho() {
    var on = state.widgets.indexOf('olho') > -1;
    if (on) {
      if (!olhoEye) { olhoEye = makeEye(); olhoBtn.appendChild(olhoEye.svg); }
      if (olhoWin.hidden) {
        olhoWin.hidden = false;
        olhoWin.classList.remove('is-min');
        if (state.olho && !phone()) setFloatPos(wins.olho, state.olho[0] * window.innerWidth, state.olho[1] * window.innerHeight, false);
        clampFloat(wins.olho);
        queueEyes();
      }
    } else {
      olhoWin.hidden = true;
      olhoWin.classList.remove('is-min');
    }
    syncDock();
    scheduleBlink();
  }
  function syncWidgets() {
    ['visitas', 'relogio', 'humor', 'tocando'].forEach(function (id) {
      var want = state.widgets.indexOf(id) > -1;
      if (want && !wins[id]) buildWidget(id);
      else if (!want && wins[id]) destroyWidget(id);
    });
    syncOlho();
  }
  function toggleWidget(id, on) {
    var i = state.widgets.indexOf(id);
    if (on && i < 0) state.widgets.push(id);
    else if (!on && i > -1) state.widgets.splice(i, 1);
    else return;
    state.widgets = WIDGETS.filter(function (x) { return state.widgets.indexOf(x) > -1; });
    state.seq = normSeq(state.seq, state.widgets);
    syncWidgets();
    save();
    layout();
    syncEditor();
    refreshCode();
    updateShare();
    toast(on ? 'widget no perfil: ' + WIDGET_META[id].title + ' ✨' : 'widget removido: ' + WIDGET_META[id].title);
    if (on && wins[id] && id !== 'olho') {
      if (!phone() && !deskOn()) wins[id].el.scrollIntoView({ block: 'nearest', behavior: smooth() });
      burstAt(wins[id].el, 20);
    }
  }
  olhoBtn.addEventListener('click', function () { openIM(olhoBtn); });

  /* ================= player (Spotify iFrame API, loaded on first play) ================= */
  var TRACKS = [
    { title: 'OFF!', id: '7KteAUfbNB4CtxnbMudBad', dur: 199338 },
    { title: 'QUEBRA-CABEÇA (feat. Dani Buarque)', id: '3SYpLwh1ChHyNEOn5TNOWy', dur: 260385 },
    { title: 'MERGULHAR', id: '0aJtgSakI5r87CfAqNdDXP', dur: 224974 },
    { title: 'ROMÂNTICA', id: '2p5r9m60eSDxMGey8GRubR', dur: 148481 }
  ];
  var pl = { cur: 0, mode: 'idle', ctrl: null, pending: false, paused: true, pos: 0, dur: TRACKS[0].dur, lastPos: 0, lastDur: 0, timer: 0, label: '■ STOPPED' };
  var playerSubs = [];
  var playerBox = $('#win-player');
  var embedWrap = $('#spotify-wrap');
  var lcdState = $('#lcd-state');
  var lcdTime = $('#lcd-time');
  var lcdTitle = $('#lcd-title');
  var lcdTitle2 = $('#lcd-title2');
  var lcdBar = $('#lcd-bar');
  var playBtn = $('#p-play');
  var trackBtns = $$('#tracks .track');

  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  function playerState() {
    return { title: TRACKS[pl.cur].title, label: pl.label, frac: pl.dur ? Math.min(1, pl.pos / pl.dur) : 0, playing: pl.mode === 'api' && !pl.paused };
  }
  function emitPlayer() {
    var s = playerState();
    playerSubs.forEach(function (fn) { fn(s); });
  }
  function setLCD(label, pos, dur) {
    pl.label = label; pl.pos = pos; pl.dur = dur;
    lcdState.textContent = label;
    lcdTime.textContent = fmt(pos) + ' / ' + fmt(dur);
    lcdBar.style.transform = 'scaleX(' + (dur ? Math.min(1, pos / dur) : 0) + ')';
    emitPlayer();
  }
  function setTitle() {
    var t = 'HORNEY — ' + TRACKS[pl.cur].title + ' — ANTI-RASO (EP, 2026) —\u00a0';
    lcdTitle.textContent = t;
    lcdTitle2.textContent = t;
  }
  function markTrack() {
    trackBtns.forEach(function (b, i) {
      b.classList.toggle('is-current', i === pl.cur);
      if (i === pl.cur) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }
  function setPlayingUI(playing) {
    playerBox.classList.toggle('is-playing', playing);
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
  }
  function trackUri(i) { return 'spotify:track:' + TRACKS[i].id; }
  function trackEmbed(i) { return 'https://open.spotify.com/embed/track/' + TRACKS[i].id + '?utm_source=generator'; }
  function mountFallback() {
    clearTimeout(pl.timer);
    if (pl.mode === 'fallback' || pl.mode === 'api') return;
    pl.mode = 'fallback';
    pl.ctrl = null;
    var slot = $('#spotify-slot');
    var iframe = doc.createElement('iframe');
    iframe.id = 'spotify-slot';
    iframe.title = 'Player do Spotify — HORNEY';
    iframe.height = '152';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.src = trackEmbed(pl.cur);
    if (slot) slot.replaceWith(iframe);
    embedWrap.classList.add('is-loaded');
    setLCD('▶ APERTA PLAY NO SPOTIFY', 0, TRACKS[pl.cur].dur);
  }
  function loadApi() {
    pl.mode = 'loading';
    setLCD('… CARREGANDO', 0, TRACKS[pl.cur].dur);
    window.onSpotifyIframeApiReady = function (IFrameAPI) {
      if (pl.mode !== 'loading') return;
      var slot = $('#spotify-slot');
      if (!slot) { mountFallback(); return; }
      IFrameAPI.createController(slot, { uri: trackUri(pl.cur), width: '100%', height: 152 }, function (ctrl) {
        clearTimeout(pl.timer);
        if (pl.mode !== 'loading') return;
        pl.ctrl = ctrl;
        pl.mode = 'api';
        embedWrap.classList.add('is-loaded');
        setLCD('■ PRONTO', 0, TRACKS[pl.cur].dur);
        setTimeout(function () {
          if (pl.pending && pl.ctrl === ctrl) { pl.pending = false; ctrl.play(); }
        }, 2500);
        ctrl.addListener('ready', function () {
          if (pl.pending) { pl.pending = false; ctrl.play(); }
        });
        ctrl.addListener('playback_update', function (e) {
          var d = e && e.data;
          if (!d) return;
          var wasPlaying = !pl.paused;
          pl.paused = !!d.isPaused;
          var dur = d.duration || TRACKS[pl.cur].dur;
          setPlayingUI(!pl.paused);
          setLCD(d.isBuffering ? '… BUFFERING' : pl.paused ? '❚❚ PAUSED' : '▶ PLAYING', d.position || 0, dur);
          if (wasPlaying && pl.paused && pl.lastDur && pl.lastPos >= pl.lastDur - 1500) {
            pl.lastPos = 0;
            playerGo(pl.cur + 1, true);
            return;
          }
          pl.lastPos = d.position || 0;
          pl.lastDur = dur;
        });
      });
    };
    var s = doc.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = mountFallback;
    doc.head.appendChild(s);
    pl.timer = setTimeout(function () { if (pl.mode === 'loading') mountFallback(); }, 9000);
  }
  function playerGo(i, play) {
    pl.cur = (i + TRACKS.length) % TRACKS.length;
    pl.lastPos = 0;
    pl.lastDur = 0;
    setTitle();
    markTrack();
    if (pl.mode === 'api' && pl.ctrl) {
      pl.pending = !!play;
      pl.ctrl.loadUri(trackUri(pl.cur));
      setLCD('… CARREGANDO', 0, TRACKS[pl.cur].dur);
    } else if (pl.mode === 'fallback') {
      var f = $('#spotify-slot');
      if (f) f.src = trackEmbed(pl.cur);
      setLCD('▶ APERTA PLAY NO SPOTIFY', 0, TRACKS[pl.cur].dur);
    } else if (pl.mode === 'idle') {
      if (play) { pl.pending = true; loadApi(); }
      else setLCD('■ STOPPED', 0, TRACKS[pl.cur].dur);
    } else {
      pl.pending = !!play || pl.pending;
      setLCD('… CARREGANDO', 0, TRACKS[pl.cur].dur);
    }
  }
  function playerToggle() {
    if (pl.mode === 'idle') { pl.pending = true; loadApi(); return; }
    if (pl.mode === 'api' && pl.ctrl) { pl.ctrl.togglePlay(); return; }
    if (pl.mode === 'fallback') toast('aperta o ▶ dentro do player do Spotify 💿');
    else toast('carregando o Spotify… segura aí 💿');
  }
  function pauseSpotify() {
    if (pl.mode === 'api' && pl.ctrl && !pl.paused) pl.ctrl.togglePlay();
  }
  playBtn.addEventListener('click', function () { burstAt(playBtn, 10); playerToggle(); });
  $('#p-prev').addEventListener('click', function () { playerGo(pl.cur - 1, pl.mode !== 'fallback'); });
  $('#p-next').addEventListener('click', function () { playerGo(pl.cur + 1, pl.mode !== 'fallback'); });
  trackBtns.forEach(function (b) {
    b.addEventListener('click', function () { playerGo(Number(b.getAttribute('data-i')), true); });
  });
  function playAndShow(i) {
    playerGo(i, true);
    if (isMin('player')) restore('player');
    else playerBox.scrollIntoView({ behavior: smooth(), block: 'start' });
  }

  /* ================= shows (one data array, date-aware) ================= */
  var SHOWS = [
    {
      date: '2026-09-17', title: 'ROCK NIGHT @ FFFront — São Paulo',
      where: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso',
      txt: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.',
      link: { label: 'Fotos no IG ↗', href: IG },
      flyer: { src: '../assets/sympla-rock-night.jpg', alt: 'Flyer do Rock Night na FFFront, São Paulo, com HORNEY e Mastrobiso', w: 1179, h: 662 }
    },
    {
      date: '2026-10-03', title: 'Show — 03 de outubro',
      where: 'local não divulgado aqui',
      txt: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤',
      link: { label: 'Fotos no IG ↗', href: IG }
    },
    {
      date: '2026-10-09', title: 'ÚLTIMO SHOW DO ANO ⚡️😈',
      where: 'LOCAL EM BREVE — fica de olho no insta',
      txt: 'Último show do ano. SAI DE CASA E COLE NOS SHOWS!!! Local e ingressos saem primeiro nos stories.',
      link: { label: 'Infos no IG ↗', href: IG }
    }
  ];
  var nowD = new Date();
  var todayISO = nowD.getFullYear() + '-' + pad(nowD.getMonth() + 1) + '-' + pad(nowD.getDate());
  function br(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function showState(iso) { return iso < todayISO ? 'past' : iso === todayISO ? 'today' : 'next'; }
  function renderShows() {
    var list = $('#blog-list');
    list.textContent = '';
    SHOWS.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).forEach(function (s) {
      var st = showState(s.date);
      var p = s.date.split('-');
      var li = h('li', { class: 'post', 'data-state': st });
      li.appendChild(h('p', { class: 'post__meta' }, [
        h('time', { datetime: s.date, text: p[2] + ' ' + MESES_UP[+p[1] - 1] + ' ' + p[0] }),
        h('span', { class: 'badge', text: st === 'past' ? 'já rolou' : st === 'today' ? 'HOJE!!!' : 'próximo' })
      ]));
      li.appendChild(h('h3', { class: 'post__t', text: s.title }));
      li.appendChild(h('p', { class: 'post__where', text: s.where }));
      li.appendChild(h('p', { text: s.txt }));
      if (s.flyer) {
        li.appendChild(h('a', { class: 'post__flyer', href: s.flyer.src, 'data-lightbox': '', 'data-alt': s.flyer.alt }, [
          h('img', { src: s.flyer.src, alt: s.flyer.alt, width: s.flyer.w, height: s.flyer.h, loading: 'lazy' })
        ]));
      }
      li.appendChild(h('p', null, h('a', { class: 'btn', href: s.link.href, target: '_blank', rel: 'noopener', text: s.link.label })));
      list.appendChild(li);
    });
    var upcoming = SHOWS.filter(function (s) { return s.date >= todayISO; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var past = SHOWS.filter(function (s) { return s.date < todayISO; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var nextBox = $('#next-show');
    var nextV = $('#next-show-v');
    var nextA = $('#next-show-a');
    if (upcoming.length) {
      var n = upcoming[0];
      nextV.textContent = (n.date === todayISO ? 'HOJE!!! ' : '') + br(n.date) + ' — ' + n.title + ' · ' + n.where;
      nextA.textContent = n.link.label;
      nextA.href = n.link.href;
      nextBox.classList.add('is-live');
      $('#q-next').textContent = br(n.date) + ' — ' + n.title;
    } else {
      nextV.textContent = 'sem shows marcados — cola no Instagram pra saber primeiro';
      nextA.textContent = '@horney.band ↗';
      nextA.href = IG;
      nextBox.classList.remove('is-live');
      $('#q-next').textContent = 'sem shows marcados — cola no Instagram pra saber primeiro';
    }
    $('#q-last').textContent = past.length ? br(past[0].date) + ' — ' + past[0].title : 'nenhum ainda';
  }

  /* ================= lightbox ================= */
  var lightbox = $('#lightbox');
  var lbImg = $('#lightbox-img');
  var lbCap = $('#lightbox-cap');
  function openLightbox(src, alt) {
    lbImg.src = src;
    lbImg.alt = alt || '';
    lbCap.textContent = alt || '';
    if (friendDlg.open) friendDlg.close();
    lightbox.showModal();
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-lightbox]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openLightbox(a.getAttribute('href'), a.getAttribute('data-alt'));
  });
  function closeOnBackdrop(dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  closeOnBackdrop(lightbox);

  /* ================= videos (facades) ================= */
  $$('.facade').forEach(function (f) {
    var a = $('.facade__btn', f);
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      var iframe = doc.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + f.getAttribute('data-yt') + '?autoplay=1&rel=0&playsinline=1';
      iframe.title = f.getAttribute('data-title');
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      pauseSpotify();
      a.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ================= friends: Top 8, add to friends ================= */
  var friendDlg = $('#friend-dlg');
  closeOnBackdrop(friendDlg);
  var addDlg = $('#add-dlg');
  closeOnBackdrop(addDlg);
  var slotYou = $('#slot-you');
  var FRIENDS = {
    duda: {
      name: 'Duda', role: 'voz & letras · HORNEY',
      txt: '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.”',
      actions: [{ label: '▶ ouvir ANTI-RASO', play: 0 }, { label: 'ler os blurbs', win: 'blurbs' }]
    },
    rafa: {
      name: 'Rafa Bello', role: 'composição · HORNEY',
      txt: 'Escreve as músicas junto com a Duda. Se o refrão grudou na tua cabeça, a culpa é dividida.',
      actions: [{ label: '▶ tocar MERGULHAR', play: 2 }]
    },
    dani: {
      name: 'Dani Buarque', role: 'feat. em QUEBRA-CABEÇA',
      txt: 'Divide a faixa 2 de ANTI-RASO com a HORNEY. Tem peça que só encaixa a dois.',
      actions: [{ label: '▶ tocar QUEBRA-CABEÇA', play: 1 }]
    },
    mastrobiso: {
      name: 'Mastrobiso', role: 'dividiu o palco no Rock Night',
      txt: 'Qui, 17/09/2026, FFFront, São Paulo: HORNEY + Mastrobiso no mesmo flyer — e que flyer.',
      actions: [{ label: 'ver o flyer', lightbox: '../assets/sympla-rock-night.jpg', alt: 'Flyer do Rock Night na FFFront, São Paulo, com HORNEY e Mastrobiso' }, { label: 'ir pros shows', win: 'blog' }]
    },
    unglued: {
      name: 'Unglued', role: 'deu 7.8/10 pro ANTI-RASO',
      txt: 'A review de ANTI-RASO na Unglued: 7.8 de 10. A gente imprimiu e colou na geladeira (mentalmente).',
      actions: [{ label: 'ler a review ↗', href: 'https://www.unglued.com.br/reviews/anti-raso' }]
    },
    fffront: {
      name: 'FFFront', role: 'casa do Rock Night em SP',
      txt: 'Rua Purpurina, 199 — Vila Madalena, São Paulo. Onde Joinville fez barulho em 17/09.',
      actions: [{ label: 'ver no blog de shows', win: 'blog' }]
    }
  };
  function goWin(id) {
    if (isMin(id)) { restore(id); return; }
    var w = wins[id];
    if (!w) return;
    front(w);
    w.el.scrollIntoView({ behavior: smooth(), block: 'start' });
    w.el.focus({ preventScroll: true });
  }
  function actionEl(a) {
    var el;
    if (a.href) {
      el = h('a', { class: 'btn', href: a.href, target: '_blank', rel: 'noopener', text: a.label });
    } else {
      el = h('button', { type: 'button', class: 'btn', text: a.label });
      el.addEventListener('click', function () {
        if (typeof a.play === 'number') { friendDlg.close(); playAndShow(a.play); }
        else if (a.lightbox) openLightbox(a.lightbox, a.alt);
        else if (a.win) { friendDlg.close(); goWin(a.win); }
        else if (a.run) a.run();
      });
    }
    return el;
  }
  function copyAvatar(src) {
    var fdAv = $('#fd-av');
    fdAv.className = src.className + ' av--lg';
    fdAv.textContent = '';
    Array.prototype.forEach.call(src.childNodes, function (n) { fdAv.appendChild(n.cloneNode(true)); });
  }
  function openFriend(key, btn) {
    if (key === 'olho') { openIM(btn); return; }
    if (key === 'voce' && !friend) { openAdd(btn); return; }
    copyAvatar($('.av', btn));
    var acts = $('#fd-actions');
    acts.textContent = '';
    if (key === 'voce') {
      $('#fd-name').textContent = friend.nick;
      $('#fd-role').textContent = 'slot #8 do Top 8 da HORNEY (neste navegador)';
      $('#fd-txt').textContent = 'Você tá no Top 8 da HORNEY, logo depois do Olho. Isso é basicamente um contrato. Agora sai de casa e cola no show.';
      acts.appendChild(actionEl({ label: 'trocar nick / pic', run: function () { friendDlg.close(); openAdd(btn); } }));
      acts.appendChild(actionEl({ label: 'desfazer amizade', run: function () { friendDlg.close(); unfriend(); } }));
    } else {
      var f = FRIENDS[key];
      $('#fd-name').textContent = f.name;
      $('#fd-role').textContent = f.role;
      $('#fd-txt').textContent = f.txt;
      f.actions.forEach(function (a) { acts.appendChild(actionEl(a)); });
    }
    friendDlg.showModal();
  }
  $$('[data-friend]').forEach(function (b) {
    b.addEventListener('click', function () { openFriend(b.getAttribute('data-friend'), b); });
  });

  function loadFriend() {
    var f = store.get('friend', null);
    if (!f || typeof f !== 'object' || typeof f.nick !== 'string') return null;
    var nick = cleanText(f.nick, 24);
    if (!nick) return null;
    return { nick: nick, g: GLYPHS.indexOf(f.g) > -1 ? f.g : GLYPHS[0] };
  }
  var friend = loadFriend();
  function savedNick() {
    var n = store.get('nick', '');
    return typeof n === 'string' ? cleanText(n, 40) : '';
  }
  function myNick() { return friend ? friend.nick : savedNick(); }
  function renderFriend() {
    $('#you-name').textContent = friend ? friend.nick : 'vaga aberta';
    $('#you-glyph').textContent = friend ? friend.g : '?';
    $('#you-tag').hidden = !friend;
    slotYou.classList.toggle('is-set', !!friend);
    $('#friend-count').textContent = (7300 + (friend ? 1 : 0)).toLocaleString('en-US');
    $('#c-add-label').textContent = friend ? 'Friends ✓' : 'Add to Friends';
    $('#add-remove').hidden = !friend;
    $('#add-title').textContent = friend ? 'Teu lugar no Top 8' : 'Add to Friends';
  }
  function buildGlyphs(fs, name, selected) {
    GLYPHS.forEach(function (g, i) {
      var inp = h('input', { type: 'radio', name: name, value: g, id: name + '-' + i, 'aria-label': GLYPH_NAMES[i] });
      if (g === selected) inp.checked = true;
      fs.appendChild(h('label', { class: 'glyph', for: name + '-' + i }, [inp, h('span', { 'aria-hidden': 'true', text: g })]));
    });
  }
  function pickedGlyph(name) {
    var c = $('input[name="' + name + '"]:checked');
    return c && GLYPHS.indexOf(c.value) > -1 ? c.value : GLYPHS[0];
  }
  var addNick = $('#add-nick');
  var addStatus = $('#add-status');
  var addOpener = null;
  function openAdd(opener) {
    addOpener = opener || null;
    addNick.value = friend ? friend.nick : (savedNick().slice(0, 24) || '');
    var sel = friend ? friend.g : pickedGlyph('c-glyph');
    $$('input[name="add-glyph"]').forEach(function (i) { i.checked = i.value === sel; });
    addStatus.textContent = '';
    addStatus.classList.remove('is-err');
    addDlg.showModal();
    addNick.focus();
  }
  $('#add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var nick = cleanText(addNick.value, 24);
    if (!nick) {
      addStatus.textContent = 'escreve um nick primeiro 🙃';
      addStatus.classList.add('is-err');
      addNick.focus();
      return;
    }
    var was = !!friend;
    friend = { nick: nick, g: pickedGlyph('add-glyph') };
    store.set('friend', friend);
    if (!savedNick()) store.set('nick', nick);
    prefillNicks();
    renderFriend();
    addDlg.close();
    toast(was ? 'Top 8 atualizado ♥' : 'agora vocês são amigos! teu nick tá no slot #8 do Top 8 ♥');
    burstAt(slotYou, 26);
  });
  $('#add-remove').addEventListener('click', function () { addDlg.close(); unfriend(); });
  function unfriend() {
    friend = null;
    store.del('friend');
    renderFriend();
    toast('amizade desfeita. a vaga #8 continua aqui, tá? 💔');
    slotYou.focus();
  }
  addDlg.addEventListener('close', function () {
    if (addOpener && addOpener.isConnected && !friendDlg.open) addOpener.focus();
  });

  /* ================= Contacting HORNEY ================= */
  function profileURL() { return location.href.split('#')[0]; }
  function fallbackCopy(s, okMsg) {
    var back = doc.activeElement;
    var ta = h('textarea', { class: 'sr-only', readonly: '' });
    ta.value = s;
    doc.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    if (back && back.focus) back.focus({ preventScroll: true });
    toast(ok ? okMsg : 'copia aí: ' + s);
  }
  function copyText(s, okMsg) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(s).then(function () { toast(okMsg); }, function () { fallbackCopy(s, okMsg); });
    } else fallbackCopy(s, okMsg);
  }
  function shareLink(url, text, okMsg) {
    if (navigator.share) {
      navigator.share({ title: 'H◎RNEYSPACE', text: text, url: url }).then(function () { toast('mandado! ✨'); }, function () { /* cancelled */ });
      return;
    }
    copyText(url, okMsg);
  }
  $('#c-forward').addEventListener('click', function () {
    shareLink(profileURL(), 'HORNEY is in your extended network ⚡️😈', 'link do perfil copiado! manda pro teu Top 8 📨');
  });
  $('#c-add').addEventListener('click', function (e) { openAdd(e.currentTarget); });
  $('#c-im').addEventListener('click', function (e) { openIM(e.currentTarget); });
  $('#c-block').addEventListener('click', function (e) {
    var b = e.currentTarget;
    b.classList.remove('is-wiggle');
    void b.offsetWidth;
    b.classList.add('is-wiggle');
    toast('bloquear a HORNEY? erro 666: permissão negada 😈');
  });
  $('#c-block').addEventListener('animationend', function (e) { e.currentTarget.classList.remove('is-wiggle'); });
  $('#c-rank').addEventListener('click', function (e) {
    burstAt(e.currentTarget, 24);
    toast('você deu ⭐⭐⭐⭐⭐ pra HORNEY (era a única opção)');
  });

  /* ================= comments wall (Horney.mural, channel "mural") ================= */
  var LOCAL_SEEDS = [
    ['fx-01', 'xX_mergulhadora_Xx', '🌊', '2026-10-08T23:42:00-03:00', 'ANTI-RASO no repeat desde 30/07. MERGULHAR me destruiu de um jeito bom 🖤'],
    ['fx-02', 'punk.de.joinville.666', '😈', '2026-10-08T21:07:00-03:00', 'ORGULHO DE SC!!! thanks for the add!!! pc4pc4 ⚡️'],
    ['fx-03', '~*quebra_cabeca_girl*~', '🧩', '2026-10-07T02:13:00-03:00', 'QUEBRA-CABEÇA com a Dani Buarque é covardia. ouvi 14 vezes e ainda não montei'],
    ['fx-04', 'tom_from_2004', '👕', '2026-10-06T12:00:00-03:00', 'hey, eu ainda sou o primeiro amigo de todo mundo. a HORNEY é o segundo. justo.'],
    ['fx-05', 'gritei_no_OFF', '🔌', '2026-10-05T18:30:00-03:00', 'meu pescoço ainda não voltou desde o último show. vale cada vértebra'],
    ['fx-06', 'olhinho.do.O', '👁', '2026-10-03T09:51:00-03:00', 'alguém mais reparou que tem um olho dentro do O do logo?? ele tá me olhando agora'],
    ['fx-07', 'romantica_sim_raso_nao', '💔', '2026-10-01T00:04:00-03:00', 'ROMÂNTICA: 2 min e 28 seg de perfeição. aperta o replay e finge que é a primeira vez'],
    ['fx-08', 'vovo_rocker_sc', '👵', '2026-09-28T15:20:00-03:00', 'meu neto me mostrou. achei barulhento. ouvi o EP inteiro duas vezes. coloquem legenda nos shows'],
    ['fx-09', 'emo_desde_2005', '🖤', '2026-09-18T01:17:00-03:00', 'trocaria meu Top 8 inteiro por um lugar na grade no último show do ano. EXCETO a HORNEY.']
  ].map(function (a) { return { id: a[0], name: a[1], g: a[2], at: a[3], text: a[4], seed: true }; });

  var wall = $('#wall');
  var cform = $('#cform');
  var cName = $('#c-name');
  var cText = $('#c-text');
  var cStatus = $('#c-status');
  var cSubmit = $('#c-submit');
  var cNewer = $('#c-newer');
  var cOlder = $('#c-older');
  var cm = { all: [], page: 0, PER: 6 };
  var mine = store.get('mine', {});
  if (!mine || typeof mine !== 'object' || Array.isArray(mine)) mine = {};

  function glyphFor(m) {
    if (m.g) return m.g;
    var gi = mine[m.id];
    if (typeof gi === 'number' && GLYPHS[gi]) return GLYPHS[gi];
    var hs = 0;
    for (var i = 0; i < m.name.length; i++) hs = (hs * 31 + m.name.charCodeAt(i)) | 0;
    return GLYPHS[Math.abs(hs) % GLYPHS.length];
  }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function commentEl(m) {
    var isMine = Object.prototype.hasOwnProperty.call(mine, m.id);
    var t = Date.parse(m.at);
    return h('li', { class: 'cmt' }, [
      h('div', { class: 'cmt__who' }, [
        h('span', { class: 'cmt__av', 'aria-hidden': 'true', text: glyphFor(m) }),
        h('span', { class: 'cmt__name', text: m.name }),
        isMine ? h('span', { class: 'cmt__tag cmt__tag--me', text: 'você ✓' }) : m.seed ? h('span', { class: 'cmt__tag', text: '✦ fictício' }) : null
      ]),
      h('div', { class: 'cmt__body' }, [
        h('p', { class: 'cmt__meta' }, isNaN(t) ? null : h('time', { datetime: new Date(t).toISOString(), text: when(m.at) })),
        h('p', { class: 'cmt__text', text: m.text })
      ])
    ]);
  }
  function setComments(msgs) {
    var list = (Array.isArray(msgs) ? msgs : []).filter(function (m) { return m && m.channel === 'mural' && typeof m.text === 'string'; })
      .map(function (m) { return { id: String(m.id), name: String(m.name || 'anônimo'), text: m.text, at: m.at, seed: !!m.seed }; });
    cm.all = list.concat(LOCAL_SEEDS).sort(function (a, b) { return (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0); });
    renderComments();
  }
  function renderComments() {
    var total = cm.all.length, pages = Math.max(1, Math.ceil(total / cm.PER));
    cm.page = clamp(cm.page, 0, pages - 1);
    var slice = cm.all.slice(cm.page * cm.PER, cm.page * cm.PER + cm.PER);
    wall.textContent = '';
    slice.forEach(function (m) { wall.appendChild(commentEl(m)); });
    if (!slice.length) wall.appendChild(h('li', { class: 'wall__empty', text: 'nenhum comentário ainda. seja o primeiro: thanks for the add!!!' }));
    $('#c-shown').textContent = String(slice.length);
    $('#c-total').textContent = String(total);
    $('#c-page').textContent = 'página ' + (cm.page + 1) + ' de ' + pages;
    cNewer.setAttribute('aria-disabled', String(cm.page === 0));
    cOlder.setAttribute('aria-disabled', String(cm.page >= pages - 1));
  }
  function page(dir, btn) {
    if (btn.getAttribute('aria-disabled') === 'true') return;
    cm.page += dir;
    renderComments();
    $('#t-comentarios').scrollIntoView({ block: 'nearest', behavior: smooth() });
    say('Comentários: ' + $('#c-page').textContent);
  }
  cNewer.addEventListener('click', function () { page(-1, cNewer); });
  cOlder.addEventListener('click', function () { page(1, cOlder); });
  function updChars() { $('#c-chars').textContent = Array.from(cText.value).length + '/500'; }
  cText.addEventListener('input', updChars);
  function setStatus(el, msg, err) {
    el.textContent = msg;
    el.classList.toggle('is-err', !!err);
  }
  function refreshWall() {
    if (!HM) return Promise.resolve();
    return HM.mural.list({ channel: 'mural' }).then(setComments, function () { setComments([]); });
  }
  function postToMural(name, text, statusEl, btn, okMsg, onOk) {
    if (!HM) { setStatus(statusEl, 'o mural tá fora do ar agora (o módulo não carregou).', true); return; }
    if (btn.getAttribute('aria-disabled') === 'true') return;
    btn.setAttribute('aria-disabled', 'true');
    setStatus(statusEl, 'postando…', false);
    var gi = GLYPHS.indexOf(pickedGlyph('c-glyph'));
    HM.mural.post({ name: name, text: text, channel: 'mural' }).then(function (msg) {
      mine[msg.id] = gi < 0 ? 0 : gi;
      store.set('mine', mine);
      if (name) store.set('nick', name);
      prefillNicks();
      cm.page = 0;
      setStatus(statusEl, okMsg, false);
      btn.setAttribute('aria-disabled', 'false');
      if (onOk) onOk();
      return refreshWall();
    }, function (err) {
      setStatus(statusEl, err && err.message ? err.message : 'não deu pra postar. tenta de novo.', true);
      btn.setAttribute('aria-disabled', 'false');
    });
  }
  cform.addEventListener('submit', function (e) {
    e.preventDefault();
    postToMural(cleanText(cName.value, 40), cText.value, cStatus, cSubmit, 'comentário postado! thanks for the add!!! ⚡', function () {
      cText.value = '';
      updChars();
      burstAt(cSubmit, 16);
    });
  });

  /* --- quiz: the fan answers and passes it on (posts to the mural) --- */
  var qform = $('#qform');
  var qStatus = $('#q-status');
  var qSubmit = $('button[type="submit"]', qform);
  qform.addEventListener('submit', function (e) {
    e.preventDefault();
    var recado = cleanText($('#q-recado').value, 140);
    var text = 'respondi o questionário da HORNEY ☑ faixa favorita do ANTI-RASO: ' + $('#q-faixa').value +
      ' · já colou num show? ' + $('#q-show').value + (recado ? ' · ' + recado : '');
    postToMural(cleanText($('#q-nick').value, 40), text, qStatus, qSubmit, 'tá no mural! agora repassa pra 10 amigos 😈', function () {
      $('#q-recado').value = '';
    });
  });

  function prefillNicks() {
    var n = savedNick() || (friend ? friend.nick : '');
    if (!n) return;
    if (!cName.value) cName.value = n;
    var q = $('#q-nick');
    if (!q.value) q.value = n;
  }

  /* ================= HorneyIM (the Eye is Tom) ================= */
  var im = {
    el: $('#win-im'), log: $('#im-log'), form: $('#im-form'), input: $('#im-input'), send: $('#im-send'),
    typing: $('#im-typing'), chips: $('#im-chips'), opener: null, busy: false
  };
  var CHIPS = [
    'quando é o próximo show?', 'o que significa ANTI-RASO?', 'cadê a merch?', 'quem tá na banda?',
    'vou me dar bem no amor?', 'como falo com vocês?', 'qual música eu ouço primeiro?', 'vai dar certo?',
    'o que vem no meu futuro?', 'onde vejo o clipe de Fool\'s Game?', 'o que a Unglued achou?', 'devo sair de casa hoje?'
  ];
  function validLink(l) { return l && typeof l.label === 'string' && typeof l.href === 'string' && /^https:\/\//.test(l.href); }
  function loadIM() {
    var a = store.get('im', []);
    if (!Array.isArray(a)) return [];
    return a.filter(function (m) { return m && (m.w === 'me' || m.w === 'eye') && typeof m.t === 'string'; }).slice(-80).map(function (m) {
      return { w: m.w, t: m.t.slice(0, 1200), l: Array.isArray(m.l) ? m.l.filter(validLink).slice(0, 5).map(function (l) { return { label: l.label.slice(0, 80), href: l.href }; }) : [] };
    });
  }
  var imHist = loadIM();
  var imAvatar = makeEye();
  $('#im-avatar').appendChild(imAvatar.svg);

  function bubble(m) {
    var li = h('li', { class: 'bub bub--' + m.w });
    li.appendChild(h('span', { class: 'bub__who', text: m.w === 'me' ? (myNick() || 'você') + ' diz:' : m.w === 'eye' ? 'O Olho diz:' : '' }));
    li.appendChild(doc.createTextNode(m.t));
    if (m.l && m.l.length) {
      var box = h('span', { class: 'bub__links' });
      m.l.forEach(function (l) {
        var a = h('a', { class: 'btn', target: '_blank', rel: 'noopener', text: l.label + ' ↗' });
        a.href = l.href;
        box.appendChild(a);
      });
      li.appendChild(box);
    }
    return li;
  }
  function renderIMLog() {
    im.log.textContent = '';
    if (!HM) {
      im.log.appendChild(h('li', { class: 'bub bub--sys', text: 'o Olho tá offline agora: o oráculo não carregou. recarrega a página que ele volta.' }));
      return;
    }
    im.log.appendChild(bubble({ w: 'eye', t: 'oi. eu sou o Olho — o primeiro amigo de todo mundo por aqui. pergunta qualquer coisa: show, música, merch, amor, futuro. eu vejo fundo.' }));
    imHist.forEach(function (m) { im.log.appendChild(bubble(m)); });
  }
  function pushMsg(m) {
    imHist.push(m);
    if (imHist.length > 80) imHist = imHist.slice(-80);
    store.set('im', imHist);
    im.log.appendChild(bubble(m));
    im.log.scrollTop = im.log.scrollHeight;
  }
  function askEye(raw) {
    if (!HM || im.busy) return;
    var q = cleanText(raw, 200);
    if (q) pushMsg({ w: 'me', t: q, l: [] });
    im.input.value = '';
    im.busy = true;
    im.send.setAttribute('aria-disabled', 'true');
    im.typing.hidden = false;
    im.log.setAttribute('aria-busy', 'true');
    im.log.scrollTop = im.log.scrollHeight;
    var delay = reduced() ? 300 : 650 + Math.min(1100, q.length * 18);
    setTimeout(function () {
      var a;
      try { a = HM.oraculo.ask(q); } catch (err) { a = null; }
      if (!a || typeof a.text !== 'string') a = { text: 'o Olho piscou e perdeu a pergunta. tenta de novo.', links: [] };
      im.typing.hidden = true;
      im.busy = false;
      im.send.setAttribute('aria-disabled', 'false');
      im.log.removeAttribute('aria-busy');
      pushMsg({ w: 'eye', t: a.text, l: (Array.isArray(a.links) ? a.links : []).filter(validLink).map(function (l) { return { label: l.label, href: l.href }; }) });
      blinkNow();
    }, delay);
  }
  function renderChips() {
    im.chips.textContent = '';
    var start = dayNumber() % CHIPS.length;
    for (var i = 0; i < 4; i++) {
      (function (q) {
        var b = h('button', { type: 'button', class: 'chip', text: q });
        b.addEventListener('click', function () { askEye(q); im.input.focus({ preventScroll: true }); });
        im.chips.appendChild(b);
      })(CHIPS[(start + i) % CHIPS.length]);
    }
  }
  function openIM(opener) {
    var w = wins.im;
    if (opener && opener.nodeType === 1 && !im.el.contains(opener)) im.opener = opener;
    var was = im.el.hidden;
    im.el.hidden = false;
    im.el.classList.remove('is-min');
    if (was) {
      renderIMLog();
      clampFloat(w);
    }
    hideFriendReq();
    syncDock();
    front(w);
    queueEyes();
    scheduleBlink();
    im.log.scrollTop = im.log.scrollHeight;
    if (HM) im.input.focus({ preventScroll: true });
    else im.el.focus({ preventScroll: true });
  }
  function closeIM() {
    im.el.hidden = true;
    im.el.classList.remove('is-min', 'is-max');
    syncDock();
    scheduleBlink();
    var back = im.opener && visible(im.opener) ? im.opener : $('#c-im');
    back.focus({ preventScroll: true });
  }
  im.form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (im.send.getAttribute('aria-disabled') === 'true') return;
    askEye(im.input.value);
  });
  $('#im-clear').addEventListener('click', function () {
    imHist = [];
    store.del('im');
    renderIMLog();
    toast('conversa apagada. o Olho esquece (mas não esquece).');
    im.input.focus({ preventScroll: true });
  });
  im.el.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !im.el.classList.contains('is-max')) { e.preventDefault(); closeIM(); }
  });

  /* --- first-visit friend request --- */
  var frEl = $('#friendreq');
  var frT = 0;
  function showFriendReq() {
    frEl.hidden = false;
    if (!reduced()) frEl.classList.add('is-in');
    store.set('met', 1);
    say('O Olho te adicionou como amigo. Quer conversar? Botão abrir HorneyIM.');
    frT = setTimeout(function () { if (!frEl.contains(doc.activeElement)) hideFriendReq(); }, 14000);
  }
  function hideFriendReq() {
    clearTimeout(frT);
    frEl.hidden = true;
  }
  $('#fr-open').addEventListener('click', function () { hideFriendReq(); openIM($('#c-im')); });
  $('#fr-ok').addEventListener('click', function () {
    hideFriendReq();
    toast('o Olho segue Online Now! no slot #1 do Top 8 ◎');
  });

  /* ================= editor: Pimp My Profile ================= */
  var pimp = $('#pimp');
  var pimpOpener = null;
  var codeEl = $('#code');
  var codeLog = $('#code-log');
  var codeDirty = false;
  var bgColor = $('#bg-color');
  var headInput = $('#head-input');
  var tabs = $$('.tab', pimp);

  function openPimp(opener) {
    pimpOpener = opener || null;
    pimp.hidden = false;
    root.classList.add('is-pimping');
    if (!phone() && !state.desk) setDesk(true, true);
    syncEditor();
    refreshCode(true);
    updateShare();
    paintSwatches();
    ensureGlitter();
    $('#pimp-title').focus();
    toast(phone() ? '✨ pimpa à vontade: muda e vê na hora' : '✨ modo desktop ON: arrasta, redimensiona, minimiza. pimpa à vontade');
  }
  function closePimp() {
    pimp.hidden = true;
    root.classList.remove('is-pimping');
    var back = pimpOpener && visible(pimpOpener) ? pimpOpener : $('[data-open-pimp]');
    back.focus({ preventScroll: true });
  }
  $$('[data-open-pimp]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!pimp.hidden) { $('#pimp-title').focus(); return; }
      openPimp(b);
    });
  });
  $('#pimp-close').addEventListener('click', closePimp);
  pimp.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closePimp(); }
  });
  $('#desk-toggle').addEventListener('click', function () { setDesk(!state.desk); });
  $('#tidy').addEventListener('click', tidy);

  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
    if (t.id === 'tab-codigo') refreshCode(true);
    if (t.id === 'tab-share') updateShare();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t, false); });
    t.addEventListener('keydown', function (e) {
      var j;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      else return;
      e.preventDefault();
      selectTab(tabs[j], true);
    });
  });

  var swatchesPainted = false;
  function paintSwatches() {
    if (swatchesPainted) return;
    swatchesPainted = true;
    $$('.sw--pat', pimp).forEach(function (sw) {
      var k = sw.getAttribute('data-pat');
      if (k === 'padrao') sw.style.background = 'linear-gradient(135deg, var(--wall) 50%, var(--win-bg) 50%)';
      else if (k === 'liso') sw.style.background = 'var(--wall)';
      else sw.style.backgroundImage = 'url("' + patternURL(k, false) + '")';
    });
  }

  function wallHex() {
    if (state.bgc) return state.bgc;
    var w = getComputedStyle(root).getPropertyValue('--wall').trim();
    return /^#[0-9a-f]{6}$/i.test(w) ? w.toLowerCase() : '#000000';
  }
  function checkRadios(name, value) {
    $$('input[name="' + name + '"]', pimp).forEach(function (i) { i.checked = i.value === value; });
  }
  function syncEditor() {
    checkRadios('skin', state.skin);
    checkRadios('bg', state.bg);
    checkRadios('trail', state.trail);
    checkRadios('fx', state.fx);
    $$('input[name="widget"]', pimp).forEach(function (i) { i.checked = state.widgets.indexOf(i.value) > -1; });
    bgColor.value = wallHex();
    if (doc.activeElement !== headInput) headInput.value = state.head;
    syncDeskUI();
    syncTrailNote();
  }
  function syncDeskUI() {
    var t = $('#desk-toggle');
    t.setAttribute('aria-pressed', String(state.desk && !phone()));
    t.textContent = 'modo desktop: ' + (state.desk && !phone() ? 'ON' : 'OFF');
    t.setAttribute('aria-disabled', String(phone()));
    $('#desk-note').textContent = phone()
      ? 'no celular as janelas ficam empilhadas: ↑↓ na barra de título reordena, _ minimiza pro dock, □ maximiza.'
      : state.desk
        ? 'arrasta pela barra de título, redimensiona no canto ↘, _ minimiza pro dock, □ maximiza. soltou, encaixa no grid de 12 colunas. teclado: foca o ⠿ e usa as setas (Shift = tamanho).'
        : 'arrasta qualquer barra de título (ou liga aqui) pra soltar as janelas.';
  }
  function syncTrailNote() {
    var n = $('#trail-note');
    if (!n) return;
    n.textContent = reduced()
      ? 'desligado agora: teu sistema pediu menos movimento. a escolha fica salva.'
      : !mqFine.matches ? 'o rastro só aparece com mouse. no touch ele descansa (a escolha fica salva).' : '';
  }
  function commit(msg) {
    state = sanitize(state);
    save();
    applyLook();
    syncEditor();
    refreshCode();
    updateShare();
    if (msg) say(msg);
  }
  pimp.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'skin' && SKINS[t.value]) {
      state.skin = t.value;
      commit();
      toast('skin aplicado: ' + SKINS[t.value].label);
      burstAt(t.closest('.opt'), 14);
    } else if (t.name === 'bg') { state.bg = t.value; commit('fundo: ' + t.value); }
    else if (t.name === 'trail') { state.trail = t.value; commit('rastro: ' + t.value); }
    else if (t.name === 'fx') { state.fx = t.value; commit('efeito da headline: ' + t.value); }
    else if (t.name === 'widget') toggleWidget(t.value, t.checked);
  });
  bgColor.addEventListener('input', function () {
    if (!/^#[0-9a-f]{6}$/i.test(bgColor.value)) return;
    state.bgc = bgColor.value.toLowerCase();
    commit();
  });
  $('#bg-reset').addEventListener('click', function () { state.bgc = ''; commit('cor do fundo: a do skin'); });
  $$('[data-bgc]', pimp).forEach(function (b) {
    b.addEventListener('click', function () { state.bgc = b.getAttribute('data-bgc'); commit('cor do fundo: ' + b.getAttribute('aria-label')); });
  });
  headInput.addEventListener('input', function () {
    state.head = cleanText(headInput.value, 60) || DEFAULT_HEAD;
    save();
    applyHeadline();
    refreshCode();
    updateShare();
  });
  $('#head-reset').addEventListener('click', function () {
    state.head = DEFAULT_HEAD;
    state.fx = 'liso';
    headInput.value = DEFAULT_HEAD;
    commit('headline original de volta');
  });

  /* --- "meu código": readable CSS-like text, parsed against a whitelist --- */
  function q(s) { return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
  function genCode() {
    var L = [
      '/* H◎RNEYSPACE 2.0 · meu código',
      '   edita e aperta "aplicar código" (tipo colar layout em 2006).',
      '   skin: ' + Object.keys(SKINS).join(' | '),
      '   fundo: ' + PATTERNS.join(' | '),
      '   cor-do-fundo: #rrggbb | auto',
      '   rastro: ' + TRAILS.join(' | '),
      '   efeito-headline: ' + FXS.join(' | '),
      '   widgets: ' + WIDGETS.join(' ') + ' (ou nenhum)',
      '   modo: classico | desktop */',
      '#perfil {',
      '  skin: ' + state.skin + ';',
      '  fundo: ' + state.bg + ';',
      '  cor-do-fundo: ' + (state.bgc || 'auto') + ';',
      '  rastro: ' + state.trail + ';',
      '  headline: ' + q(state.head) + ';',
      '  efeito-headline: ' + state.fx + ';',
      '  widgets: ' + (state.widgets.length ? state.widgets.join(' ') : 'nenhum') + ';',
      '  modo: ' + (state.desk ? 'desktop' : 'classico') + ';',
      '  ordem: ' + state.seq.join(' ') + ';',
      '}'
    ];
    var ids = state.seq.filter(function (id) { return state.pos[id]; });
    if (ids.length) {
      L.push('/* janelas no modo desktop: coluna 1–12, largura em colunas, topo e altura em px */');
      ids.forEach(function (id) {
        var p = state.pos[id];
        L.push('#janela-' + id + ' { coluna: ' + (p[0] + 1) + '; largura: ' + p[1] + '; topo: ' + p[2] + '; altura: ' + (p[3] || 'auto') + '; }');
      });
    }
    return L.join('\n');
  }
  function refreshCode(force) {
    if (pimp.hidden || codeDirty) return;
    if (!force && doc.activeElement === codeEl) return;
    codeEl.value = genCode();
  }
  codeEl.addEventListener('input', function () { codeDirty = true; });
  function short(s) {
    s = String(s);
    return '"' + (s.length > 32 ? s.slice(0, 32) + '…' : s) + '"';
  }
  function splitDecls(body) {
    var out = [], cur = '', inQ = false;
    function push() {
      var s = cur.trim();
      cur = '';
      if (!s) return;
      var k = s.indexOf(':');
      if (k < 1) { out.push({ bad: s }); return; }
      out.push({ p: s.slice(0, k).trim().toLowerCase(), v: s.slice(k + 1).trim() });
    }
    for (var i = 0; i < body.length; i++) {
      var ch = body.charAt(i);
      if (inQ) {
        cur += ch;
        if (ch === '\\' && i + 1 < body.length) cur += body.charAt(++i);
        else if (ch === '"') inQ = false;
        continue;
      }
      if (ch === '"') { inQ = true; cur += ch; continue; }
      if (ch === ';') { push(); continue; }
      cur += ch;
    }
    push();
    return out;
  }
  function unquote(v) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(v)) return null;
    return v.slice(1, -1).replace(/\\(.)/g, '$1');
  }
  function perfilDecl(next, d, errs) {
    if (d.bad) { errs.push('linha sem ":" — ' + short(d.bad) + ' ignorada'); return; }
    var v = d.v, lv = v.toLowerCase();
    function bad(extra) { errs.push(d.p + ': ' + short(v) + ' não vale' + (extra ? ' (' + extra + ')' : '') + ' — ignorado'); }
    switch (d.p) {
      case 'skin':
        if (Object.prototype.hasOwnProperty.call(SKINS, lv)) next.skin = lv; else bad();
        break;
      case 'fundo':
        if (PATTERNS.indexOf(lv) > -1) next.bg = lv; else bad();
        break;
      case 'cor-do-fundo':
        if (lv === 'auto') next.bgc = '';
        else if (/^#[0-9a-f]{6}$/.test(lv)) next.bgc = lv;
        else if (/^#[0-9a-f]{3}$/.test(lv)) next.bgc = '#' + lv[1] + lv[1] + lv[2] + lv[2] + lv[3] + lv[3];
        else bad('use #rrggbb');
        break;
      case 'rastro':
        if (TRAILS.indexOf(lv) > -1) next.trail = lv; else bad();
        break;
      case 'efeito-headline':
        if (FXS.indexOf(lv) > -1) next.fx = lv; else bad();
        break;
      case 'headline':
        var s = unquote(v);
        if (s === null) bad('precisa estar entre aspas');
        else next.head = cleanText(s, 60) || DEFAULT_HEAD;
        break;
      case 'widgets':
        var ws = lv.split(/[\s,]+/).filter(Boolean);
        ws.forEach(function (x) { if (WIDGETS.indexOf(x) < 0 && x !== 'nenhum') errs.push('widget ' + short(x) + ' não existe — ignorado'); });
        next.widgets = WIDGETS.filter(function (x) { return ws.indexOf(x) > -1; });
        next.seq = normSeq(next.seq, next.widgets);
        break;
      case 'modo':
        if (lv === 'classico' || lv === 'clássico') next.desk = false;
        else if (lv === 'desktop') next.desk = true;
        else bad();
        break;
      case 'ordem':
        var ids = lv.split(/[\s,]+/).filter(Boolean), known = panelIds(next.widgets);
        ids.forEach(function (x) { if (known.indexOf(x) < 0) errs.push('janela ' + short(x) + ' não existe — ignorada na ordem'); });
        next.seq = normSeq(ids, next.widgets);
        break;
      default:
        errs.push('propriedade ' + short(d.p) + ' não existe — ignorada');
    }
  }
  function janelaDecl(next, id, decls, errs) {
    if (panelIds(next.widgets).indexOf(id) < 0) { errs.push('janela ' + short(id) + ' não existe — bloco ignorado'); return; }
    var p = (next.pos[id] || [0, 3, 0, 0]).slice();
    decls.forEach(function (d) {
      if (d.bad) { errs.push('linha sem ":" — ' + short(d.bad) + ' ignorada'); return; }
      var raw = d.v.trim().toLowerCase();
      var num = /^\d{1,5}(px)?$/.test(raw) ? parseInt(raw, 10) : NaN;
      function bad() { errs.push('#janela-' + id + ' ' + d.p + ': ' + short(d.v) + ' não vale — ignorado'); }
      if (d.p === 'coluna') { if (num >= 1 && num <= 12) p[0] = num - 1; else bad(); }
      else if (d.p === 'largura') { if (num >= 2 && num <= 12) p[1] = num; else bad(); }
      else if (d.p === 'topo') { if (num >= 0 && num <= 20000) p[2] = num; else bad(); }
      else if (d.p === 'altura') {
        if (raw === 'auto') p[3] = 0;
        else if (num >= 120 && num <= 4000) p[3] = num;
        else bad();
      } else errs.push('propriedade ' + short(d.p) + ' não existe em #janela-' + id + ' — ignorada');
    });
    next.pos[id] = p;
  }
  function parseCode(src) {
    var errs = [];
    var next = JSON.parse(JSON.stringify(state));
    src = String(src).slice(0, 12000).replace(/\/\*[\s\S]*?\*\//g, ' ');
    var re = /([^{}]*)\{([^{}]*)\}/g, m, blocks = 0;
    while ((m = re.exec(src))) {
      blocks++;
      var sel = m[1].trim().toLowerCase();
      var decls = splitDecls(m[2]);
      if (sel === '#perfil') decls.forEach(function (d) { perfilDecl(next, d, errs); });
      else if (/^#janela-[a-z]+$/.test(sel)) janelaDecl(next, sel.slice(8), decls, errs);
      else errs.push('seletor ' + short(sel) + ' não existe — ignorado');
    }
    if (!blocks) errs.push('não achei nenhum bloco { } — nada aplicado');
    return { state: sanitize(next), errs: errs, ok: blocks > 0 };
  }
  function applyAll() {
    applyLook();
    syncWidgets();
    layout();
    syncEditor();
    updateShare();
  }
  $('#code-apply').addEventListener('click', function () {
    var r = parseCode(codeEl.value);
    codeLog.textContent = '';
    if (r.ok) {
      var keepMin = state.min, keepOlho = state.olho;
      state = r.state;
      state.min = keepMin.filter(function (id) { return state.seq.indexOf(id) > -1; });
      state.olho = keepOlho;
      save();
      applyAll();
      codeDirty = false;
      refreshCode(true);
    }
    var n = r.errs.length;
    codeLog.appendChild(h('li', { class: r.ok ? 'is-ok' : '', text: r.ok ? 'código aplicado ✓' + (n ? ' (' + n + (n > 1 ? ' avisos' : ' aviso') + ')' : '') : 'nada aplicado' }));
    r.errs.slice(0, 12).forEach(function (e) { codeLog.appendChild(h('li', { text: e })); });
    toast(r.ok ? 'código aplicado ✨' : 'código sem bloco válido — nada mudou');
  });
  $('#code-reset').addEventListener('click', function () {
    codeDirty = false;
    codeLog.textContent = '';
    refreshCode(true);
    say('código voltou pro layout atual.');
  });

  /* --- share: whole layout in the URL hash --- */
  function b64e(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function shareURL() {
    var o = { v: 1, skin: state.skin, bg: state.bg, bgc: state.bgc, trail: state.trail, head: state.head, fx: state.fx, widgets: state.widgets, seq: state.seq, desk: state.desk, pos: state.pos };
    return profileURL() + '#layout=' + b64e(JSON.stringify(o));
  }
  function updateShare() {
    if (pimp.hidden) return;
    $('#share-url').value = shareURL();
  }
  $('#share-copy').addEventListener('click', function () {
    var u = shareURL();
    $('#share-url').value = u;
    shareLink(u, 'olha o layout que eu fiz no perfil da HORNEY ✨', 'link do layout copiado! manda pro teu Top 8 ✨');
  });
  $('#share-url').addEventListener('focus', function (e) { e.target.select(); });

  var shareBar = $('#share-bar');
  var pendingLayout = null;
  function clearHash() {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* ignore */ }
  }
  function checkHash() {
    var hs = location.hash;
    if (hs.indexOf('#layout=') !== 0) return false;
    try {
      pendingLayout = sanitize(JSON.parse(b64d(hs.slice(8))));
    } catch (e) {
      pendingLayout = null;
      clearHash();
      toast('esse link de layout veio quebrado. pede pro teu amigo mandar de novo.');
      return false;
    }
    shareBar.hidden = false;
    $('#share-yes').focus({ preventScroll: true });
    say('Chegou um layout por link. Aplicar o layout que te mandaram?');
    return true;
  }
  function closeShareBar() {
    shareBar.hidden = true;
    pendingLayout = null;
    clearHash();
    maybeFriendReq();
  }
  $('#share-yes').addEventListener('click', function () {
    if (!pendingLayout) { closeShareBar(); return; }
    var s = pendingLayout;
    s.min = [];
    s.olho = state.olho;
    state = s;
    save();
    applyAll();
    codeDirty = false;
    refreshCode(true);
    toast('layout aplicado! agora o perfil é teu (e do teu amigo) ✨');
    closeShareBar();
    wins.perfil.el.focus({ preventScroll: true });
  });
  $('#share-no').addEventListener('click', function () {
    toast('beleza, teu layout ficou do jeito que tava');
    closeShareBar();
  });
  window.addEventListener('hashchange', checkHash);

  function maybeFriendReq() {
    if (store.get('met', 0) || !shareBar.hidden) return;
    setTimeout(showFriendReq, 1400);
  }

  /* ================= pausing: offscreen, hidden tab, idle ================= */
  var animIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (en) {
    en.forEach(function (x) { x.target.classList.toggle('is-off', !x.isIntersecting); });
  }) : null;
  if (animIO) $$('.anim').forEach(function (el) { animIO.observe(el); });
  var idleT = 0;
  var lastAct = 0;
  function goIdle() {
    root.classList.add('is-idle');
    clearTimeout(blinkT);
  }
  function wake() {
    if (root.classList.contains('is-idle')) {
      root.classList.remove('is-idle');
      scheduleBlink();
    }
    var now = Date.now();
    if (now - lastAct < 1000) return;
    lastAct = now;
    clearTimeout(idleT);
    idleT = setTimeout(goIdle, 45000);
  }
  ['pointermove', 'pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, wake, { passive: true });
  });
  doc.addEventListener('visibilitychange', function () {
    root.classList.toggle('is-hidden', doc.hidden);
    if (doc.hidden) {
      killTrail();
      clearTimeout(blinkT);
    } else scheduleBlink();
    Object.keys(wins).forEach(function (id) {
      var a = wins[id].api;
      if (a && a.wake) a.wake();
    });
  });
  onMQ(mqReduce, function () { syncTrail(); scheduleBlink(); });
  onMQ(mqFine, syncTrail);

  /* ================= init ================= */
  $$('.board .win').forEach(registerWin);
  registerWin(im.el);
  registerWin(olhoWin);
  if (ro) ro.observe(board);

  visits = (Number(store.get('visitas', 0)) || 0) + 1;
  store.set('visitas', visits);

  applyLook();
  syncWidgets();
  layout();

  var loginEl = $('#last-login');
  loginEl.textContent = pad(nowD.getDate()) + '/' + pad(nowD.getMonth() + 1) + '/' + nowD.getFullYear();
  loginEl.setAttribute('datetime', todayISO);
  $('#pf-mood').textContent = MOODS[moodI];
  if (HM) {
    var sorte = HM.oraculo.sorte();
    $('#pf-status').textContent = sorte;
    $('#im-sorte').textContent = 'sorte do dia: ' + sorte;
  } else {
    $('#pf-sorte-note').hidden = true;
    var st = $('#im-status');
    st.classList.add('is-off');
    st.textContent = 'Offline (o oráculo não carregou)';
    im.input.disabled = true;
    im.send.setAttribute('aria-disabled', 'true');
  }

  setTitle();
  emitPlayer();
  renderShows();
  renderFriend();
  buildGlyphs($('#c-glyphs'), 'c-glyph', friend ? friend.g : GLYPHS[0]);
  buildGlyphs($('#add-glyphs'), 'add-glyph', friend ? friend.g : GLYPHS[0]);
  prefillNicks();
  updChars();
  renderChips();

  if (HM) {
    refreshWall();
    HM.mural.subscribe(setComments);
  } else {
    setComments([]);
    [cName, cText].forEach(function (el) { el.disabled = true; });
    cSubmit.setAttribute('aria-disabled', 'true');
    qSubmit.setAttribute('aria-disabled', 'true');
    setStatus(cStatus, 'o mural tá fora do ar agora (o módulo do mural não carregou). os comentários fictícios continuam aqui.', true);
    setStatus(qStatus, 'o mural tá fora do ar agora — dá pra ler o questionário, mas não repassar.', true);
  }

  if (!checkHash()) maybeFriendReq();
  wake();
  scheduleBlink();
})();
