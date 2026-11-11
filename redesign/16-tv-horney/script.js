/* HORNEY · 16 TV HORNEY — emissora, grade, controle remoto, Disk Olho 0900 */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const pad2 = (n) => String(n).padStart(2, '0');
  const later = (fn, ms) => window.setTimeout(fn, ms);
  const wait = (ms) => new Promise((res) => { window.setTimeout(res, ms); });
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mqReduce.matches;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------------------ */
  /* Local state (prefix horney:16-tv-horney:)                           */
  /* ------------------------------------------------------------------ */
  const PREFIX = 'horney:16-tv-horney:';
  const store = {
    get(k, fallback) {
      try {
        const v = window.localStorage.getItem(PREFIX + k);
        return v === null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(k, v) {
      try { window.localStorage.setItem(PREFIX + k, v); } catch (e) { /* sem storage: só memória */ }
    },
    del(k) {
      try { window.localStorage.removeItem(PREFIX + k); } catch (e) { /* idem */ }
    }
  };

  const H = window.Horney && window.Horney.mural && window.Horney.oraculo ? window.Horney : null;

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */
  const IG = 'https://www.instagram.com/horney.band/';
  const DM = 'https://ig.me/m/horney.band';

  // Todas as datas da agenda num array só. Status calculado pela data real.
  const SHOWS = [
    { date: '2026-09-17', dow: 'QUI', title: 'ROCK NIGHT @ FFFRONT', where: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso', blurb: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.', link: IG, linkLabel: 'FOTOS NO IG ↗' },
    { date: '2026-10-03', dow: 'SÁB', title: 'HORNEY AO VIVO', where: 'LOCAL NÃO INFORMADO', blurb: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤', link: IG, linkLabel: 'FOTOS NO IG ↗' },
    { date: '2026-10-09', dow: 'SEX', title: 'ÚLTIMO SHOW DO ANO', where: 'LOCAL EM BREVE — fica de olho no insta', blurb: 'Último show do ano. SAI DE CASA E COLE NOS SHOWS!!! Local e ingressos saem primeiro nos stories.', link: IG, linkLabel: 'INFOS NO IG ↗' }
  ];

  function todayKey(d) {
    const x = d || new Date();
    return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate());
  }
  const brDate = (iso) => { const p = iso.split('-'); return p[2] + '/' + p[1]; };
  function upcomingShows() {
    const t = todayKey();
    return SHOWS.filter((s) => s.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  function pastShows() {
    const t = todayKey();
    return SHOWS.filter((s) => s.date < t).sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const NO_SHOW = 'sem shows marcados — cola no Instagram pra saber primeiro';

  const PARTS = [
    { id: 'madrugada', label: 'MADRUGADA', start: 0, end: 5 },
    { id: 'manha', label: 'MANHÃ', start: 5, end: 12 },
    { id: 'tarde', label: 'TARDE', start: 12, end: 18 },
    { id: 'noite', label: 'NOITE', start: 18, end: 24 }
  ];
  const partIndex = (h) => (h < 5 ? 0 : h < 12 ? 1 : h < 18 ? 2 : 3);
  const hhmm = (h) => pad2(h % 24) + ':00';

  // Classificação indicativa por canal (piada de emissora, não é dado da banda)
  const CI = {
    0: { ci: 'L', why: 'livre pra todos os públicos' },
    1: { ci: 'L', why: 'livre' },
    2: { ci: 'L', why: 'livre · contém chuva' },
    3: { ci: 'L', why: 'livre · contém voto' },
    4: { ci: '12', why: 'não recomendado pra menores de 12: contém peso e melancolia' },
    5: { ci: 'L', why: 'livre · texto em 40 colunas' },
    6: { ci: 'L', why: 'livre · contém exagero de vendedor' },
    7: { ci: '14', why: 'não recomendado pra menores de 14: contém verdades' },
    8: { ci: 'L', why: 'livre · conteúdo dos telespectadores' }
  };

  // Grade: [madrugada, manhã, tarde, noite]
  const GRID = {
    0: [
      { t: 'Fita da Madrugada', s: 'Videocassete ligado, luz apagada: Fool\'s Game e HORNEY ao vivo na estante. Escolhe a fita.' },
      { t: 'Sessão VHS', s: 'Clipe oficial de Fool\'s Game (2022, dir. Rique Duarte) e 38 segundos de suor ao vivo.' },
      { t: 'Videoteca HORNEY', s: 'Duas fitas, zero comercial. Rebobinar é por tua conta.' },
      { t: 'Locadora Aberta', s: 'Fool\'s Game ou HORNEY ao vivo? Devolve rebobinada.' }
    ],
    1: [
      { t: 'Corujão da Vinheta', s: 'A TV HORNEY não dorme. Vinheta, grade e o Disk Olho ao vivo no CH 07.' },
      { t: 'Bom Dia, Joinville', s: 'Café, chuva e a grade do dia. ANTI-RASO já saiu: 4 faixas, nenhuma pra pular.' },
      { t: 'Vale a Pena Ouvir de Novo', s: 'Tarde de reprise: do primeiro EP, Four Rooms for Four Fools (2022), ao ANTI-RASO (2026).' },
      { t: 'Horário Nobre HORNEY', s: 'Quarteto de alt/indie rock de Joinville (SC). Punk, hardcore e grunge com respiros de MPB — e, desde 2026, cantando em português.' }
    ],
    2: [
      { t: 'Jornal da Madrugada', s: 'As notícias da HORNEY pra quem não dormiu: lançamento, imprensa, giro de shows e a previsão do tempo.' },
      { t: 'HORNEY Notícias · 1ª edição', s: 'ANTI-RASO, Unglued 7.8/10 e o giro de shows. Com previsão de chuva pra Joinville, claro.' },
      { t: 'Plantão HORNEY', s: 'Interrompemos a programação: ANTI-RASO continua fora agora.' },
      { t: 'Jornal HORNEY · edição da noite', s: 'Manchetes, letreiro, previsão do tempo e a reportagem especial: quem é a HORNEY.' }
    ],
    3: [
      { t: 'Disk Insônia', s: 'A parada pra quem tá acordado: vota na favorita e ela sobe pro topo.' },
      { t: 'Disk Café', s: 'OFF!, QUEBRA-CABEÇA, MERGULHAR, ROMÂNTICA e os clipes. Você manda na ordem.' },
      { t: 'Disk HORNEY', s: 'A parada da TV HORNEY. 1 voto por aparelho, dá pra trocar.' },
      { t: 'Disk HORNEY ao Vivo', s: 'A contagem do teu jeito: as faixas do ANTI-RASO e os clipes do canal.' }
    ],
    4: [
      { t: 'Corujão: ANTI-RASO', s: 'O EP inteiro, de OFF! a ROMÂNTICA, pra ouvir de luz apagada.' },
      { t: 'Sessão Matinê', s: 'ANTI-RASO do começo ao fim, sem pular faixa.' },
      { t: 'Sessão ANTI-RASO', s: 'Hoje na Sessão: um EP de 4 faixas sobre mergulhar fundo nas coisas. Duração: 13:53.' },
      { t: 'Supercine ANTI-RASO', s: 'Capa, créditos, tracklist e o EP inteiro no player. Reprises logo depois.' }
    ],
    5: [
      { t: 'Teletexto da Madrugada', s: 'Agenda em 40 colunas: 301 próximos shows, 302 já rolou, 303 booking.' },
      { t: 'Agenda em Texto', s: 'Status de cada show calculado pela data de hoje. Digita a página no controle.' },
      { t: 'Teletexto HORNEY', s: 'Páginas 300 a 303: agenda, shows que já rolaram e como levar a HORNEY pra tua cidade.' },
      { t: 'Teletexto HORNEY · P300', s: 'A agenda da HORNEY em blocos coloridos. 301 próximos, 302 já rolou, 303 booking.' }
    ],
    6: [
      { t: 'Televendas da Madrugada', s: 'Liga já! (liga = manda DM). Merch EM BREVE, sem preço.' },
      { t: 'Shop HORNEY', s: 'Camiseta ANTI-RASO, camiseta OLHO, moletom OFF!, ecobag, pôster e bottons. Tudo EM BREVE.' },
      { t: 'Ligue Já!', s: 'Nada de carrinho, nada de checkout. Quer garantir? Manda DM e a gente te avisa primeiro.' },
      { t: 'Mas Não É Só Isso!', s: 'Seis produtos, zero preço e um relógio contando pra nada. Reserva na DM.' }
    ],
    7: [
      { t: 'Disk Olho 0900 · AO VIVO', s: 'O olho do logo atende ao vivo. Liga, pergunta, e a resposta sai em legenda.' },
      { t: 'Disk Olho 0900 (reprise)', s: 'Reprise do programa da madrugada, mas a linha continua aberta: pergunta que o olho responde.' },
      { t: 'Disk Olho 0900 (reprise)', s: 'Reprise do programa da madrugada, mas a linha continua aberta: pergunta que o olho responde.' },
      { t: 'Disk Olho 0900 (reprise)', s: 'Reprise. À meia-noite o olho volta ao vivo. A linha já tá aberta.' }
    ],
    8: [
      { t: 'Recados da Madrugada', s: 'Os recados dos telespectadores passando no letreiro. Manda o teu.' },
      { t: 'Mural do Telespectador', s: 'Recados de quem assiste, lista paginada e os classificados da HORNEY.' },
      { t: 'Canal Aberto', s: 'Acesso público: recados, classificados e as redes da HORNEY.' },
      { t: 'Classificados & Recados', s: 'O letreiro dos fãs e onde achar a HORNEY: Instagram, TikTok, Threads, YouTube e Spotify.' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* Elements                                                            */
  /* ------------------------------------------------------------------ */
  const tube = $('#tube');
  const tela = $('#tela');
  const screenEl = $('#screen');
  const sections = $$('.channel', tela);
  const chx = $('#ch-x');
  const byNum = new Map();
  sections.forEach((s) => {
    const n = Number(s.dataset.n);
    if (n >= 0) byNum.set(n, s);
  });
  const ORDER = Array.from(byNum.keys()).sort((a, b) => a - b);
  const MAXCH = ORDER[ORDER.length - 1];
  const announcer = $('#announcer');
  const osd = $('#osd');
  const osdNum = $('#osd-num');
  const osdName = $('#osd-name');
  const osdVol = $('#osd-vol');
  const osdVolK = $('#osd-vol-k');
  const osdVolBar = $('#osd-vol-bar');
  const osdVolN = $('#osd-vol-n');
  const ccLine = $('#cc-line');
  const infobar = $('#infobar');
  const signoff = $('#signoff');
  const ambient = $('#ambient');
  const remote = $('#remote');
  const btnPower = $('#btn-power');
  const btnMute = $('#btn-mute');
  const btnCC = $('#btn-cc');
  const btnSheet = $('#btn-sheet');
  const guia = $('#guia');
  const menu = $('#menu');

  let current = 1;
  let target = 1;
  let lastCh = null;
  let activeSection = null;
  let powered = false;

  const announce = (t) => { announcer.textContent = t; };
  const nameFor = (n) => (byNum.has(n) ? byNum.get(n).dataset.name : 'SEM SINAL');
  const sectionFor = (n) => byNum.get(n) || chx;
  const chLabel = (n) => 'Canal ' + pad2(n) + ': ' + nameFor(n);

  /* ------------------------------------------------------------------ */
  /* Grain tile (gerado uma vez)                                          */
  /* ------------------------------------------------------------------ */
  try {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const x = c.getContext('2d');
    const img = x.createImageData(128, 128);
    const b = new Uint32Array(img.data.buffer);
    for (let i = 0; i < b.length; i++) {
      const v = (Math.random() * 255) | 0;
      b[i] = 0xff000000 | (v << 16) | (v << 8) | v;
    }
    x.putImageData(img, 0, 0);
    root.style.setProperty('--grain', 'url(' + c.toDataURL('image/png') + ')');
  } catch (e) { /* sem grão */ }

  /* ------------------------------------------------------------------ */
  /* Still state: aba oculta, ociosidade, TV desligada                   */
  /* ------------------------------------------------------------------ */
  let idle = false;
  let lastAct = performance.now();
  function updateStill() {
    root.classList.toggle('is-still', document.hidden || idle || !powered);
  }
  function activity() {
    lastAct = performance.now();
    if (idle) {
      idle = false;
      updateStill();
    }
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => {
    window.addEventListener(ev, activity, { passive: true, capture: true });
  });
  document.addEventListener('scroll', activity, { passive: true, capture: true });

  // Animações infinitas fora da tela pausam
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => en.target.classList.toggle('is-offscreen', !en.isIntersecting));
    });
    $$('.anim, .anim-host', tela).forEach((n) => io.observe(n));
  }

  /* ------------------------------------------------------------------ */
  /* Heartbeat (1 s) — timers de canal só rodam no canal ativo            */
  /* ------------------------------------------------------------------ */
  const tasks = [];
  function every(sec, fn, ch) { tasks.push({ sec, fn, ch, acc: 0 }); }
  let hb = 0;
  function heartbeat() {
    if (!idle && performance.now() - lastAct > 45000) {
      idle = true;
      updateStill();
    }
    tasks.forEach((t) => {
      if (t.ch != null && (!powered || current !== t.ch || idle)) return;
      t.acc += 1;
      if (t.acc >= t.sec) {
        t.acc = 0;
        t.fn();
      }
    });
  }
  function startHB() { if (!hb) hb = window.setInterval(heartbeat, 1000); }
  function stopHB() { window.clearInterval(hb); hb = 0; }

  /* ------------------------------------------------------------------ */
  /* Canvas static: quadros pré-calculados, desenhados só no burst        */
  /* ------------------------------------------------------------------ */
  const staticFx = (() => {
    const cvs = $('#static');
    const ctx = cvs.getContext('2d');
    const W = 160;
    const Hh = 120;
    const frames = [];
    let raf = 0;
    let last = 0;
    let fi = 0;
    let start = 0;
    let until = 0;
    cvs.width = W;
    cvs.height = Hh;
    for (let f = 0; f < 8; f++) {
      const img = ctx.createImageData(W, Hh);
      const buf = new Uint32Array(img.data.buffer);
      for (let i = 0; i < buf.length; i++) {
        const v = (Math.random() * 255) | 0;
        buf[i] = 0xff000000 | (v << 16) | (v << 8) | v;
      }
      frames.push(img);
    }
    function paint(c2, bars) {
      fi = (fi + 1 + ((Math.random() * 3) | 0)) % frames.length;
      const off = (Math.random() * Hh) | 0;
      c2.putImageData(frames[fi], 0, off);
      c2.putImageData(frames[fi], 0, off - Hh);
      if (bars) {
        for (let k = 0; k < 3; k++) {
          c2.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.6)';
          c2.fillRect(0, (Math.random() * Hh) | 0, W, 2 + ((Math.random() * Hh * 0.12) | 0));
        }
      }
    }
    function loop(now) {
      raf = 0;
      if (now >= until || document.hidden) {
        cvs.style.opacity = '0';
        return;
      }
      if (now - last >= 24) {
        last = now;
        paint(ctx, true);
        const t = (now - start) / (until - start);
        cvs.style.opacity = String(Math.max(0, 0.95 - 0.95 * t * t));
      }
      raf = window.requestAnimationFrame(loop);
    }
    function burst(ms) {
      if (reduce) return;
      start = performance.now();
      until = start + ms;
      if (!raf) raf = window.requestAnimationFrame(loop);
    }
    function paintTo(canvas) {
      const c2 = canvas.getContext('2d');
      canvas.width = W;
      canvas.height = Hh;
      paint(c2, false);
    }
    return { burst, paintTo };
  })();

  /* ------------------------------------------------------------------ */
  /* Web Audio sintetizado (mudo por padrão)                              */
  /* ------------------------------------------------------------------ */
  const audio = (() => {
    let ctx = null;
    let master = null;
    let noise = null;
    let hum = null;
    let tone = null;
    let muted = true;
    let vol = clamp(Number(store.get('vol', '5')) || 0, 0, 10);
    if (store.get('vol', null) === null) vol = 5;
    const gainFor = (v) => Math.pow(v / 10, 2) * 0.9;

    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : gainFor(vol);
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    }
    function ready() {
      if (muted || vol === 0 || document.hidden) return null;
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
      return c;
    }
    function applyGain() {
      if (!ctx) return;
      master.gain.setTargetAtTime(muted ? 0 : gainFor(vol), ctx.currentTime, 0.03);
    }
    function env(g, t, peak, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.setValueAtTime(peak * 0.8, t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    function blip(dur) {
      const c = ready();
      if (!c) return;
      const d0 = dur || 0.28;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noise;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700;
      const g = c.createGain();
      env(g, t, 0.3, d0);
      src.connect(hp).connect(g).connect(master);
      src.start(t, Math.random() * 0.5, d0 + 0.05);
    }
    function power(on) {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(on ? 120 : 900, t);
      o.frequency.exponentialRampToValueAtTime(on ? 36 : 45, t + 0.4);
      env(g, t, 0.5, 0.48);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.52);
      if (on) blip(0.5);
    }
    function ring() {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.6].forEach((o) => {
        g.gain.setValueAtTime(0.0001, t + o);
        g.gain.exponentialRampToValueAtTime(0.12, t + o + 0.02);
        g.gain.setValueAtTime(0.12, t + o + 0.38);
        g.gain.exponentialRampToValueAtTime(0.0001, t + o + 0.42);
      });
      g.connect(master);
      [440, 480].forEach((f) => {
        const o = c.createOscillator();
        o.frequency.value = f;
        o.connect(g);
        o.start(t);
        o.stop(t + 1.1);
      });
    }
    function startHum() {
      if (hum || !powered) return;
      const c = ready();
      if (!c) return;
      const g = c.createGain();
      g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.022, c.currentTime + 0.4);
      g.connect(master);
      const oscs = [120, 240].map((f) => {
        const o = c.createOscillator();
        o.frequency.value = f;
        o.connect(g);
        o.start();
        return o;
      });
      hum = { g, oscs };
    }
    function stopHum() {
      if (!hum) return;
      const h = hum;
      hum = null;
      try {
        h.oscs.forEach((o) => o.stop(ctx.currentTime + 0.1));
      } catch (e) { /* já parou */ }
    }
    function setTone(on) {
      if (on) {
        if (tone) return;
        const c = ready();
        if (!c) return;
        const g = c.createGain();
        g.gain.value = 0.05;
        g.connect(master);
        const o = c.createOscillator();
        o.frequency.value = 1000;
        o.connect(g);
        o.start();
        tone = o;
      } else if (tone) {
        try { tone.stop(); } catch (e) { /* ok */ }
        tone = null;
      }
    }
    function setMuted(m) {
      muted = m;
      if (!m) {
        ready();
        applyGain();
        startHum();
      } else {
        applyGain();
        stopHum();
        setTone(false);
      }
    }
    function setVol(v) {
      vol = clamp(v, 0, 10);
      store.set('vol', String(vol));
      applyGain();
      if (vol === 0) stopHum();
      else if (!muted) startHum();
    }
    function onVisibility() {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else if (!muted) ctx.resume();
    }
    return { blip, power, ring, startHum, stopHum, setTone, setMuted, setVol, onVisibility, isMuted: () => muted, getVol: () => vol };
  })();

  /* ------------------------------------------------------------------ */
  /* OSD, volume, clock                                                  */
  /* ------------------------------------------------------------------ */
  let osdT = 0;
  function showOsdText(num, name) {
    osdNum.textContent = num;
    osdName.textContent = name;
    osd.classList.remove('is-visible');
    void osd.offsetWidth;
    osd.classList.add('is-visible');
    window.clearTimeout(osdT);
    osdT = later(() => osd.classList.remove('is-visible'), 2800);
  }
  const showOsdFor = (n) => showOsdText('CH ' + pad2(n), nameFor(n));

  for (let i = 0; i < 10; i++) osdVolBar.append(el('i'));
  let volT = 0;
  function showVol() {
    const m = audio.isMuted();
    const v = audio.getVol();
    osdVolK.textContent = m ? 'MUTE' : 'VOLUME';
    $$('i', osdVolBar).forEach((b, k) => b.classList.toggle('on', !m && k < v));
    osdVolN.textContent = m ? '--' : pad2(v);
    osdVol.classList.add('is-visible');
    window.clearTimeout(volT);
    volT = later(() => osdVol.classList.remove('is-visible'), 1800);
  }

  const brasilia = new Date().getTimezoneOffset() === 180;
  $('#osd-clock-l').textContent = brasilia ? 'HORÁRIO DE BRASÍLIA' : 'HORA LOCAL';
  const clockEls = ['#osd-clock', '#vcr-clock', '#rack-clock'].map((s) => $(s)).filter(Boolean);
  const ttxClock = $('#ttx-clock');
  let lastHM = '';
  function tickClock() {
    const d = new Date();
    const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    if (hm !== lastHM) {
      lastHM = hm;
      clockEls.forEach((c) => { c.textContent = hm; });
    }
    if (current === 5 && powered) ttxClock.textContent = hm + ':' + pad2(d.getSeconds());
  }

  /* ------------------------------------------------------------------ */
  /* Programme grid                                                      */
  /* ------------------------------------------------------------------ */
  function slot(n, d) {
    const pi = partIndex((d || new Date()).getHours());
    const ni = (pi + 1) % 4;
    return { pi, part: PARTS[pi], prog: GRID[n][pi], next: GRID[n][ni], nextPart: PARTS[ni], live: n === 7 && pi === 0 };
  }
  function ciBadge(n) {
    const b = el('span', 'ci', CI[n].ci);
    b.setAttribute('role', 'img');
    b.dataset.ci = CI[n].ci;
    b.title = CI[n].why;
    b.setAttribute('aria-label', 'Classificação ' + CI[n].ci + ': ' + CI[n].why);
    return b;
  }
  function renderProg(p, n) {
    const s = slot(n);
    p.replaceChildren(ciBadge(n), el('span', null, (s.live ? 'AO VIVO · ' : 'AGORA · ') + s.prog.t), el('b', null, 'A SEGUIR ' + hhmm(s.part.end) + ' · ' + s.next.t));
  }

  const olhoLive = $('#olho-live');
  function updateSchedule() {
    const d = new Date();
    const s1 = slot(1, d);
    $$('.prog[data-prog]').forEach((p) => renderProg(p, Number(p.dataset.prog)));
    $('#ch1-now').textContent = s1.prog.t;
    $('#ch1-now-s').textContent = s1.prog.s;
    $('#ch1-next-time').textContent = hhmm(s1.part.end);
    $('#ch1-next').textContent = s1.next.t;
    $('#ch1-daypart').textContent = '· ' + s1.part.label;
    $$('#ch1-picks .pick').forEach((a) => {
      const n = Number(a.dataset.goto);
      let sm = a.querySelector('small');
      if (!sm) {
        sm = el('small');
        a.append(sm);
      }
      sm.textContent = 'agora: ' + GRID[n][s1.pi].t;
    });
    $$('.weather__grid li').forEach((li) => li.classList.toggle('is-now', li.dataset.part === s1.part.id));

    const live = s1.pi === 0;
    olhoLive.classList.toggle('is-live', live);
    olhoLive.lastChild.textContent = live ? ' AO VIVO' : ' REPRISE · AO VIVO À 00H';
    const k = $('#ch1-olho-k');
    const sub = $('#ch1-olho-s');
    if (live) {
      k.textContent = 'NO AR AGORA · AO VIVO';
      sub.textContent = 'O olho tá atendendo até as 05:00. Liga lá no CH 07: pergunta o que quiser, ele responde no ar.';
    } else {
      const mins = (24 * 60) - (d.getHours() * 60 + d.getMinutes());
      k.textContent = 'HOJE À 00H · AO VIVO';
      sub.textContent = 'Ao vivo da meia-noite às 5h — faltam ' + Math.floor(mins / 60) + 'h' + pad2(mins % 60) + '. A reprise já atende: liga no CH 07.';
    }
    if (!infobar.hidden) fillInfo();
  }

  /* ------------------------------------------------------------------ */
  /* Shows: próximo show em todo lugar                                    */
  /* ------------------------------------------------------------------ */
  function updateNextShow() {
    const up = upcomingShows();
    const t = todayKey();
    let ticker;
    let card;
    if (up.length) {
      const s = up[0];
      const pre = s.date === t ? 'É HOJE!!! ' : '';
      ticker = 'PRÓXIMO SHOW: ' + pre + brDate(s.date) + ' · ' + s.title;
      card = pre + brDate(s.date) + ' ' + s.dow + ' · ' + s.title + ' — ' + s.where;
    } else {
      ticker = 'PRÓXIMO SHOW: ' + NO_SHOW.toUpperCase();
      card = NO_SHOW;
    }
    $$('.js-next-show').forEach((n) => { n.textContent = ticker; });
    $('#ch1-show').textContent = card;
  }

  /* ------------------------------------------------------------------ */
  /* Closed captions                                                     */
  /* ------------------------------------------------------------------ */
  let ccOn = store.get('cc', '0') === '1';
  const dynCaption = {};
  function renderCaption() {
    const show = ccOn && powered;
    ccLine.hidden = !show;
    if (!show || !activeSection) return;
    ccLine.textContent = dynCaption[current] || activeSection.dataset.cc;
  }
  function caption(n, text) {
    dynCaption[n] = text;
    if (n === current) renderCaption();
  }
  function setCC(on, quiet) {
    ccOn = on;
    store.set('cc', on ? '1' : '0');
    root.classList.toggle('cc-on', on);
    btnCC.setAttribute('aria-pressed', String(on));
    $('#menu-cc').firstChild.textContent = 'Legenda CC: ' + (on ? 'ligada ' : 'desligada ');
    renderCaption();
    if (!quiet) announce(on ? 'Legenda CC ligada' : 'Legenda CC desligada');
  }

  /* ------------------------------------------------------------------ */
  /* INFO banner                                                         */
  /* ------------------------------------------------------------------ */
  let infoT = 0;
  function fillInfo() {
    const n = current;
    $('#info-n').textContent = pad2(n);
    $('#info-name').textContent = nameFor(n);
    const badge = $('#info-ci');
    if (!byNum.has(n)) {
      badge.textContent = 'L';
      badge.dataset.ci = 'L';
      badge.setAttribute('aria-label', 'Classificação L: livre');
      $('#info-prog').textContent = 'Sem sinal';
      $('#info-time').textContent = '24 horas';
      $('#info-syn').textContent = 'Nenhuma emissora neste canal. A TV HORNEY vai do 00 ao 08.';
      $('#info-next').textContent = 'mais chiado';
      return;
    }
    const s = slot(n);
    badge.textContent = CI[n].ci;
    badge.dataset.ci = CI[n].ci;
    badge.setAttribute('aria-label', 'Classificação ' + CI[n].ci + ': ' + CI[n].why);
    $('#info-prog').textContent = s.prog.t;
    $('#info-time').textContent = hhmm(s.part.start) + '–' + hhmm(s.part.end) + ' · ' + CI[n].why;
    $('#info-syn').textContent = s.prog.s;
    $('#info-next').textContent = hhmm(s.nextPart.start) + ' · ' + s.next.t;
  }
  function showInfo() {
    if (!powered) return;
    fillInfo();
    showOsdFor(current);
    infobar.hidden = false;
    infobar.classList.remove('is-in');
    if (!reduce) {
      void infobar.offsetWidth;
      infobar.classList.add('is-in');
    }
    window.clearTimeout(infoT);
    infoT = later(hideInfo, 7000);
  }
  function hideInfo() {
    window.clearTimeout(infoT);
    infobar.hidden = true;
  }
  const toggleInfo = () => (infobar.hidden ? showInfo() : hideInfo());

  /* ------------------------------------------------------------------ */
  /* Channel modules (enter / leave)                                     */
  /* ------------------------------------------------------------------ */
  const MODS = {};
  function modEnter(sec) {
    const m = MODS[sec.id];
    if (m && m.enter) m.enter();
  }
  function modLeave(sec) {
    const m = MODS[sec.id];
    if (m && m.leave) m.leave();
  }

  /* ------------------------------------------------------------------ */
  /* "▼ ROLA" cue: shows when the tuned channel has more content below   */
  /* ------------------------------------------------------------------ */
  const moreCue = $('#more-cue');
  let moreRaf = 0;
  function checkMore() {
    moreRaf = 0;
    const s = activeSection;
    const more = !!s && s.scrollHeight - s.clientHeight - s.scrollTop > 24;
    if (more !== moreCue.classList.contains('is-on')) moreCue.classList.toggle('is-on', more);
  }
  function queueMore() {
    if (!moreRaf) moreRaf = window.requestAnimationFrame(checkMore);
  }
  sections.forEach((s) => s.addEventListener('scroll', queueMore, { passive: true }));
  window.addEventListener('resize', queueMore);
  if ('ResizeObserver' in window) {
    const moreRO = new ResizeObserver(queueMore);
    sections.forEach((s) => {
      if (s.firstElementChild) moreRO.observe(s.firstElementChild);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Channel switching                                                   */
  /* ------------------------------------------------------------------ */
  const digitBtns = $$('[data-digit]');
  function syncUI() {
    const n = current;
    const sec = activeSection;
    digitBtns.forEach((b) => {
      if (Number(b.dataset.digit) === n) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    tube.dataset.ch = String(n);
    root.style.setProperty('--glow', sec.dataset.glow);
    if (!reduce) {
      ambient.classList.remove('is-swap');
      void ambient.offsetWidth;
      ambient.classList.add('is-swap');
    }
    document.title = 'CH ' + pad2(n) + ' · ' + nameFor(n) + ' — TV HORNEY';
    const hash = '#ch-' + n;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    if (byNum.has(n)) store.set('ch', String(n));
    renderCaption();
    if (!infobar.hidden) fillInfo();
  }

  function swapTo(n) {
    const next = sectionFor(n);
    const hadFocus = activeSection && activeSection !== next && activeSection.contains(document.activeElement);
    if (activeSection && activeSection !== next) {
      modLeave(activeSection);
      activeSection.classList.remove('is-active');
      dynCaption[current] = null;
    }
    if (next === chx) $('#chx-n').textContent = 'CH ' + pad2(n);
    next.classList.add('is-active');
    next.scrollTop = 0;
    activeSection = next;
    current = n;
    dynCaption[n] = null;
    modEnter(next);
    syncUI();
    queueMore();
    if (hadFocus) {
      const h = next.querySelector('[tabindex="-1"]');
      if (h) h.focus({ preventScroll: true });
    }
  }

  let swapT = 0;
  let tuneT = 0;
  function tune(n) {
    if (!Number.isFinite(n) || n < 0) return;
    if (!powered) {
      powerOn(n);
      return;
    }
    if (!signoff.hidden) closeSignoff(signoff.contains(document.activeElement));
    if (n === target && n === current) {
      showOsdFor(n);
      return;
    }
    if (n !== current) lastCh = current;
    target = n;
    showOsdFor(n);
    announce(chLabel(n));
    audio.blip();
    if (reduce) {
      swapTo(n);
      return;
    }
    staticFx.burst(460);
    tube.classList.remove('is-tuning');
    void tube.offsetWidth;
    tube.classList.add('is-tuning');
    window.clearTimeout(swapT);
    swapT = later(() => swapTo(n), 140);
    window.clearTimeout(tuneT);
    tuneT = later(() => tube.classList.remove('is-tuning'), 520);
  }

  function step(dir) {
    let n;
    if (target > MAXCH) n = dir > 0 ? ORDER[0] : MAXCH;
    else n = (target + dir + MAXCH + 1) % (MAXCH + 1);
    tune(n);
  }
  function goLast() {
    if (lastCh == null) {
      if (powered) showOsdText('ÚLT', 'nenhum canal anterior');
      return;
    }
    tune(lastCh);
  }

  /* digit entry: dois dígitos, ou páginas do teletexto no CH 05 */
  let digitBuf = '';
  let digitT = 0;
  function commitDigits() {
    window.clearTimeout(digitT);
    const n = Number(digitBuf);
    digitBuf = '';
    closeSheet();
    if (Number.isFinite(n)) tune(n);
  }
  function pressDigit(d) {
    if (powered && activeSection === byNum.get(5) && !digitBuf && (ttx.typing() || d === '3')) {
      ttx.digit(d);
      return;
    }
    digitBuf += d;
    window.clearTimeout(digitT);
    if (digitBuf.length >= 2) {
      commitDigits();
      return;
    }
    if (powered) showOsdText('CH ' + digitBuf + '-', 'digite outro número ou espere');
    digitT = later(commitDigits, 900);
  }

  /* ------------------------------------------------------------------ */
  /* Power + sign-off                                                    */
  /* ------------------------------------------------------------------ */
  let powerT = 0;
  function setPowerUI() {
    btnPower.setAttribute('aria-pressed', String(powered));
    btnPower.setAttribute('aria-label', (powered ? 'Desligar a TV (P)' : 'Ligar a TV (P)') + '. Segure pra encerrar a transmissão');
  }
  function powerOn(n) {
    if (powered) return;
    powered = true;
    updateStill();
    window.clearTimeout(powerT);
    tube.classList.remove('anim-off');
    root.classList.remove('power-off');
    root.classList.add('power-on');
    tela.inert = false;
    target = n == null ? target : n;
    swapTo(target);
    setPowerUI();
    audio.power(true);
    audio.startHum();
    announce('TV ligada. ' + chLabel(target));
    if (reduce) {
      showOsdFor(target);
      return;
    }
    tube.classList.remove('anim-on');
    void tube.offsetWidth;
    tube.classList.add('anim-on');
    staticFx.burst(900);
    powerT = later(() => {
      tube.classList.remove('anim-on');
      showOsdFor(target);
    }, 950);
  }
  function powerOff() {
    if (!powered) return;
    powered = false;
    window.clearTimeout(powerT);
    window.clearTimeout(swapT);
    tube.classList.remove('anim-on', 'is-tuning');
    if (target !== current) swapTo(target);
    const focusInTube = tube.contains(document.activeElement);
    if (!signoff.hidden) closeSignoff(false);
    hideInfo();
    modLeave(activeSection);
    if (focusInTube) btnPower.focus();
    tela.inert = true;
    osd.classList.remove('is-visible');
    setPowerUI();
    audio.power(false);
    audio.stopHum();
    renderCaption();
    announce('TV desligada. Aperte power ou um número.');
    const finish = () => {
      tube.classList.remove('anim-off');
      root.classList.remove('power-on');
      root.classList.add('power-off');
      updateStill();
    };
    if (reduce) {
      finish();
      return;
    }
    tube.classList.add('anim-off');
    powerT = later(finish, 600);
  }
  const togglePower = () => (powered ? powerOff() : powerOn());

  function showSignoff() {
    if (!powered) powerOn();
    hideInfo();
    signoff.hidden = false;
    tela.inert = true;
    audio.setTone(true);
    caption(current, '[TOM DE 1 KHZ] barras coloridas. Fim da transmissão — mentira, a TV HORNEY é 24 horas.');
    announce('Fim da transmissão: barras coloridas. Aperte qualquer canal pra voltar.');
    $('#signoff-back').focus({ preventScroll: true });
  }
  function closeSignoff(refocus) {
    signoff.hidden = true;
    tela.inert = !powered;
    audio.setTone(false);
    dynCaption[current] = null;
    renderCaption();
    if (refocus && activeSection) {
      const h = activeSection.querySelector('[tabindex="-1"]');
      if (h) h.focus({ preventScroll: true });
    }
  }
  $('#signoff-back').addEventListener('click', () => {
    closeSignoff(true);
    showOsdFor(current);
  });

  // Segurar o power = barras de encerramento
  let pressT = 0;
  let longPressed = false;
  btnPower.addEventListener('pointerdown', () => {
    longPressed = false;
    window.clearTimeout(pressT);
    pressT = later(() => {
      longPressed = true;
      showSignoff();
    }, 750);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btnPower.addEventListener(ev, () => window.clearTimeout(pressT)));
  btnPower.addEventListener('contextmenu', (e) => e.preventDefault());
  btnPower.addEventListener('click', () => {
    if (longPressed) {
      longPressed = false;
      return;
    }
    togglePower();
  });

  /* ------------------------------------------------------------------ */
  /* Mute / volume                                                       */
  /* ------------------------------------------------------------------ */
  function syncMuteUI() {
    const m = audio.isMuted();
    btnMute.setAttribute('aria-pressed', String(m));
    btnMute.setAttribute('aria-label', m ? 'MUTE: som mudo, aperte pra ligar (M)' : 'MUTE: som ligado, aperte pra deixar mudo (M)');
    $('#menu-mute').firstChild.textContent = 'Som: ' + (m ? 'mudo ' : 'ligado ');
  }
  function toggleMute() {
    const m = !audio.isMuted();
    audio.setMuted(m);
    syncMuteUI();
    announce(m ? 'Som mudo' : 'Som ligado, volume ' + audio.getVol());
    if (powered) {
      showVol();
      if (!m) audio.blip(0.15);
      if (!m && !signoff.hidden) audio.setTone(true);
    }
  }
  function volStep(dir) {
    if (audio.isMuted()) {
      audio.setMuted(false);
      syncMuteUI();
    }
    audio.setVol(audio.getVol() + dir);
    if (!signoff.hidden) audio.setTone(true);
    audio.blip(0.1);
    showVol();
    announce('Volume ' + audio.getVol());
  }

  /* ------------------------------------------------------------------ */
  /* Remote                                                              */
  /* ------------------------------------------------------------------ */
  function closeSheet() {
    if (!remote.classList.contains('is-open')) return;
    remote.classList.remove('is-open');
    btnSheet.setAttribute('aria-expanded', 'false');
  }
  btnSheet.addEventListener('click', () => {
    const open = !remote.classList.contains('is-open');
    remote.classList.toggle('is-open', open);
    btnSheet.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('pointerdown', (e) => {
    if (remote.classList.contains('is-open') && !remote.contains(e.target)) closeSheet();
  });

  digitBtns.forEach((b) => b.addEventListener('click', () => pressDigit(b.dataset.digit)));
  $('#btn-chup').addEventListener('click', () => step(1));
  $('#btn-chdn').addEventListener('click', () => step(-1));
  $('#btn-volup').addEventListener('click', () => volStep(1));
  $('#btn-voldn').addEventListener('click', () => volStep(-1));
  btnMute.addEventListener('click', toggleMute);
  $('#btn-info').addEventListener('click', toggleInfo);
  btnCC.addEventListener('click', () => setCC(!ccOn));
  $('#btn-last').addEventListener('click', goLast);
  $('#btn-guia').addEventListener('click', openGuide);
  $('#btn-menu').addEventListener('click', openMenu);

  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    tune(Number(a.dataset.goto));
  });

  /* ------------------------------------------------------------------ */
  /* GUIA (EPG) + MENU dialogs                                           */
  /* ------------------------------------------------------------------ */
  function openModal(d) {
    if (d.open) return;
    if (typeof d.showModal === 'function') d.showModal();
    else d.setAttribute('open', '');
  }
  function closeModal(d) {
    if (!d.open) return;
    if (typeof d.close === 'function') d.close();
    else d.removeAttribute('open');
  }
  $$('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(b.closest('dialog'))));
  [guia, menu].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) closeModal(d); }));

  function guideCell(n, part, prog, live, label) {
    const td = el('td');
    td.dataset.label = label;
    const b = el('button', 'guia__cell' + (live ? ' is-live' : ''));
    b.type = 'button';
    b.dataset.tune = String(n);
    const tm = el('time', null, hhmm(part.start) + '–' + hhmm(part.end));
    b.append(tm, el('b', null, prog.t), ciBadge(n));
    b.setAttribute('aria-label', 'CH ' + pad2(n) + ', ' + label + ', ' + hhmm(part.start) + ' às ' + hhmm(part.end) + ': ' + prog.t + (live ? ', ao vivo' : '') + '. Sintonizar.');
    td.append(b);
    return td;
  }
  function renderGuide() {
    const body = $('#guia-body');
    const d = new Date();
    body.replaceChildren();
    ORDER.forEach((n) => {
      const s = slot(n, d);
      const tr = el('tr');
      if (n === current) tr.className = 'is-current';
      const th = el('th', null, 'CH ' + pad2(n));
      th.scope = 'row';
      th.append(el('small', null, nameFor(n)));
      tr.append(th, guideCell(n, s.part, s.prog, s.live, 'AGORA'), guideCell(n, s.nextPart, s.next, n === 7 && s.nextPart.id === 'madrugada', 'A SEGUIR'));
      body.append(tr);
    });
    $('#guia-time').textContent = slot(1, d).part.label + ' · ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' · ' + (brasilia ? 'horário de Brasília' : 'hora local');
  }
  function openGuide() {
    closeSheet();
    renderGuide();
    openModal(guia);
    const cur = guia.querySelector('tr.is-current .guia__cell') || guia.querySelector('.guia__cell');
    if (cur) cur.focus();
    caption(current, '[GUIA DE PROGRAMAÇÃO] grade dos canais 00 a 08, agora e a seguir.');
  }
  guia.addEventListener('click', (e) => {
    const b = e.target.closest('.guia__cell');
    if (!b) return;
    closeModal(guia);
    tune(Number(b.dataset.tune));
  });
  guia.addEventListener('keydown', (e) => {
    const b = e.target.closest && e.target.closest('.guia__cell');
    if (!b) return;
    const cells = $$('.guia__cell', guia);
    const i = cells.indexOf(b);
    let j = -1;
    if (e.key === 'ArrowDown') j = i + 2;
    else if (e.key === 'ArrowUp') j = i - 2;
    else if (e.key === 'ArrowRight') j = i % 2 === 0 ? i + 1 : i;
    else if (e.key === 'ArrowLeft') j = i % 2 === 1 ? i - 1 : i;
    else return;
    e.preventDefault();
    if (j >= 0 && j < cells.length) cells[j].focus();
  });
  guia.addEventListener('close', () => {
    dynCaption[current] = null;
    renderCaption();
  });

  function openMenu() {
    closeSheet();
    openModal(menu);
    const f = menu.querySelector('.menu__list button');
    if (f) f.focus();
  }
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'cc') setCC(!ccOn);
    else if (act === 'mute') toggleMute();
    else {
      closeModal(menu);
      if (act === 'guia') openGuide();
      else if (act === 'info') showInfo();
      else if (act === 'signoff') showSignoff();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Keyboard, wheel, swipe, hash                                        */
  /* ------------------------------------------------------------------ */
  const canScroll = (sc, dir) => !!sc && (dir > 0 ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2 : sc.scrollTop > 2);

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (guia.open || menu.open) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    const k = e.key;
    if (/^[0-9]$/.test(k)) {
      e.preventDefault();
      pressDigit(k);
      return;
    }
    switch (k) {
      case 'ArrowRight': e.preventDefault(); step(1); break;
      case 'ArrowLeft': e.preventDefault(); step(-1); break;
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!powered) return;
        const dir = k === 'ArrowDown' ? 1 : -1;
        e.preventDefault();
        if (canScroll(activeSection, dir)) activeSection.scrollBy({ top: dir * 160, behavior: reduce ? 'auto' : 'smooth' });
        else step(dir);
        break;
      }
      case 'g': case 'G': e.preventDefault(); openGuide(); break;
      case 'i': case 'I': toggleInfo(); break;
      case 'm': case 'M': toggleMute(); break;
      case 'c': case 'C': setCC(!ccOn); break;
      case 'p': case 'P': togglePower(); break;
      case 'u': case 'U': goLast(); break;
      case '+': case '=': volStep(1); break;
      case '-': case '_': volStep(-1); break;
      case 'Escape':
        if (remote.classList.contains('is-open')) {
          closeSheet();
          btnSheet.focus();
        } else if (!signoff.hidden) closeSignoff(true);
        else if (!infobar.hidden) hideInfo();
        break;
      default:
    }
  });

  let wheelAcc = 0;
  let wheelLock = 0;
  let lastNative = 0;
  let wheelIdleT = 0;
  screenEl.addEventListener('wheel', (e) => {
    if (!powered || e.ctrlKey || !signoff.hidden) return;
    const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
    const dy = (vertical ? e.deltaY : e.deltaX) * mult;
    const dir = Math.sign(dy);
    if (!dir) return;
    const now = performance.now();
    if (now < wheelLock) {
      e.preventDefault();
      return;
    }
    if (vertical && canScroll(activeSection, dir)) {
      lastNative = now;
      wheelAcc = 0;
      return;
    }
    e.preventDefault();
    if (now - lastNative < 380) return;
    wheelAcc += dy;
    window.clearTimeout(wheelIdleT);
    wheelIdleT = later(() => { wheelAcc = 0; }, 240);
    if (Math.abs(wheelAcc) > 90) {
      wheelAcc = 0;
      wheelLock = now + 850;
      step(dir);
    }
  }, { passive: false });

  let tx0 = 0;
  let ty0 = 0;
  let tt0 = 0;
  screenEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    tx0 = e.touches[0].clientX;
    ty0 = e.touches[0].clientY;
    tt0 = performance.now();
  }, { passive: true });
  screenEl.addEventListener('touchend', (e) => {
    if (!tt0 || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - tx0;
    const dy = e.changedTouches[0].clientY - ty0;
    const dt = performance.now() - tt0;
    tt0 = 0;
    if (dt < 700 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (powered) step(dx < 0 ? 1 : -1);
      else powerOn();
    }
  }, { passive: true });

  const hashCh = () => {
    const m = /^#ch-(\d{1,2})$/.exec(location.hash);
    return m ? Number(m[1]) : null;
  };
  window.addEventListener('hashchange', () => {
    const n = hashCh();
    if (n != null) tune(n);
  });

  /* ================================================================== */
  /* CH 01 · TV HORNEY                                                   */
  /* ================================================================== */
  (() => {
    const ident = $('#ident');
    let identT = 0;
    function playIdent() {
      if (reduce) return;
      ident.classList.remove('is-playing');
      void ident.offsetWidth;
      ident.classList.add('is-playing');
      window.clearTimeout(identT);
      identT = later(() => ident.classList.remove('is-playing'), 2600);
      caption(1, '[VINHETA] raios giram, o olho-sol abre, sobe o logo da TV HORNEY. [trilha de vinheta]');
    }
    $('#btn-ident').addEventListener('click', playIdent);

    const BUMPERS = [
      ['VOLTAMOS JÁ', 'com HORNEY · ANTI-RASO — FORA AGORA'],
      ['JÁ VOLTAMOS', 'SAI DE CASA E COLE NOS SHOWS!!! ⚡😈'],
      ['NO INTERVALO', 'MERCH EM BREVE · CH 06 TELEVENDAS'],
      ['VOLTAMOS JÁ', 'liga pro olho · CH 07 · 0900-OLHO-000'],
      ['PLANTÃO', 'UNGLUED: 7.8/10 PRO ANTI-RASO']
    ];
    const bumper = $('#bumper');
    let bi = 0;
    function nextBumper() {
      bi = (bi + 1) % BUMPERS.length;
      $('#bumper-big').textContent = BUMPERS[bi][0];
      $('#bumper-small').textContent = BUMPERS[bi][1];
      bumper.classList.remove('is-swap');
      void bumper.offsetWidth;
      bumper.classList.add('is-swap');
    }
    every(6, () => { if (!reduce) nextBumper(); }, 1);

    MODS['ch-1'] = {
      enter() { playIdent(); },
      leave() {
        window.clearTimeout(identT);
        ident.classList.remove('is-playing');
      }
    };
  })();

  /* ================================================================== */
  /* CH 02 · JORNAL HORNEY                                               */
  /* ================================================================== */
  (() => {
    const AR = 'Capa do EP ANTI-RASO: uma porta aberta no meio do mar, um olho gigante e raios em magenta e azul.';
    const up = upcomingShows();
    const past = pastShows();
    let agenda;
    if (up.length) {
      const s = up[0];
      agenda = { k: 'AGENDA', t: (s.date === todayKey() ? 'É HOJE: ' : 'PRÓXIMO SHOW: ') + brDate(s.date) + ' · ' + s.title, b: s.where + '. ' + s.blurb, href: s.link, label: s.linkLabel };
    } else {
      const last = past[0];
      const lastTxt = last ? ' O último da agenda foi ' + last.title + ', em ' + brDate(last.date) + '.' : '';
      agenda = { k: 'AGENDA', t: 'SEM SHOWS MARCADOS', b: NO_SHOW + '.' + lastTxt + ' Datas novas saem primeiro nos stories.', href: IG, label: '@horney.band ↗' };
    }
    const NEWS = [
      { k: 'LANÇAMENTO', t: 'HORNEY LANÇA O EP ANTI-RASO', b: 'EP · lançado em 30 de julho de 2026 · 4 faixas · 7.8/10 na Unglued. OFF!, QUEBRA-CABEÇA feat. Dani Buarque, MERGULHAR e ROMÂNTICA.', img: '../assets/cover-anti-raso.jpg', alt: AR, href: 'https://open.spotify.com/album/7EM81z5ydGQq04ZbkIE5aS', label: 'OUVIR ANTI-RASO ↗' },
      { k: 'IMPRENSA', t: 'UNGLUED DÁ 7.8/10 PRO ANTI-RASO', b: 'A review de ANTI-RASO na Unglued: 7.8 de 10. A gente imprimiu e colou na geladeira (mentalmente).', img: '../assets/cover-anti-raso.jpg', alt: AR, href: 'https://www.unglued.com.br/reviews/anti-raso', label: 'ler a review ↗' },
      { k: 'ENTREVISTA', t: 'DUDA: “É SE RECUSAR A VIVER APENAS NA SUPERFÍCIE”', b: '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.” — Duda Maiolini, voz & letras', img: '../assets/ig-post-2.jpg', alt: 'Duda Maiolini cantando no microfone, luz vermelha, guitarrista ao fundo', href: 'https://open.spotify.com/album/7EM81z5ydGQq04ZbkIE5aS', label: 'OUVIR ANTI-RASO ↗' },
      { k: 'GIRO DE SHOWS', t: 'JOINVILLE INVADIU SP', b: 'Qui, 17/09/2026, FFFront, São Paulo: HORNEY + Mastrobiso no mesmo flyer — e que flyer.', img: '../assets/sympla-rock-night.jpg', alt: 'Flyer do Rock Night na FFFront, São Paulo, com HORNEY e Mastrobiso', href: IG, label: 'Fotos no IG ↗' },
      { k: 'GIRO DE SHOWS', t: '03/10: MAIS UMA NOITE DE ANTI-RASO AO VIVO', b: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤', img: '../assets/ig-post-5.jpg', alt: 'Público fazendo chifrinho e sorrindo depois do show', href: IG, label: 'Fotos no IG ↗' },
      { k: agenda.k, t: agenda.t, b: agenda.b, img: '../assets/ig-post-4.jpg', alt: 'Guitarrista de cabelo cacheado em luz vermelha com o texto “UM RECADO IMPORTANTE”', href: agenda.href, label: agenda.label },
      { k: 'LANÇAMENTO', t: 'OFF! ABRE O DISCO', b: 'single · lançado em 13 de novembro de 2025 · abre o EP ANTI-RASO. Você. No próximo show. Na grade. Gritando o refrão de OFF!', img: '../assets/cover-off.jpg', alt: 'Capa do single OFF!', href: 'https://open.spotify.com/album/6Cg0ULHHKTsJo7GlEfPKrF', label: 'OUVIR OFF! ↗' }
    ];
    const gc = $('#news-gc');
    const fig = $('.studio__chroma');
    const img = $('#news-img');
    const pauseBtn = $('#news-pause');
    let ni = 0;
    let paused = reduce;
    function syncPause() {
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.textContent = paused ? '▶ CONTINUAR' : '❚❚ PAUSAR';
    }
    function show(i, manual) {
      ni = (i + NEWS.length) % NEWS.length;
      const n = NEWS[ni];
      gc.setAttribute('aria-live', manual ? 'polite' : 'off');
      $('#news-kicker').textContent = n.k;
      $('#news-title').textContent = n.t;
      $('#news-body').textContent = n.b;
      const link = $('#news-link');
      link.href = n.href;
      link.textContent = n.label;
      img.src = n.img;
      img.alt = n.alt;
      if (n.img.indexOf('sympla') !== -1) {
        img.width = 1179;
        img.height = 662;
      } else {
        img.width = 640;
        img.height = 640;
      }
      $('#news-count').textContent = (ni + 1) + '/' + NEWS.length;
      if (!reduce) {
        [gc, fig].forEach((x) => {
          x.classList.remove('is-swap');
          void x.offsetWidth;
          x.classList.add('is-swap');
        });
      }
      caption(2, '[GC] ' + n.k + ': ' + n.t);
    }
    $('#news-prev').addEventListener('click', () => show(ni - 1, true));
    $('#news-next').addEventListener('click', () => show(ni + 1, true));
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      syncPause();
    });
    every(9, () => { if (!paused) show(ni + 1, false); }, 2);
    syncPause();
    show(0, false);
    MODS['ch-2'] = { enter() { caption(2, '[GC] ' + NEWS[ni].k + ': ' + NEWS[ni].t); } };
  })();

  /* ================================================================== */
  /* CH 03 · DISK HORNEY (voto local + FLIP)                             */
  /* ================================================================== */
  (() => {
    const AR = 'Capa do EP ANTI-RASO: uma porta aberta no meio do mar, um olho gigante e raios em magenta e azul.';
    const DISK = [
      { id: 'off', kind: 'sp', title: 'OFF!', cap: '“OFF!”', album: 'ANTI-RASO · 2026', extra: 'faixa 01 · 3:19', meta: 'ANTI-RASO · faixa 01 · 3:19', note: 'single · lançado em 13 de novembro de 2025 · abre o EP ANTI-RASO', tid: '7KteAUfbNB4CtxnbMudBad', img: '../assets/cover-off.jpg', alt: 'Capa do single OFF!' },
      { id: 'quebra', kind: 'sp', title: 'QUEBRA-CABEÇA (feat. Dani Buarque)', cap: '“QUEBRA-CABEÇA”', album: 'ANTI-RASO · 2026', extra: 'feat. Dani Buarque · faixa 02 · 4:20', meta: 'ANTI-RASO · faixa 02 · 4:20', note: 'Divide a faixa 2 de ANTI-RASO com a HORNEY. Tem peça que só encaixa a dois.', tid: '3SYpLwh1ChHyNEOn5TNOWy', img: '../assets/cover-anti-raso.jpg', alt: AR },
      { id: 'mergulhar', kind: 'sp', title: 'MERGULHAR', cap: '“MERGULHAR”', album: 'ANTI-RASO · 2026', extra: 'faixa 03 · 3:45', meta: 'ANTI-RASO · faixa 03 · 3:45', note: 'single · 2026 · também está no EP ANTI-RASO', tid: '0aJtgSakI5r87CfAqNdDXP', img: '../assets/cover-mergulhar.jpg', alt: 'Capa do single MERGULHAR' },
      { id: 'romantica', kind: 'sp', title: 'ROMÂNTICA', cap: '“ROMÂNTICA”', album: 'ANTI-RASO · 2026', extra: 'faixa 04 · 2:28', meta: 'ANTI-RASO · faixa 04 · 2:28', note: 'Fecha o ANTI-RASO em 2:28. Curta. Não rasa.', tid: '2p5r9m60eSDxMGey8GRubR', img: '../assets/cover-anti-raso.jpg', alt: AR },
      { id: 'fools', kind: 'yt', title: 'Fool\'s Game — clipe oficial', cap: '“Fool\'s Game”', album: 'videoclipe oficial · 2022', extra: 'dir. Rique Duarte', meta: '2022 · dir. Rique Duarte', note: 'Clipe oficial (2022), dirigido por Rique Duarte.', yt: '9uP1P11at9M', ytTitle: 'HORNEY — Fool\'s Game (videoclipe oficial)', img: '../assets/yt-fools-game.jpg', alt: '' },
      { id: 'live', kind: 'yt', title: 'HORNEY ao vivo', cap: '“HORNEY ao vivo”', album: 'ao vivo · 0:38', extra: '38 segundos de suor', meta: 'ao vivo · 0:38', note: '38 segundos de HORNEY ao vivo. Agora imagina inteiro, na tua frente.', yt: 'V9Rpgtc2vTs', ytTitle: 'HORNEY ao vivo (clipe de 38s)', img: '../assets/yt-live.jpg', alt: '' }
    ];
    const byId = new Map(DISK.map((d) => [d.id, d]));
    const list = $('#disk-list');
    const stage = $('#disk-stage');
    const vj = $('#disk-vj');
    const statusEl = $('#disk-status');
    const clearBtn = $('#disk-clear');
    const items = new Map();
    let vote = store.get('voto', null);
    if (vote && !byId.has(vote)) vote = null;
    let selected = null;

    function order() {
      const base = DISK.map((d) => d.id);
      if (!vote) return base;
      return [vote].concat(base.filter((id) => id !== vote));
    }

    function buildItem(d) {
      const li = el('li', 'dk');
      li.dataset.id = d.id;
      const pos = el('span', 'dk__pos', '');
      pos.setAttribute('aria-hidden', 'true');
      const th = el('img', 'dk__thumb');
      th.src = d.img;
      th.alt = '';
      th.width = d.kind === 'yt' ? 1280 : 640;
      th.height = d.kind === 'yt' ? 720 : 640;
      th.loading = 'lazy';
      th.decoding = 'async';
      const info = el('span', 'dk__info');
      const sr = el('span', 'sr-only', '');
      sr.className = 'sr-only dk__sr';
      info.append(sr, el('b', null, d.title), el('span', null, d.meta));
      const act = el('span', 'dk__act');
      const play = el('button', 'dk__btn', d.kind === 'yt' ? '▶ ASSISTIR' : '▶ OUVIR');
      play.type = 'button';
      play.dataset.act = 'play';
      play.setAttribute('aria-label', 'Pôr no ar: ' + d.title);
      const v = el('button', 'dk__btn', '♥ VOTAR');
      v.type = 'button';
      v.dataset.act = 'vote';
      v.setAttribute('aria-pressed', 'false');
      act.append(play, v);
      li.append(pos, th, info, act);
      return li;
    }

    function syncItems(ord) {
      ord.forEach((id, i) => {
        const li = items.get(id);
        const d = byId.get(id);
        li.querySelector('.dk__pos').textContent = String(i + 1);
        li.querySelector('.dk__sr').textContent = 'Posição ' + (i + 1) + ': ';
        const mine = id === vote;
        li.classList.toggle('is-voted', mine);
        li.classList.toggle('is-selected', id === selected);
        const v = li.querySelector('[data-act="vote"]');
        v.setAttribute('aria-pressed', String(mine));
        v.textContent = mine ? '♥ MEU VOTO' : '♥ VOTAR';
        v.setAttribute('aria-label', mine ? 'Teu voto está em ' + d.title + '. Aperte pra tirar.' : 'Votar em ' + d.title);
      });
      clearBtn.hidden = !vote;
    }

    function reorder(animate) {
      const ord = order();
      const focused = document.activeElement;
      const first = new Map();
      const doAnim = animate && !reduce;
      if (doAnim) ord.forEach((id) => first.set(id, items.get(id).getBoundingClientRect().top));
      ord.forEach((id) => list.appendChild(items.get(id)));
      syncItems(ord);
      if (focused && list.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
      if (!doAnim) return;
      const moved = [];
      ord.forEach((id) => {
        const li = items.get(id);
        const dy = first.get(id) - li.getBoundingClientRect().top;
        if (Math.abs(dy) > 1) {
          li.style.transition = 'none';
          li.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
          moved.push(li);
        }
      });
      if (!moved.length) return;
      void list.offsetWidth;
      moved.forEach((li) => {
        li.style.transition = 'transform .65s cubic-bezier(.2, .8, .2, 1)';
        li.style.transform = '';
      });
      later(() => moved.forEach((li) => { li.style.transition = ''; }), 700);
    }

    function stageFacade(d) {
      stage.replaceChildren();
      stage.classList.toggle('is-track', d.kind === 'sp');
      if (d.kind === 'yt') {
        const b = el('button', 'facade');
        b.type = 'button';
        b.dataset.load = d.id;
        const im = el('img');
        im.src = d.img;
        im.alt = '';
        im.width = 1280;
        im.height = 720;
        im.decoding = 'async';
        const p = el('span', 'facade__play', '▶ PLAY');
        p.setAttribute('aria-hidden', 'true');
        b.append(im, p, el('span', 'sr-only', 'Assistir: ' + d.ytTitle + ' (carrega o player do YouTube)'));
        stage.append(b);
      } else {
        const im = el('img');
        im.src = d.img;
        im.alt = d.alt;
        im.width = 640;
        im.height = 640;
        im.decoding = 'async';
        const b = el('button', 'track-load');
        b.type = 'button';
        b.dataset.load = d.id;
        b.append(document.createTextNode('▶ OUVIR ' + d.cap + ' AQUI'), el('small', null, 'carrega o player do Spotify'));
        stage.append(im, b);
      }
    }

    function loadEmbed(d) {
      if (d.kind === 'yt') {
        const f = el('iframe', 'yt-frame');
        f.src = 'https://www.youtube-nocookie.com/embed/' + d.yt + '?autoplay=1&rel=0&playsinline=1';
        f.title = d.ytTitle;
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        stage.replaceChildren(f);
        f.focus();
      } else {
        const f = el('iframe', 'sp-frame');
        f.src = 'https://open.spotify.com/embed/track/' + d.tid + '?utm_source=generator&theme=0';
        f.title = 'Spotify — HORNEY, ' + d.title;
        f.width = '100%';
        f.height = '152';
        f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        const b = stage.querySelector('.track-load');
        if (b) b.remove();
        stage.append(f);
        f.focus();
      }
      caption(3, '[DISK HORNEY] tocando ' + d.title + '.');
    }

    function select(id) {
      const d = byId.get(id);
      selected = id;
      stageFacade(d);
      $('#vj-title').textContent = d.cap;
      $('#vj-album').textContent = d.album;
      $('#vj-extra').textContent = d.extra;
      $('#disk-note').textContent = d.note;
      if (!reduce) {
        vj.classList.remove('is-swap');
        void vj.offsetWidth;
        vj.classList.add('is-swap');
      }
      syncItems(order());
      caption(3, '[VJ] HORNEY, ' + d.cap + ', ' + d.album + '. ' + d.note);
    }

    function setVote(id) {
      const prev = vote;
      vote = prev === id ? null : id;
      if (vote) store.set('voto', vote);
      else store.del('voto');
      reorder(true);
      if (vote) {
        statusEl.textContent = 'Teu voto foi pra ' + byId.get(vote).title + '. Nº 1 no teu Disk HORNEY.';
        const li = items.get(vote);
        const old = li.querySelector('.dk__move');
        if (old) old.remove();
        const badge = el('span', 'dk__move', '▲ Nº 1');
        badge.setAttribute('aria-hidden', 'true');
        li.append(badge);
        later(() => badge.remove(), 1700);
        audio.blip(0.12);
      } else {
        statusEl.textContent = 'Voto retirado: a parada volta pra ordem do disco.';
      }
    }

    list.replaceChildren();
    DISK.forEach((d) => {
      const li = buildItem(d);
      items.set(d.id, li);
    });
    reorder(false);
    select(order()[0]);

    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const id = b.closest('.dk').dataset.id;
      if (b.dataset.act === 'vote') setVote(id);
      else {
        select(id);
        const first = stage.querySelector('[data-load]');
        if (first) first.focus({ preventScroll: true });
        stage.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    stage.addEventListener('click', (e) => {
      const b = e.target.closest('[data-load]');
      if (b) loadEmbed(byId.get(b.dataset.load));
    });
    clearBtn.addEventListener('click', () => {
      if (vote) setVote(vote);
      const f = list.querySelector('[data-act="vote"]');
      if (f) f.focus();
    });

    MODS['ch-3'] = {
      leave() {
        if (stage.querySelector('iframe')) stageFacade(byId.get(selected));
      }
    };
  })();

  /* ================================================================== */
  /* CH 04 · SESSÃO ANTI-RASO (Spotify carrega na primeira sintonia)     */
  /* ================================================================== */
  (() => {
    const player = $('#sessao-player');
    let loaded = false;
    MODS['ch-4'] = {
      enter() {
        if (loaded) return;
        loaded = true;
        const f = document.createElement('iframe');
        f.title = 'Spotify: HORNEY — ANTI-RASO';
        f.src = 'https://open.spotify.com/embed/album/7EM81z5ydGQq04ZbkIE5aS?utm_source=generator&theme=0';
        f.width = '100%';
        f.height = '420';
        f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
        player.append(f);
      }
    };
  })();

  /* ================================================================== */
  /* CH 05 · TELETEXTO                                                   */
  /* ================================================================== */
  const ttx = (() => {
    const body = $('#ttx-body');
    const head = $('#ttx-page');
    const fast = $$('.fx[data-page]');
    body.setAttribute('aria-live', 'off');
    let page = 300;
    let buf = '';
    let bufT = 0;

    function wrap(text, w) {
      const out = [];
      let line = '';
      text.split(/\s+/).forEach((word) => {
        if (!line) line = word;
        else if ((line + ' ' + word).length <= w) line += ' ' + word;
        else {
          out.push(line);
          line = word;
        }
      });
      if (line) out.push(line);
      return out;
    }
    // L([...]): string = texto branco; [cls, texto] = span colorido; {href, text} = link
    function L(parts, cls) {
      const p = el('p', 'tl' + (cls ? ' ' + cls : ''));
      (parts || []).forEach((x) => {
        if (typeof x === 'string') p.append(document.createTextNode(x));
        else if (Array.isArray(x)) p.append(el('span', x[0], x[1]));
        else {
          const a = el('a', null, x.text);
          a.href = x.href;
          if (/^https:/.test(x.href)) {
            a.target = '_blank';
            a.rel = 'noopener';
          }
          p.append(a);
        }
      });
      return p;
    }
    const blank = () => L([]);
    const bar = (cls, left, right) => L([' ' + left + ' '.repeat(Math.max(1, 36 - left.length - right.length)) + right + ' '], cls);

    function showBlock(s, status) {
      const lines = [];
      const lab = status === 'past' ? ['c-w', '[JÁ FOI]'] : status === 'today' ? ['bg-r c-w ttx-blink', '[HOJE!!!]'] : ['bg-g', '[PRÓXIMO]'];
      lines.push(L([lab, ' ', ['c-c', brDate(s.date) + '/2026 ' + s.dow]]));
      lines.push(L([['c-y', s.title]]));
      wrap(s.where, 38).forEach((t) => lines.push(L([t])));
      wrap(s.blurb, 38).forEach((t) => lines.push(L([['c-c', t]])));
      lines.push(L([{ href: s.link, text: s.linkLabel }]));
      lines.push(blank());
      return lines;
    }

    function render(p) {
      const up = upcomingShows();
      const past = pastShows();
      const t = todayKey();
      let lines = [];
      let title = '';
      if (p === 300) {
        title = 'índice';
        lines = [
          bar('bg-b', 'ÍNDICE', 'P300'),
          blank(),
          L([['c-c', '301'], ' PRÓXIMOS SHOWS ........ ', up.length ? ['c-g', up.length + (up.length === 1 ? ' DATA' : ' DATAS')] : ['c-r', 'NENHUM']]),
          L([['c-c', '302'], ' JÁ ROLOU .............. ', ['c-w', past.length + ' SHOWS']]),
          L([['c-c', '303'], ' QUER HORNEY NA TUA CIDADE?']),
          blank(),
          L([['c-y', 'AGENDA HORNEY 2026']]),
          L(['STATUS CALCULADO PELA DATA DE HOJE:']),
          L([['c-g', t.split('-').reverse().join('/')]]),
          blank(),
          L([['c-m', 'SAI DE CASA E COLE NOS SHOWS!!! ⚡😈']]),
          blank(),
          L([['c-g', 'DIGITE 3-0-1 NO CONTROLE OU USE']]),
          L([['c-g', 'OS BOTÕES COLORIDOS ABAIXO']])
        ];
      } else if (p === 301) {
        title = 'próximos shows';
        lines = [bar('bg-g', 'PRÓXIMOS SHOWS', 'P301'), blank()];
        if (!up.length) {
          lines.push(
            L([['c-y', 'SEM SHOWS MARCADOS —']]),
            L([['c-y', 'COLA NO INSTAGRAM PRA SABER PRIMEIRO']]),
            blank(),
            L(['DATAS NOVAS, LOCAL E INGRESSOS']),
            L(['SAEM PRIMEIRO NOS STORIES.']),
            blank(),
            L([{ href: IG, text: 'INSTAGRAM @HORNEY.BAND ↗' }]),
            blank()
          );
        } else {
          up.forEach((s) => { lines = lines.concat(showBlock(s, s.date === t ? 'today' : 'next')); });
        }
        lines.push(L([['c-m', 'NÃO VIU TUA CIDADE? → P303']]));
      } else if (p === 302) {
        title = 'shows que já rolaram';
        lines = [bar('bg-y', 'JÁ ROLOU', 'P302'), blank()];
        if (!past.length) lines.push(L(['NENHUM SHOW PASSADO NA AGENDA.']), blank());
        past.forEach((s) => { lines = lines.concat(showBlock(s, 'past')); });
        lines.push(L([['c-m', 'PRÓXIMOS SHOWS → P301']]));
      } else if (p === 303) {
        title = 'booking';
        lines = [bar('bg-r', 'BOOKING', 'P303'), blank()];
        wrap('Não viu sua cidade? Chama a gente — DM no Instagram. Datas novas saem primeiro lá.', 38).forEach((x) => lines.push(L([['c-y', x]])));
        lines.push(
          blank(),
          L([{ href: DM, text: 'DM NO INSTAGRAM ↗' }]),
          blank(),
          L(['O CANAL É A DM: SEM E-MAIL,']),
          L(['SEM TELEFONE, SEM FORMULÁRIO.']),
          blank(),
          L([{ href: IG, text: '@HORNEY.BAND ↗' }])
        );
      } else {
        title = 'não encontrada';
        lines = [
          bar('bg-r', 'PÁGINA ' + p, 'ERRO'),
          blank(),
          L([['c-y', 'PÁGINA ' + p + ' NÃO ENCONTRADA']]),
          blank(),
          L(['TENTE 300, 301, 302 OU 303']),
          L([['c-g', 'OU APERTE UM BOTÃO COLORIDO']])
        ];
      }
      body.replaceChildren(...lines);
      return title;
    }

    function go(p, quiet) {
      page = p;
      buf = '';
      head.textContent = 'P' + p;
      head.classList.remove('is-typing');
      const title = render(p);
      fast.forEach((b) => {
        if (Number(b.dataset.page) === p) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
      caption(5, '[TELETEXTO] página ' + p + ': ' + title + '.');
      if (!quiet) announce('Teletexto, página ' + p + ': ' + title);
    }
    function digit(d) {
      buf += d;
      window.clearTimeout(bufT);
      head.textContent = 'P' + buf.padEnd(3, '-');
      head.classList.add('is-typing');
      if (buf.length >= 3) {
        go(Number(buf));
        return;
      }
      bufT = later(() => {
        buf = '';
        head.textContent = 'P' + page;
        head.classList.remove('is-typing');
      }, 4000);
    }
    fast.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.page))));
    MODS['ch-5'] = {
      enter() {
        go(page, true);
        tickClock();
      },
      leave() {
        window.clearTimeout(bufT);
        buf = '';
        head.classList.remove('is-typing');
      }
    };
    return { digit, typing: () => buf.length > 0 };
  })();

  /* ================================================================== */
  /* CH 06 · TELEVENDAS                                                  */
  /* ================================================================== */
  (() => {
    const products = $$('#shop-list .product');
    const stage = $('#shop-stage');
    const countEl = $('#shop-count');
    const note = $('#shop-count-note');
    const NOTE = note.textContent;
    let si = 0;
    function showProduct(i, anim) {
      si = (i + products.length) % products.length;
      const p = products[si];
      const mock = p.querySelector('.mock').cloneNode(true);
      mock.removeAttribute('role');
      mock.removeAttribute('aria-label');
      mock.setAttribute('aria-hidden', 'true');
      $$('img', mock).forEach((im) => im.removeAttribute('loading'));
      stage.replaceChildren(mock);
      $('#shop-n').textContent = 'OFERTA ' + (si + 1) + ' DE ' + products.length;
      $('#shop-name').textContent = p.dataset.name;
      $('#shop-desc').textContent = p.dataset.desc;
      if (anim && !reduce) {
        stage.classList.remove('is-swap');
        void stage.offsetWidth;
        stage.classList.add('is-swap');
      }
      caption(6, '[LOCUTOR] ' + (anim ? 'Mas não é só isso! ' : '') + p.dataset.name + ': ' + p.dataset.desc + ' EM BREVE, sem preço.');
    }
    $('#shop-more').addEventListener('click', () => {
      showProduct(si + 1, true);
      audio.blip(0.12);
    });
    function tickCount() {
      const d = new Date();
      const elapsed = d.getMinutes() * 60 + d.getSeconds();
      if (elapsed < 10) {
        countEl.textContent = '00:00:00';
        note.textContent = 'ACABOU! …e não aconteceu nada, porque nada estava à venda. Nova contagem já já. Tudo continua EM BREVE.';
        return;
      }
      const left = 3600 - elapsed;
      countEl.textContent = '00:' + pad2(Math.floor(left / 60)) + ':' + pad2(left % 60);
      if (note.textContent !== NOTE) note.textContent = NOTE;
    }
    every(1, tickCount, 6);
    showProduct(0, false);
    MODS['ch-6'] = { enter() { tickCount(); } };
  })();

  /* ================================================================== */
  /* CH 07 · DISK OLHO 0900                                              */
  /* ================================================================== */
  const olhoMod = (() => {
    const svg = $('#olho');
    const iris = $('#olho-iris');
    const pupil = $('#olho-pupil');
    const form = $('#olho-form');
    const nameIn = $('#olho-name');
    const cityIn = $('#olho-city');
    const qIn = $('#olho-q');
    const muralCk = $('#olho-mural');
    const submit = $('#olho-submit');
    const statusEl = $('#olho-status');
    const gc = $('#olho-gc');
    const cc = $('#olho-cc');
    const ccText = $('#olho-answer');
    const srEl = $('#olho-sr');
    const linksEl = $('#olho-links');
    const callsEl = $('#olho-calls');
    const fone = $('#olho-fone');
    const cartas = $$('.carta');
    const sec = $('#ch-7');
    const stageEl = $('#olho-stage');

    // Desktop: style.css sizes the set to the tube minus this header, so the whole stage is on screen.
    const head = $('.olho__head', sec);
    if (head && 'ResizeObserver' in window) {
      new ResizeObserver((entries) => {
        const box = entries[entries.length - 1].borderBoxSize;
        const h = box && box[0] ? box[0].blockSize : head.offsetHeight;
        if (h > 0) sec.style.setProperty('--olho-head', Math.ceil(h) + 'px');
      }).observe(head);
    }
    // A ligação acontece no palco: se ele estiver fora da tela (celular, ou canal rolado), traz ele de volta.
    function bringStage() {
      const sr = sec.getBoundingClientRect();
      const r = stageEl.getBoundingClientRect();
      const padTop = parseFloat(getComputedStyle(sec).paddingTop) || 0;
      if (r.top >= sr.top + padTop - 1 && r.bottom <= sr.bottom + 1) return;
      sec.scrollTo({ top: Math.max(0, sec.scrollTop + r.top - sr.top - padTop), behavior: reduce ? 'auto' : 'smooth' });
    }

    /* --- olho: segue o ponteiro, pisca, pupila reage --- */
    let rect = null;
    let goalX = 0;
    let goalY = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    let lastTr = '';
    let pupilS = 1;
    let mode = null;
    let typingUntil = 0;
    let typeX = 0;
    let typeY = 0;
    let typeT = 0;
    const active = () => powered && activeSection === sec;

    function frame() {
      raf = 0;
      const now = performance.now();
      let gx = goalX;
      let gy = goalY;
      let ps = 1;
      if (mode === 'cards') {
        gx = 0;
        gy = 16;
        ps = 1.2;
      } else if (now < typingUntil) {
        gx = typeX;
        gy = typeY;
        ps = 1.5;
      }
      const k = reduce ? 1 : 0.2;
      cx += (gx - cx) * k;
      cy += (gy - cy) * k;
      const settled = Math.abs(gx - cx) < 0.08 && Math.abs(gy - cy) < 0.08;
      if (settled) {
        cx = gx;
        cy = gy;
      }
      const tr = 'translate(' + cx.toFixed(2) + 'px, ' + cy.toFixed(2) + 'px)';
      if (tr !== lastTr) {
        iris.style.transform = tr;
        lastTr = tr;
      }
      if (ps !== pupilS) {
        pupilS = ps;
        pupil.style.transform = 'scale(' + ps + ')';
      }
      if (!settled) raf = window.requestAnimationFrame(frame);
    }
    const kick = () => { if (!raf) raf = window.requestAnimationFrame(frame); };
    function center() {
      if (!rect) rect = svg.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    function aim(x, y) {
      const c = center();
      const dx = x - c.x;
      const dy = y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const m = Math.min(1, d / 260);
      return { x: (dx / d) * 24 * m, y: (dy / d) * 16 * m };
    }
    window.addEventListener('pointermove', (e) => {
      if (!active() || e.pointerType === 'touch') return;
      const a = aim(e.clientX, e.clientY);
      if (Math.abs(a.x - goalX) < 0.05 && Math.abs(a.y - goalY) < 0.05) return;
      goalX = a.x;
      goalY = a.y;
      kick();
    }, { passive: true });
    sec.addEventListener('scroll', () => { rect = null; }, { passive: true });
    window.addEventListener('resize', () => { rect = null; });
    qIn.addEventListener('input', () => {
      const r = qIn.getBoundingClientRect();
      const a = aim(r.left + r.width / 2, r.top + r.height / 2);
      typeX = a.x;
      typeY = a.y;
      typingUntil = performance.now() + 700;
      kick();
      window.clearTimeout(typeT);
      typeT = later(kick, 720);
      $('#olho-count').textContent = Array.from(qIn.value).length + '/500';
    });

    let blinkT = 0;
    function scheduleBlink() {
      window.clearTimeout(blinkT);
      if (reduce) return;
      blinkT = later(() => {
        if (active() && !idle && !document.hidden) {
          svg.classList.add('is-blink');
          later(() => svg.classList.remove('is-blink'), 140);
        }
        if (active()) scheduleBlink();
      }, 2200 + Math.random() * 4200);
    }

    /* --- chamadas anteriores --- */
    function readCalls() {
      try {
        const raw = store.get('chamadas', '[]');
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.filter((c) => c && typeof c.q === 'string' && typeof c.a === 'string' && typeof c.at === 'string').slice(0, 10);
      } catch (e) {
        return [];
      }
    }
    function saveCall(c) {
      const arr = [c].concat(readCalls()).slice(0, 10);
      store.set('chamadas', JSON.stringify(arr));
    }
    let shared = [];
    function fmtWhen(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }
    function renderCalls() {
      const mine = readCalls();
      const mids = new Set(mine.map((c) => c.mid).filter(Boolean));
      const rows = mine.map((c) => ({ mine: true, who: (typeof c.name === 'string' && c.name ? c.name : 'Anônimo') + (typeof c.city === 'string' && c.city ? ' · ' + c.city : ''), q: c.q, a: c.a, at: c.at }))
        .concat(shared.filter((m) => !mids.has(m.id)).map((m) => ({ mine: false, who: m.name, q: m.text, a: null, at: m.at })))
        .sort((x, y) => (x.at < y.at ? 1 : -1))
        .slice(0, 10);
      callsEl.replaceChildren();
      if (!rows.length) {
        callsEl.append(el('li', 'call call--empty', H ? 'nenhuma ligação ainda. a linha tá aberta: liga você.' : 'a linha do 0900 caiu: o oráculo não carregou.'));
        return;
      }
      rows.forEach((r) => {
        const li = el('li', 'call' + (r.mine ? ' call--mine' : ''));
        const who = el('p', 'call__who', r.who);
        who.append(el('span', null, ' · ' + (r.mine ? 'tua ligação' : 'recado no ar') + ' · ' + fmtWhen(r.at)));
        li.append(who, el('p', 'call__q', r.q));
        if (r.a) li.append(el('p', 'call__a', 'O Olho: ' + r.a));
        callsEl.append(li);
      });
    }

    /* --- a ligação --- */
    function setStatus(t, err) {
      statusEl.textContent = t;
      statusEl.classList.toggle('is-err', !!err);
    }
    let revealT = 0;
    function showAnswer(ans) {
      window.clearTimeout(revealT);
      cc.hidden = false;
      ccText.replaceChildren();
      srEl.textContent = 'O Olho responde: ' + ans.text;
      if (reduce) {
        ccText.textContent = ans.text;
      } else {
        const spans = ans.text.split(/\s+/).filter(Boolean).map((w) => el('span', 'w', w + ' '));
        ccText.append(...spans);
        let i = 0;
        const stepW = () => {
          if (i >= spans.length) return;
          spans[i].classList.add('on');
          i += 1;
          revealT = later(stepW, 85);
        };
        stepW();
      }
      linksEl.replaceChildren();
      (ans.links || []).forEach((l) => {
        if (!l || typeof l.href !== 'string' || !/^https:\/\//.test(l.href)) return;
        const li = el('li');
        const a = el('a', null, String(l.label) + ' ↗');
        a.href = l.href;
        a.target = '_blank';
        a.rel = 'noopener';
        li.append(a);
        linksEl.append(li);
      });
      rect = null; // the Eye shrinks to make room for the captions and links
      caption(7, '[O OLHO RESPONDE] ' + ans.text);
    }

    let busy = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      if (!H) {
        setStatus('A linha do 0900 caiu: o oráculo não carregou. Recarrega a página e tenta de novo.', true);
        return;
      }
      const name = nameIn.value.trim();
      const city = cityIn.value.trim();
      const q = qIn.value.trim();
      if (!q) {
        setStatus('Faz uma pergunta antes de ligar: o olho não lê mente, lê texto.', true);
        qIn.focus();
        return;
      }
      busy = true;
      submit.setAttribute('aria-disabled', 'true');
      const whoLine = (name || 'Anônimo') + (city ? ', de ' + city : '') + ', pergunta:';
      setStatus('chamando o 0900-OLHO-000… ☎');
      bringStage();
      fone.classList.add('is-ringing');
      audio.ring();
      caption(7, '[TELEFONE TOCANDO] trim-trim…');
      await wait(reduce ? 0 : 1300);
      fone.classList.remove('is-ringing');

      cc.hidden = true;
      linksEl.replaceChildren();
      gc.hidden = false;
      $('#olho-gc-who').textContent = whoLine;
      $('#olho-gc-q').textContent = q;
      rect = null; // the GC pushes the Eye down
      if (!reduce) {
        gc.classList.remove('is-in');
        void gc.offsetWidth;
        gc.classList.add('is-in');
      }
      caption(7, '[GC] ' + whoLine + ' ' + q);
      setStatus('No ar! O Olho está consultando as cartas…');
      announce(whoLine + ' ' + q + '. O Olho está consultando as cartas.');

      mode = 'cards';
      kick();
      cartas.forEach((c) => c.classList.remove('is-up'));
      for (let i = 0; i < cartas.length; i++) {
        await wait(reduce ? 0 : 480);
        cartas[i].classList.add('is-up');
      }
      await wait(reduce ? 0 : 520);
      mode = null;
      kick();

      const ans = H.oraculo.ask(q);
      showAnswer(ans);
      const call = { name, city, q, a: ans.text, at: new Date().toISOString() };

      if (muralCk.checked) {
        try {
          const msg = await H.mural.post({ name: [name, city].filter(Boolean).join(' · '), text: q, channel: 'oraculo' });
          call.mid = msg.id;
          setStatus('Respondido no ar. Teu recado foi pro mural de recados da HORNEY.');
        } catch (err) {
          setStatus('Respondido no ar, mas o recado não foi pro mural: ' + (err && err.message ? err.message : 'erro desconhecido.'), true);
        }
      } else {
        setStatus('Respondido no ar. Teu recado ficou só neste aparelho.');
      }
      saveCall(call);
      renderCalls();
      qIn.value = '';
      $('#olho-count').textContent = '0/500';
      busy = false;
      submit.removeAttribute('aria-disabled');
    });

    $('#olho-sorte').textContent = H ? H.oraculo.sorte() : 'o olho não carregou hoje. recarrega a página.';
    if (!H) {
      setStatus('A linha do 0900 caiu: o oráculo não carregou. O resto da TV funciona.', true);
    }
    renderCalls();

    MODS['ch-7'] = {
      enter() {
        rect = null;
        scheduleBlink();
      },
      leave() {
        window.clearTimeout(blinkT);
        svg.classList.remove('is-blink');
      }
    };
    return {
      setShared(list) {
        shared = list;
        renderCalls();
      }
    };
  })();

  /* ================================================================== */
  /* CH 08 · CANAL COMUNITÁRIO (mural compartilhado)                     */
  /* ================================================================== */
  const muralMod = (() => {
    const listEl = $('#mural-list');
    const track = $('#crawl-track');
    const pageEl = $('#mural-page');
    const prev = $('#mural-prev');
    const next = $('#mural-next');
    const form = $('#mural-form');
    const nameIn = $('#mural-name');
    const textIn = $('#mural-text');
    const statusEl = $('#mural-status');
    const PAGE = 5;
    let msgs = [];
    let page = 0;
    let newId = null;

    function fmt(iso) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return '';
      return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    }
    function renderList() {
      const pages = Math.max(1, Math.ceil(msgs.length / PAGE));
      page = clamp(page, 0, pages - 1);
      listEl.replaceChildren();
      if (!H) {
        listEl.append(el('li', 'recado recado--empty', 'o mural tá fora do ar: o módulo de recados não carregou. Recarrega a página.'));
      } else if (!msgs.length) {
        listEl.append(el('li', 'recado recado--empty', 'nenhum recado ainda. manda o primeiro!'));
      }
      msgs.slice(page * PAGE, page * PAGE + PAGE).forEach((m) => {
        const li = el('li', 'recado' + (m.id === newId ? ' is-new' : ''));
        const head = el('p', 'recado__head');
        head.append(el('span', 'recado__name', m.name), el('span', 'recado__date', fmt(m.at)));
        if (m.seed) head.append(el('span', 'recado__tag', 'RECADO DE EXEMPLO'));
        if (m.id === newId) head.append(el('span', 'recado__tag', 'TEU RECADO'));
        li.append(head, el('p', 'recado__text', m.text));
        listEl.append(li);
      });
      pageEl.textContent = 'PÁG ' + (page + 1) + '/' + pages;
      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;
    }
    function renderCrawl() {
      track.replaceChildren();
      const src = H ? msgs.slice(0, 12) : [];
      if (!src.length) {
        const span = el('span', 'crawl__item', H ? 'nenhum recado ainda — manda o primeiro!' : 'mural fora do ar');
        track.append(span, span.cloneNode(true));
        track.style.setProperty('--dur', '30s');
        return;
      }
      let chars = 0;
      const build = () => src.map((m) => {
        const it = el('span', 'crawl__item');
        it.append(el('b', null, m.name + ':'), document.createTextNode(' ' + m.text + '  ✦'));
        chars += m.name.length + m.text.length + 4;
        return it;
      });
      track.append(...build());
      const half = chars;
      track.append(...build());
      track.style.setProperty('--dur', Math.max(40, Math.round(half * 0.22)) + 's');
    }
    function apply(list) {
      msgs = list.filter((m) => m.channel === 'mural');
      renderList();
      renderCrawl();
    }
    prev.addEventListener('click', () => {
      page -= 1;
      renderList();
      if (prev.disabled) next.focus();
    });
    next.addEventListener('click', () => {
      page += 1;
      renderList();
      if (next.disabled) prev.focus();
    });
    textIn.addEventListener('input', () => {
      $('#mural-count').textContent = Array.from(textIn.value).length + '/500';
    });
    function setStatus(t, err) {
      statusEl.textContent = t;
      statusEl.classList.toggle('is-err', !!err);
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!H) {
        setStatus('o mural tá fora do ar: o módulo de recados não carregou. Recarrega a página.', true);
        return;
      }
      H.mural.post({ name: nameIn.value, text: textIn.value, channel: 'mural' })
        .then((m) => {
          newId = m.id;
          page = 0;
          textIn.value = '';
          $('#mural-count').textContent = '0/500';
          setStatus('NO AR! Teu recado entrou no letreiro e no topo da lista.');
          caption(8, '[LETREIRO] novo recado de ' + m.name + ': ' + m.text);
          return H.mural.list();
        })
        .then((all) => apply(all))
        .catch((err) => setStatus(err && err.message ? err.message : 'Não deu pra mandar agora. Tenta de novo.', true));
    });
    if (!H) {
      renderList();
      renderCrawl();
      setStatus('o mural tá fora do ar: o módulo de recados não carregou.', true);
    }
    return { apply };
  })();

  function loadShared() {
    if (!H) return;
    H.mural.list()
      .then((all) => {
        muralMod.apply(all);
        olhoMod.setShared(all.filter((m) => m.channel === 'oraculo'));
      })
      .catch(() => { /* lista vazia: os renders já mostram estado vazio */ });
  }
  if (H) {
    H.mural.subscribe((all) => {
      muralMod.apply(all);
      olhoMod.setShared(all.filter((m) => m.channel === 'oraculo'));
    });
    loadShared();
  }

  /* ================================================================== */
  /* CH 00 · VÍDEO (AV)                                                  */
  /* ================================================================== */
  (() => {
    const TAPES = [
      { yt: '9uP1P11at9M', title: 'HORNEY — Fool\'s Game (videoclipe oficial)', side: 'FITA A', label: 'Fool\'s Game', img: '../assets/yt-fools-game.jpg' },
      { yt: 'V9Rpgtc2vTs', title: 'HORNEY ao vivo (clipe de 38s)', side: 'FITA B', label: 'HORNEY ao vivo', img: '../assets/yt-live.jpg' }
    ];
    const screen = $('#av-screen');
    const mode = $('#av-mode');
    const slotEl = $('#vcr-slot');
    const ejectBtn = $('#av-eject');
    const tapes = $$('.tape[data-tape]');
    let loaded = -1;
    let token = 0;

    function emptyScreen() {
      screen.replaceChildren();
      const p = el('p', 'av__empty', 'SEM FITA');
      p.append(el('br'), el('small', null, 'escolha uma fita na estante ↓'));
      screen.append(p);
    }
    function facade(i) {
      const t = TAPES[i];
      screen.replaceChildren();
      const b = el('button', 'facade');
      b.type = 'button';
      b.dataset.play = String(i);
      const im = el('img');
      im.src = t.img;
      im.alt = '';
      im.width = 1280;
      im.height = 720;
      im.decoding = 'async';
      const p = el('span', 'facade__play', '▶ PLAY');
      p.setAttribute('aria-hidden', 'true');
      b.append(im, p, el('span', 'sr-only', 'Play: ' + t.title + ' (carrega o player do YouTube)'));
      screen.append(b);
      mode.textContent = '■ STOP · ' + t.side + ': ' + t.label;
    }
    function play(i) {
      const t = TAPES[i];
      const f = el('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + t.yt + '?autoplay=1&rel=0&playsinline=1';
      f.title = t.title;
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      screen.replaceChildren(f);
      mode.textContent = '▶ PLAY · ' + t.side + ': ' + t.label;
      showOsdText('PLAY ▶', t.side + ' · ' + t.label);
      caption(0, '[VIDEOCASSETE] PLAY: ' + t.title + '.');
      f.focus();
    }
    async function insert(i) {
      const my = ++token;
      loaded = i;
      tapes.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
      ejectBtn.disabled = false;
      mode.textContent = '⏏ CARREGANDO ' + TAPES[i].side + '…';
      audio.blip(0.2);
      slotEl.classList.remove('is-loaded', 'is-loading');
      if (!reduce) {
        void slotEl.offsetWidth;
        slotEl.classList.add('is-loading');
        await wait(700);
        if (my !== token) return;
      }
      slotEl.classList.remove('is-loading');
      slotEl.classList.add('is-loaded');
      screen.replaceChildren();
      const trk = el('p', 'av__track', '▶▶ TRACKING ▮▮▮▮▯');
      screen.append(trk);
      mode.textContent = '▶▶ TRACKING…';
      if (powered && activeSection === byNum.get(0)) showOsdText('TRACKING', '▮▮▮▮▯');
      if (!reduce) {
        screen.classList.add('is-tracking');
        staticFx.burst(300);
        await wait(650);
        screen.classList.remove('is-tracking');
        if (my !== token) return;
      }
      facade(i);
      caption(0, '[VIDEOCASSETE] fita carregada: ' + TAPES[i].title + '. Aperte PLAY.');
    }
    function eject() {
      token += 1;
      const was = loaded;
      loaded = -1;
      screen.classList.remove('is-tracking');
      slotEl.classList.remove('is-loaded', 'is-loading');
      tapes.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      emptyScreen();
      mode.textContent = '⏏ EJETADA · INSIRA UMA FITA';
      if (was >= 0 && tapes[was]) tapes[was].focus();
      ejectBtn.disabled = true;
      audio.blip(0.15);
    }
    tapes.forEach((b, i) => b.addEventListener('click', () => {
      if (loaded === i && !screen.querySelector('iframe')) {
        const f = screen.querySelector('.facade');
        if (f) f.focus();
        return;
      }
      insert(i);
    }));
    screen.addEventListener('click', (e) => {
      const b = e.target.closest('[data-play]');
      if (b) play(Number(b.dataset.play));
    });
    ejectBtn.addEventListener('click', eject);
    MODS['ch-0'] = {
      leave() {
        if (screen.querySelector('iframe') && loaded >= 0) facade(loaded);
      }
    };
  })();

  /* ================================================================== */
  /* SEM SINAL                                                           */
  /* ================================================================== */
  chx.hidden = false;
  MODS['ch-x'] = { enter() { staticFx.paintTo($('#snow')); } };

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  mqReduce.addEventListener('change', (e) => { reduce = e.matches; });
  document.addEventListener('visibilitychange', () => {
    updateStill();
    audio.onVisibility();
    if (document.hidden) stopHB();
    else {
      tickClock();
      updateSchedule();
      startHB();
    }
  });

  every(1, tickClock, null);
  every(60, updateSchedule, null);

  updateNextShow();
  updateSchedule();
  tickClock();
  syncMuteUI();
  setCC(ccOn, true);
  setPowerUI();

  const fromHash = hashCh();
  const stored = Number(store.get('ch', '1'));
  const start = fromHash != null ? fromHash : (byNum.has(stored) ? stored : 1);
  sections.forEach((s) => s.classList.remove('is-active'));
  target = start;
  current = start;
  tela.inert = true;
  updateStill();
  startHB();
  if (reduce) powerOn(start);
  else later(() => powerOn(start), 280);
})();
