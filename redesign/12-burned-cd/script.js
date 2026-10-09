/* HORNEY — 12 · BURNED CD-R / WINAMP — behaviour (vanilla, no build) */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqMobile = matchMedia('(max-width: 1000px)');
  const reduced = () => mqReduce.matches;
  const mobile = () => mqMobile.matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = (n) => String(n).padStart(2, '0');

  /* Grain: pre-render one small noise tile (instead of live SVG feTurbulence over the viewport). */
  (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    const img = g.createImageData(160, 160);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grain', 'url(' + c.toDataURL('image/png') + ')');
  })();
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  };

  const desktop = $('#desktop');
  const tasksEl = $('#tasks');

  /* Clone a node and give every id inside it a suffix (keeps ids unique, fixes local refs). */
  function cloneUnique(node, suffix) {
    const c = node.cloneNode(true);
    const ids = $$('[id]', c).map((el) => el.id);
    $$('[id]', c).forEach((el) => { el.id += suffix; });
    if (ids.length) {
      $$('*', c).forEach((el) => {
        ['href', 'clip-path'].forEach((attr) => {
          const v = el.getAttribute(attr);
          if (!v) return;
          ids.forEach((id) => {
            if (v === '#' + id) el.setAttribute(attr, '#' + id + suffix);
            else if (v === 'url(#' + id + ')') el.setAttribute(attr, 'url(#' + id + suffix + ')');
          });
        });
      });
    }
    return c;
  }

  /* ================= Balloon notifications ================= */
  const balloon = $('#balloon');
  let balloonTimer = 0;
  function notify(title, text, ms = 6500) {
    $('#balloon-title').textContent = title;
    $('#balloon-text').textContent = text;
    balloon.hidden = false;
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(() => { balloon.hidden = true; }, ms);
  }
  $('#balloon-x').addEventListener('click', () => { balloon.hidden = true; clearTimeout(balloonTimer); });

  /* ================= Window manager ================= */
  const wins = new Map();
  let zTop = 20;
  let cascade = 0;

  $$('.win').forEach((el) => {
    const st = { el, task: null, opener: null };
    wins.set(el.id, st);
    el.addEventListener('pointerdown', () => { if (!el.classList.contains('is-active')) activate(el); }, true);
    el.addEventListener('focusin', () => { if (!el.classList.contains('is-active')) activate(el); });
    el.addEventListener('animationend', (e) => {
      if (e.target !== el) return;
      el.classList.remove('is-opening', 'is-nudge', 'is-flash');
    });
    const bar = $('.win__bar', el);
    bar.addEventListener('pointerdown', (e) => startWinDrag(e, el, bar));
    bar.addEventListener('dblclick', (e) => {
      if (e.target.closest('button') || mobile() || !$('[data-act="max"]', el)) return;
      toggleMax(el);
    });
  });

  function makeTask(st) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'task';
    const ico = document.createElement('span');
    ico.className = 'win__ico win__ico--' + (st.el.dataset.icon || 'txt');
    ico.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span');
    t.className = 'task__t';
    t.textContent = st.el.dataset.title;
    b.append(ico, t);
    b.setAttribute('aria-label', st.el.dataset.title);
    b.addEventListener('click', () => {
      const el = st.el;
      if (el.hidden) openWin(el.id);
      else if (el.classList.contains('is-active') && !mobile()) minimizeWin(el);
      else { activate(el); el.focus({ preventScroll: true }); if (mobile() && el.classList.contains('win--dock')) scrollToEl(el); }
    });
    tasksEl.append(b);
    return b;
  }

  function syncTasks() {
    wins.forEach((st) => {
      if (st.task) st.task.setAttribute('aria-pressed', String(!st.el.hidden && st.el.classList.contains('is-active')));
    });
    const sheetOpen = mobile() && [...wins.values()].some((st) => !st.el.hidden && !st.el.classList.contains('win--dock'));
    document.documentElement.classList.toggle('is-locked', sheetOpen);
  }

  function activate(el) {
    $$('.win.is-active').forEach((w) => { if (w !== el) w.classList.remove('is-active'); });
    el.classList.add('is-active');
    el.style.zIndex = String(++zTop);
    syncTasks();
  }

  function setPos(el, x, y) {
    const dw = desktop.clientWidth;
    const dh = desktop.clientHeight;
    const w = el.offsetWidth;
    el.style.right = 'auto';
    el.style.left = Math.round(clamp(x, Math.min(0, 100 - w), dw - 100)) + 'px';
    el.style.top = Math.round(clamp(y, 0, Math.max(0, dh - 44))) + 'px';
  }

  function place(el) {
    if (mobile() || el.classList.contains('win--dock')) return;
    const dw = desktop.clientWidth;
    const dh = desktop.clientHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (el.dataset.placed) {
      setPos(el, el.offsetLeft, el.offsetTop);
      return;
    }
    const off = (cascade++ % 5) * 30;
    const x = clamp((dw - w) / 2 - 60 + off, 8, Math.max(8, dw - w - 8));
    const y = clamp((dh - h) / 2 - 40 + off, 8, Math.max(8, dh - h - 8));
    setPos(el, x, y);
    el.dataset.placed = '1';
  }

  function animIn(el) {
    if (reduced()) return;
    el.classList.remove('is-opening');
    void el.offsetWidth;
    el.classList.add('is-opening');
  }

  function scrollToEl(el) {
    el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  function openWin(id, opener, opts = {}) {
    const st = wins.get(id);
    if (!st) return;
    const el = st.el;
    const wasHidden = el.hidden;
    if (opener instanceof HTMLElement && !el.contains(opener)) st.opener = opener;
    el.hidden = false;
    if (!st.task) st.task = makeTask(st);
    if (wasHidden) {
      place(el);
      animIn(el);
      el.dispatchEvent(new CustomEvent('win:open'));
    }
    activate(el);
    if (opts.focus !== false) {
      el.focus({ preventScroll: true });
      if (mobile() && el.classList.contains('win--dock')) scrollToEl(el);
    }
  }

  function minimizeWin(el) {
    el.hidden = true;
    el.classList.remove('is-active');
    const st = wins.get(el.id);
    syncTasks();
    if (st.task) st.task.focus();
  }

  function closeWin(el) {
    const st = wins.get(el.id);
    el.hidden = true;
    el.classList.remove('is-active', 'is-max');
    if (st.task) { st.task.remove(); st.task = null; }
    el.dispatchEvent(new CustomEvent('win:close'));
    syncTasks();
    const back = st.opener && st.opener.isConnected && st.opener.getClientRects().length ? st.opener : $('#start-btn');
    back.focus({ preventScroll: true });
  }

  function toggleMax(el) {
    el.classList.toggle('is-max');
    const b = $('[data-act="max"]', el);
    if (b) b.setAttribute('aria-label', el.classList.contains('is-max') ? 'Restaurar' : 'Maximizar');
  }

  function startWinDrag(e, el, bar) {
    if (e.button !== 0 || e.target.closest('button') || mobile() || el.classList.contains('is-max')) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const ox = el.offsetLeft;
    const oy = el.offsetTop;
    el.style.right = 'auto';
    el.style.left = ox + 'px';
    el.style.top = oy + 'px';
    bar.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
    let px = 0, py = 0, mv = 0;
    const move = (ev) => {
      px = ev.clientX; py = ev.clientY;
      if (!mv) mv = requestAnimationFrame(() => { mv = 0; setPos(el, ox + px - sx, oy + py - sy); });
    };
    const up = () => {
      if (mv) { cancelAnimationFrame(mv); mv = 0; setPos(el, ox + px - sx, oy + py - sy); }
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      el.classList.remove('is-dragging');
      el.dataset.placed = '1';
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }

  desktop.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const el = b.closest('.win');
    if (!el) return;
    const act = b.dataset.act;
    if (act === 'close') closeWin(el);
    else if (act === 'min') minimizeWin(el);
    else if (act === 'max') toggleMax(el);
  });

  window.addEventListener('resize', () => {
    if (mobile()) return;
    wins.forEach((st) => {
      if (!st.el.hidden && st.el.dataset.placed) setPos(st.el, st.el.offsetLeft, st.el.offsetTop);
    });
  });
  mqMobile.addEventListener('change', () => {
    wins.forEach((st) => { if (!st.el.hidden) place(st.el); });
    syncTasks();
  });

  /* ================= Start menu & calendar popovers ================= */
  const startBtn = $('#start-btn');
  const startMenu = $('#start-menu');
  const clockBtn = $('#clock');
  const cal = $('#cal');

  function setStart(open) {
    startMenu.hidden = !open;
    startBtn.setAttribute('aria-expanded', String(open));
    if (open) { setCal(false); const f = $('button, a', startMenu); if (f) f.focus(); }
  }
  function setCal(open) {
    cal.hidden = !open;
    clockBtn.setAttribute('aria-expanded', String(open));
    if (open) {
      setStart(false);
      const now = new Date();
      calView = new Date(now.getFullYear(), now.getMonth(), 1);
      renderCal();
    }
  }
  startBtn.addEventListener('click', () => setStart(startMenu.hidden));
  clockBtn.addEventListener('click', () => setCal(cal.hidden));
  document.addEventListener('pointerdown', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && !startBtn.contains(e.target)) setStart(false);
    if (!cal.hidden && !cal.contains(e.target) && !clockBtn.contains(e.target)) setCal(false);
  });

  /* ================= Global delegation: data-open / data-play ================= */
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      openWin(opener.dataset.open, opener);
      if (startMenu.contains(opener)) setStart(false);
      return;
    }
    const player = e.target.closest('[data-play]');
    if (player) {
      if (startMenu.contains(player)) setStart(false);
      openWin('win-player', player, { focus: false });
      loadAndPlay(Number(player.dataset.play));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!startMenu.hidden) { setStart(false); startBtn.focus(); return; }
    if (!cal.hidden) { setCal(false); clockBtn.focus(); return; }
    if (!shutdown.hidden) { reboot(); return; }
    const w = document.activeElement && document.activeElement.closest && document.activeElement.closest('.win');
    if (w && !w.classList.contains('win--dock')) closeWin(w);
  });

  /* ================= Player: tracks & Spotify ================= */
  const TRACKS = [
    { title: 'OFF!', id: '7KteAUfbNB4CtxnbMudBad', dur: 199338, bpm: 168 },
    { title: 'QUEBRA-CABEÇA (feat. Dani Buarque)', id: '3SYpLwh1ChHyNEOn5TNOWy', dur: 260385, bpm: 128 },
    { title: 'MERGULHAR', id: '0aJtgSakI5r87CfAqNdDXP', dur: 224974, bpm: 112 },
    { title: 'ROMÂNTICA', id: '2p5r9m60eSDxMGey8GRubR', dur: 148481, bpm: 140 }
  ];

  const ampWin = $('#win-player');
  const amp = $('#amp');
  const stage = $('#stage');
  const jewel = $('#jewel');
  const disc = $('#disc');
  const miniDisc = $('#mini-disc');
  const trayEject = $('#tray-eject');
  const lcdState = $('#lcd-state');
  const lcdTime = $('#lcd-time');
  const marquee = $('#marquee');
  const seek = $('#seek');
  const ledStereo = $('#led-stereo');
  const ledSp = $('#led-sp');
  const sysNote = $('#sys-note');
  const msnNp = $('#msn-np');
  const trackBtns = $$('.pl__track');
  const ejectBtn = $('#b-eject');

  miniDisc.append(cloneUnique($('.disc__body', disc), '-m'), cloneUnique($('.disc__label', disc), '-m'));

  let discState = 'case'; // case | moving | player
  let flight = null;
  let cur = 0;
  let mode = 'idle'; // idle | loading | api | fallback
  let controller = null;
  let pendingPlay = false;
  let isPaused = true;
  let fbPlaying = false;
  let pos = 0;
  let dur = TRACKS[0].dur;
  let lastPos = 0;
  let lastDur = 0;
  let seeking = false;
  let shuffle = false;
  let loadTimer = 0;
  let nudgeTimer = 0;
  let hinted = false;

  const isPlaying = () => discState === 'player' && (mode === 'api' ? !isPaused : mode === 'fallback' && fbPlaying);

  function setMarquee(text) {
    const t = text + '   ***   ';
    marquee.children[0].textContent = t;
    marquee.children[1].textContent = t;
  }
  function trackLine(i) { return (i + 1) + '. HORNEY - ' + TRACKS[i].title + ' (' + fmt(TRACKS[i].dur) + ')'; }

  function setLCD(glyph, p, d) {
    pos = p; dur = d || dur;
    lcdState.textContent = glyph;
    lcdTime.textContent = discState === 'player' ? fmt(p) : '--:--';
    if (!seeking) {
      const pct = d ? clamp(p / d, 0, 1) : 0;
      seek.value = String(Math.round(pct * 1000));
      seek.style.setProperty('--p', (pct * 100).toFixed(2) + '%');
    }
  }

  function markTrack() {
    trackBtns.forEach((b, i) => {
      b.classList.toggle('is-current', i === cur);
      if (i === cur) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }

  function refresh() {
    const p = isPlaying();
    amp.classList.toggle('is-playing', p);
    sysNote.classList.toggle('is-on', p);
    sysNote.setAttribute('aria-label', p ? 'Tocando: ' + TRACKS[cur].title + '. Abrir HORNEY AMP' : 'Abrir HORNEY AMP');
    ledStereo.classList.toggle('is-on', p);
    ledSp.classList.toggle('is-on', mode === 'api' || mode === 'fallback');
    seek.disabled = !(mode === 'api' && discState === 'player');
    ejectBtn.setAttribute('aria-label', discState === 'player' ? 'Ejetar CD' : 'Carregar CD');
    msnNp.textContent = p ? 'HORNEY – ' + TRACKS[cur].title : 'ANTI-RASO — já saiu!!!';
    vizKick();
  }

  function uri(i) { return 'spotify:track:' + TRACKS[i].id; }

  function mountFallback() {
    clearTimeout(loadTimer);
    mode = 'fallback';
    controller = null;
    const iframe = document.createElement('iframe');
    iframe.id = 'sp-slot';
    iframe.title = 'Spotify — HORNEY, ' + TRACKS[cur].title;
    iframe.height = '80';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.src = 'https://open.spotify.com/embed/track/' + TRACKS[cur].id + '?utm_source=generator&theme=0';
    $('#sp-wrap').replaceChildren(iframe);
    fbPlaying = false;
    setLCD('▶', 0, TRACKS[cur].dur);
    setMarquee(trackLine(cur) + '   ***   APERTA ▶ NO SPOTIFY AQUI EMBAIXO');
    refresh();
  }

  function loadApi() {
    if (mode !== 'idle') return;
    mode = 'loading';
    const note = $('#sp-note');
    if (note) note.textContent = 'carregando plug-in do Spotify…';
    setLCD('…', 0, TRACKS[cur].dur);
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      if (mode !== 'loading') return;
      IFrameAPI.createController($('#sp-slot'), { uri: uri(cur), width: '100%', height: 80 }, (ctrl) => {
        clearTimeout(loadTimer);
        if (mode !== 'loading') return;
        controller = ctrl;
        mode = 'api';
        refresh();
        setTimeout(() => { if (pendingPlay && controller === ctrl) { pendingPlay = false; ctrl.play(); } }, 2500);
        ctrl.addListener('ready', () => {
          if (pendingPlay) { pendingPlay = false; ctrl.play(); }
        });
        ctrl.addListener('playback_update', (e) => {
          const d = e && e.data;
          if (!d) return;
          const wasPlaying = !isPaused;
          isPaused = !!d.isPaused;
          const du = d.duration || TRACKS[cur].dur;
          if (!isPaused) clearTimeout(nudgeTimer);
          setLCD(d.isBuffering ? '…' : isPaused ? '❚❚' : '▶', d.position || 0, du);
          refresh();
          if (wasPlaying && isPaused && lastDur && lastPos >= lastDur - 1500) {
            lastPos = 0;
            go(nextIndex(1), true);
            return;
          }
          lastPos = d.position || 0;
          lastDur = du;
        });
      });
    };
    const s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = mountFallback;
    document.head.appendChild(s);
    loadTimer = setTimeout(() => { if (mode === 'loading') mountFallback(); }, 9000);
  }

  function hintIfSilent() {
    clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(() => {
      if (mode === 'api' && isPaused && discState === 'player' && !hinted) {
        hinted = true;
        notify('Spotify', 'Se o som não começou, aperta o ▶ dentro do player do Spotify (logo abaixo do visualizador).');
      }
    }, 5000);
  }

  function nextIndex(step) {
    if (shuffle && TRACKS.length > 1) {
      let n = cur;
      while (n === cur) n = Math.floor(Math.random() * TRACKS.length);
      return n;
    }
    return (cur + step + TRACKS.length) % TRACKS.length;
  }

  function go(i, play) {
    cur = (i + TRACKS.length) % TRACKS.length;
    lastPos = 0;
    lastDur = 0;
    markTrack();
    if (discState !== 'player') {
      setMarquee('*** NO DISC ***   PRÓXIMA: ' + trackLine(cur));
      return;
    }
    setMarquee(trackLine(cur));
    if (mode === 'api' && controller) {
      pendingPlay = !!play;
      isPaused = true;
      controller.loadUri(uri(cur));
      if (play) {
        const ctrl = controller;
        setTimeout(() => { if (pendingPlay && controller === ctrl) { pendingPlay = false; ctrl.play(); } }, 1500);
      }
      setLCD(play ? '…' : '■', 0, TRACKS[cur].dur);
      if (play) hintIfSilent();
    } else if (mode === 'fallback') {
      const f = $('#sp-slot');
      f.src = 'https://open.spotify.com/embed/track/' + TRACKS[cur].id + '?utm_source=generator&theme=0';
      f.title = 'Spotify — HORNEY, ' + TRACKS[cur].title;
      fbPlaying = !!play;
      setLCD('▶', 0, TRACKS[cur].dur);
      setMarquee(trackLine(cur) + '   ***   APERTA ▶ NO SPOTIFY AQUI EMBAIXO');
    } else if (mode === 'idle') {
      if (play) { pendingPlay = true; loadApi(); hintIfSilent(); }
      else setLCD('■', 0, TRACKS[cur].dur);
    } else {
      pendingPlay = !!play || pendingPlay;
    }
    refresh();
  }

  function play() {
    if (discState !== 'player') { loadAndPlay(cur); return; }
    if (mode === 'idle') { pendingPlay = true; loadApi(); hintIfSilent(); return; }
    if (mode === 'api' && controller) {
      if (isPaused) { if (pos > 0) controller.resume(); else controller.play(); hintIfSilent(); }
      return;
    }
    if (mode === 'fallback') {
      fbPlaying = true;
      refresh();
      notify('Spotify', 'Aperta o ▶ dentro do player do Spotify logo abaixo ⚡');
    }
  }
  function pause() {
    if (discState !== 'player') { notify('HORNEY AMP', 'Nada tocando ainda. Arrasta o CD-R pro player ⚡'); return; }
    if (mode === 'api' && controller) {
      if (isPaused) { if (pos > 0) controller.resume(); } else controller.pause();
    } else if (mode === 'fallback') { fbPlaying = false; refresh(); }
  }
  function stop() {
    if (discState !== 'player') { notify('HORNEY AMP', 'Nada tocando ainda. Arrasta o CD-R pro player ⚡'); return; }
    clearTimeout(nudgeTimer);
    pendingPlay = false;
    if (mode === 'api' && controller) {
      controller.pause();
      controller.seek(0);
    }
    fbPlaying = false;
    isPaused = true;
    setLCD('■', 0, dur);
    refresh();
  }
  function pauseMusic() {
    if (mode === 'api' && controller && !isPaused) controller.pause();
    if (mode === 'fallback') { fbPlaying = false; refresh(); }
  }

  $('#b-play').addEventListener('click', play);
  $('#b-pause').addEventListener('click', pause);
  $('#b-stop').addEventListener('click', stop);
  $('#b-prev').addEventListener('click', () => go(cur - 1, isPlaying() || pendingPlay));
  $('#b-next').addEventListener('click', () => go(nextIndex(1), isPlaying() || pendingPlay));
  ejectBtn.addEventListener('click', () => {
    if (discState === 'player') ejectDisc();
    else if (discState === 'case') insertDisc().then(() => { go(cur, false); notify('HORNEY AMP', 'CD carregado. Aperta ▶ ou escolhe uma faixa na playlist.'); });
  });
  trayEject.addEventListener('click', () => ejectDisc());
  trackBtns.forEach((b) => b.addEventListener('click', () => loadAndPlay(Number(b.dataset.track))));

  const shufBtn = $('#b-shuffle');
  shufBtn.addEventListener('click', () => {
    shuffle = !shuffle;
    shufBtn.setAttribute('aria-pressed', String(shuffle));
  });
  const plBtn = $('#b-pl');
  const playlist = $('#playlist');
  plBtn.addEventListener('click', () => {
    playlist.hidden = !playlist.hidden;
    plBtn.setAttribute('aria-pressed', String(!playlist.hidden));
  });

  seek.addEventListener('input', () => {
    seeking = true;
    seek.style.setProperty('--p', (Number(seek.value) / 10).toFixed(1) + '%');
    lcdTime.textContent = fmt((Number(seek.value) / 1000) * dur);
  });
  seek.addEventListener('change', () => {
    seeking = false;
    if (mode === 'api' && controller) controller.seek(Math.floor(((Number(seek.value) / 1000) * dur) / 1000));
  });

  /* ================= The disc: drag, flight, eject ================= */
  function centerOf(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function insertDisc(dx = 0, dy = 0) {
    if (discState === 'player') return Promise.resolve();
    if (discState === 'moving' && flight) return flight;
    if (ampWin.hidden) openWin('win-player', null, { focus: false });
    else activate(ampWin);
    discState = 'moving';
    stage.classList.add('is-flying');
    const from = disc.getBoundingClientRect();
    const to = miniDisc.parentElement.getBoundingClientRect();
    const base = centerOf(from);
    base.x -= dx; base.y -= dy;
    const tgt = centerOf(to);
    const tx = tgt.x - base.x;
    const ty = tgt.y - base.y;
    const s = to.width / from.width;
    const anim = disc.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(0deg) scale(1)` },
      { transform: `translate(${(dx + tx) / 2}px, ${(dy + ty) / 2 - 70}px) rotate(220deg) scale(${((1 + s) / 2 + 0.1).toFixed(3)})`, offset: 0.5 },
      { transform: `translate(${tx}px, ${ty}px) rotate(440deg) scale(${s.toFixed(3)})` }
    ], { duration: reduced() ? 0 : 700, easing: 'cubic-bezier(.55,0,.3,1)', fill: 'forwards' });
    flight = anim.finished.then(() => {
      jewel.classList.add('is-empty');
      stage.classList.add('is-loaded');
      disc.style.transform = '';
      anim.cancel();
      stage.classList.remove('is-flying');
      amp.classList.add('has-disc');
      trayEject.tabIndex = 0;
      disc.tabIndex = -1;
      discState = 'player';
      flight = null;
      refresh();
      if (mobile()) scrollToEl(ampWin);
    });
    return flight;
  }

  function ejectDisc() {
    if (discState !== 'player') return;
    stop();
    discState = 'moving';
    const from = miniDisc.parentElement.getBoundingClientRect();
    amp.classList.remove('has-disc');
    jewel.classList.remove('is-empty');
    stage.classList.remove('is-loaded');
    stage.classList.add('is-flying');
    const base = disc.getBoundingClientRect();
    const b = centerOf(base);
    const f = centerOf(from);
    const s = from.width / base.width;
    const anim = disc.animate([
      { transform: `translate(${f.x - b.x}px, ${f.y - b.y}px) rotate(0deg) scale(${s.toFixed(3)})` },
      { transform: `translate(${(f.x - b.x) / 2}px, ${(f.y - b.y) / 2 - 70}px) rotate(-200deg) scale(${((1 + s) / 2 + 0.1).toFixed(3)})`, offset: 0.5 },
      { transform: 'translate(0px, 0px) rotate(-400deg) scale(1)' }
    ], { duration: reduced() ? 0 : 650, easing: 'cubic-bezier(.55,0,.3,1)' });
    anim.finished.then(() => {
      stage.classList.remove('is-flying');
      trayEject.tabIndex = -1;
      disc.tabIndex = 0;
      discState = 'case';
      setLCD('■', 0, TRACKS[cur].dur);
      setMarquee('*** NO DISC ***   ARRASTA O CD-R AQUI');
      refresh();
      if (document.activeElement === trayEject || document.activeElement === ejectBtn || document.activeElement === document.body) disc.focus({ preventScroll: true });
    });
  }

  function loadAndPlay(i) {
    insertDisc().then(() => go(i, true));
  }

  function overPlayer(x, y) {
    if (ampWin.hidden) return false;
    const r = ampWin.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  let suppressClick = false;
  disc.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || discState !== 'case') return;
    suppressClick = false;
    const sx = e.clientX;
    const sy = e.clientY;
    let dx = 0;
    let dy = 0;
    let dragging = false;
    disc.setPointerCapture(e.pointerId);
    const move = (ev) => {
      dx = ev.clientX - sx;
      dy = ev.clientY - sy;
      if (!dragging && Math.hypot(dx, dy) > 6) {
        dragging = true;
        stage.classList.add('is-flying');
        disc.classList.add('is-dragging');
        if (ampWin.hidden) openWin('win-player', null, { focus: false });
      }
      if (dragging) {
        disc.style.transform = `translate(${dx}px, ${dy}px)`;
        ampWin.classList.toggle('is-drop', overPlayer(ev.clientX, ev.clientY));
      }
    };
    const end = (ev, cancelled) => {
      disc.removeEventListener('pointermove', move);
      disc.removeEventListener('pointerup', onUp);
      disc.removeEventListener('pointercancel', onCancel);
      disc.classList.remove('is-dragging');
      ampWin.classList.remove('is-drop');
      if (!dragging) return;
      suppressClick = true;
      if (!cancelled && overPlayer(ev.clientX, ev.clientY)) {
        insertDisc(dx, dy).then(() => go(cur, true));
      } else {
        const back = disc.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0px, 0px)' }],
          { duration: reduced() ? 0 : 380, easing: 'cubic-bezier(.3,1.4,.5,1)' }
        );
        disc.style.transform = '';
        back.finished.then(() => stage.classList.remove('is-flying'));
        notify('Quase!', 'Solta o CD em cima da janela do HORNEY AMP pra tocar.', 4000);
      }
    };
    const onUp = (ev) => end(ev, false);
    const onCancel = (ev) => end(ev, true);
    disc.addEventListener('pointermove', move);
    disc.addEventListener('pointerup', onUp);
    disc.addEventListener('pointercancel', onCancel);
  });
  disc.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    if (discState === 'case') loadAndPlay(cur);
  });

  /* ================= Visualizer ================= */
  const canvas = $('#viz');
  const ctx = canvas.getContext('2d');
  const vizBtn = $('#viz-btn');
  const wallGlow = $('#wall-glow');
  const N = 24;
  const bars = new Float32Array(N);
  const peaks = new Float32Array(N);
  const hold = new Float32Array(N);
  const seeds = Array.from({ length: N }, () => [Math.random() * 6.28, 0.6 + Math.random() * 1.8, Math.random() * 6.28, 1.3 + Math.random() * 2.2]);
  const MODES = ['espectro', 'osciloscópio', 'desligado'];
  let vizMode = 0;
  let raf = 0;
  let last = 0;
  let dpr = 1;
  let grad = null;
  let bass = 0;

  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0, '#f2a900');
    grad.addColorStop(0.55, '#ff7a1a');
    grad.addColorStop(1, '#ff2bd6');
    draw();
  }
  if ('ResizeObserver' in window) new ResizeObserver(sizeCanvas).observe(canvas);
  else window.addEventListener('resize', sizeCanvas);

  function target(i, t, bpm) {
    const beat = (t * bpm) / 60;
    const ph = beat % 1;
    const whole = Math.floor(beat);
    const kick = Math.pow(1 - Math.min(1, ph * 3.2), 2) * (whole % 2 === 0 ? 1 : 0.75);
    const snare = whole % 2 === 1 ? Math.pow(1 - Math.min(1, ph * 2.6), 1.6) : 0;
    const hat = Math.pow(1 - ((beat * 2) % 1), 3);
    const f = i / (N - 1);
    const sd = seeds[i];
    const tex = 0.5 + 0.25 * Math.sin(t * sd[1] * 3 + sd[0]) + 0.25 * Math.sin(t * sd[3] * 5.3 + sd[2]);
    let v = (0.6 - f * 0.36) * (0.42 + 0.58 * tex);
    v += kick * Math.max(0, 1 - f * 4) * 0.55;
    v += snare * Math.exp(-Math.pow((f - 0.45) / 0.18, 2)) * 0.45;
    v += hat * Math.max(0, f - 0.62) * 0.9;
    return Math.min(1, v);
  }

  function step(now, playing) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    const t = now / 1000;
    const bpm = TRACKS[cur].bpm;
    for (let i = 0; i < N; i++) {
      const tg = playing ? target(i, t, bpm) : 0;
      bars[i] = tg > bars[i] ? bars[i] + (tg - bars[i]) * 0.6 : Math.max(tg, bars[i] - dt * 1.8);
      if (bars[i] >= peaks[i]) { peaks[i] = bars[i]; hold[i] = 0.35; }
      else if (hold[i] > 0) hold[i] -= dt;
      else peaks[i] = Math.max(0, peaks[i] - dt * 0.6);
    }
    bass = (bars[0] + bars[1] + bars[2]) / 3;
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!grad) return;
    if (vizMode === 2) {
      ctx.fillStyle = 'rgba(242,169,0,.25)';
      for (let x = 0; x < w; x += 6 * dpr) ctx.fillRect(x, h / 2, 2 * dpr, 1 * dpr);
      return;
    }
    if (vizMode === 1) {
      let level = 0;
      for (let i = 0; i < N; i++) level += bars[i];
      level /= N;
      const t = performance.now() / 1000;
      ctx.strokeStyle = '#f2a900';
      ctx.lineWidth = 1.5 * dpr;
      ctx.shadowColor = 'rgba(242,169,0,.7)';
      ctx.shadowBlur = 6 * dpr;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2 * dpr) {
        const u = x / w;
        const y = h / 2 + (Math.sin(u * 22 + t * 9) * 0.55 + Math.sin(u * 57 - t * 13) * 0.3 + Math.sin(u * 7 + t * 3) * 0.4) * level * h * 0.55;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }
    const gap = 2 * dpr;
    const bw = (w - gap * (N - 1)) / N;
    ctx.fillStyle = grad;
    for (let i = 0; i < N; i++) {
      const bh = Math.max(1 * dpr, bars[i] * h);
      ctx.fillRect(i * (bw + gap), h - bh, bw, bh);
    }
    ctx.fillStyle = '#05060a';
    for (let y = h - 3 * dpr; y > 0; y -= 4 * dpr) ctx.fillRect(0, y, w, 1 * dpr);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (let i = 0; i < N; i++) {
      if (peaks[i] <= 0.01) continue;
      ctx.fillRect(i * (bw + gap), h - peaks[i] * h - 2 * dpr, bw, 2 * dpr);
    }
  }

  function frame(now) {
    raf = 0;
    const playing = isPlaying();
    step(now, playing);
    draw();
    wallGlow.style.opacity = (0.22 + bass * 0.5).toFixed(3);
    let energy = 0;
    for (let i = 0; i < N; i++) energy += bars[i] + peaks[i];
    if (playing || energy > 0.01) raf = requestAnimationFrame(frame);
    else { last = 0; wallGlow.style.opacity = ''; }
  }

  function vizKick() {
    if (reduced()) {
      const playing = isPlaying();
      for (let i = 0; i < N; i++) { bars[i] = playing ? target(i, 1.3, TRACKS[cur].bpm) : 0; peaks[i] = bars[i]; }
      draw();
      return;
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  vizBtn.addEventListener('click', () => {
    vizMode = (vizMode + 1) % 3;
    vizBtn.setAttribute('aria-label', 'Visualizador: ' + MODES[vizMode] + '. Clique pra trocar o modo');
    draw();
    vizKick();
  });
  mqReduce.addEventListener('change', () => { wallGlow.style.opacity = ''; vizKick(); });

  /* ================= Discografia ================= */
  const RELEASES = [
    { title: 'ANTI-RASO', meta: 'EP · lançado em 30 de julho de 2026 · 4 faixas · 7.8/10 na Unglued', id: '7EM81z5ydGQq04ZbkIE5aS' },
    { title: 'MERGULHAR', meta: 'single · 2026 · também está no EP ANTI-RASO', id: '5jJ1py37M3i7qaZgkOOf4V' },
    { title: 'OFF!', meta: 'single · lançado em 13 de novembro de 2025 · abre o EP ANTI-RASO', id: '6Cg0ULHHKTsJo7GlEfPKrF' },
    { title: 'Four Rooms for Four Fools', meta: 'EP · 2022', id: '3m7dNgjIIiHDuZiNcu8Vhi' }
  ];
  const relBtns = $$('.rel');
  const relEmbed = $('#rel-embed');
  let relCur = 0;
  let relLoaded = -1;
  function loadRelEmbed() {
    if (relLoaded === relCur) return;
    relLoaded = relCur;
    const r = RELEASES[relCur];
    const f = document.createElement('iframe');
    f.title = 'Spotify — ' + r.title;
    f.loading = 'lazy';
    f.height = relCur === 0 ? '420' : '152';
    if (relCur === 0) f.className = 'is-album';
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    f.src = 'https://open.spotify.com/embed/album/' + r.id + '?utm_source=generator&theme=0';
    relEmbed.replaceChildren(f);
  }
  function selectRel(i) {
    relCur = i;
    const r = RELEASES[i];
    relBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    $('#rel-title').textContent = r.title;
    $('#rel-meta').textContent = r.meta;
    $('#rel-link').href = 'https://open.spotify.com/album/' + r.id;
    $('#disco-status').textContent = RELEASES.length + ' objeto(s) · ' + r.title + ' selecionado';
    if (!$('#win-disco').hidden) loadRelEmbed();
  }
  relBtns.forEach((b) => b.addEventListener('click', () => selectRel(Number(b.dataset.rel))));
  $('#win-disco').addEventListener('win:open', loadRelEmbed);

  /* ================= Vídeo (facades) ================= */
  const vidStage = $('#vid-stage');
  const vidItems = $$('.vid-item');
  let vidCur = vidItems[0];
  const PLAY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>';
  function renderFacade(item) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'facade';
    b.setAttribute('aria-label', 'Tocar vídeo: ' + item.dataset.title);
    const img = document.createElement('img');
    img.src = item.dataset.thumb;
    img.alt = '';
    img.width = 1280;
    img.height = 720;
    const p = document.createElement('span');
    p.className = 'facade__play';
    p.innerHTML = PLAY_SVG;
    const cap = document.createElement('span');
    cap.className = 'facade__cap';
    cap.textContent = item.dataset.title;
    b.append(img, p, cap);
    b.addEventListener('click', () => {
      pauseMusic();
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube.com/embed/' + item.dataset.yt + '?autoplay=1&rel=0';
      f.title = item.dataset.title;
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      vidStage.replaceChildren(f);
      f.focus();
    });
    vidStage.replaceChildren(b);
  }
  vidItems.forEach((it) => it.addEventListener('click', () => {
    vidCur = it;
    vidItems.forEach((x) => x.setAttribute('aria-pressed', String(x === it)));
    $('#vid-title').textContent = it.dataset.title;
    $('#vid-desc').textContent = it.dataset.desc;
    renderFacade(it);
  }));
  renderFacade(vidCur);
  $('#win-video').addEventListener('win:close', () => renderFacade(vidCur));

  /* ================= SHOWS.txt ================= */
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const showEls = $$('.show');
  const SHOW_DATES = new Map();
  let nPast = 0;
  let nToday = 0;
  let nNext = 0;
  showEls.forEach((li) => {
    const [y, m, d] = li.dataset.date.split('-').map(Number);
    const tt = new Date(y, m - 1, d).getTime();
    const st = $('.show__status', li);
    SHOW_DATES.set(li.dataset.date, tt < t0 ? 'past' : 'up');
    if (tt < t0) { li.classList.add('is-past'); st.textContent = '[JÁ FOI]'; nPast++; }
    else if (tt === t0) { li.classList.add('is-today'); st.textContent = '[HOJE!!!]'; nToday++; }
    else { li.classList.add(nNext === 0 ? 'is-next' : 'is-soon'); st.textContent = nNext === 0 ? '[PRÓXIMO]' : '[EM BREVE]'; nNext++; }
  });
  $('#shows-status').textContent = showEls.length + ' shows · ' + nPast + ' já foram' + (nToday ? ' · ' + nToday + ' HOJE' : '') + (nNext ? ' · ' + nNext + ' vindo aí' : '');

  const notepad = $('#notepad');
  const wrapBtn = $('#wrap-btn');
  wrapBtn.addEventListener('click', () => {
    const nowrap = notepad.classList.toggle('is-nowrap');
    wrapBtn.setAttribute('aria-pressed', String(!nowrap));
  });
  let npSize = 0;
  function setNp(delta) {
    if (!npSize) npSize = parseFloat(getComputedStyle(notepad).getPropertyValue('--np-size')) || 14;
    npSize = clamp(npSize + delta, 11, 22);
    notepad.style.setProperty('--np-size', npSize + 'px');
  }
  $('#font-up').addEventListener('click', () => setNp(1));
  $('#font-down').addEventListener('click', () => setNp(-1));

  $('#ics-btn').addEventListener('click', () => {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HORNEY//burned-cd//PT',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      'UID:horney-2026-10-09@horney.band',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:20261009',
      'DTEND;VALUE=DATE:20261010',
      'SUMMARY:HORNEY — último show do ano',
      'LOCATION:Local em breve (@horney.band)',
      'DESCRIPTION:SAI DE CASA E COLE NOS SHOWS!!! https://www.instagram.com/horney.band/',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'horney-ultimo-show-2026.ics';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify('SHOWS.txt', 'horney-ultimo-show-2026.ics salvo. Abre e põe na agenda ⚡');
  });

  /* ================= Image viewer ================= */
  const imgWin = $('#win-img');
  function openImage(src, alt, name, opener) {
    const img = $('#img-view');
    img.src = src;
    img.alt = alt;
    $('#img-cap').textContent = alt;
    $('#t-img').textContent = name + ' — Visualizador de imagens';
    imgWin.dataset.title = name;
    const st = wins.get('win-img');
    if (st.task) { $('.task__t', st.task).textContent = name; st.task.setAttribute('aria-label', name); }
    openWin('win-img', opener);
  }
  $$('[data-img]').forEach((b) => b.addEventListener('click', () => openImage(b.dataset.img, b.dataset.alt, b.dataset.name, b)));

  /* ================= MERCH ================= */
  const ITEMS = [
    { title: 'Camiseta ANTI-RASO', desc: 'Preta, com a capa do EP no peito: a porta no mar, o olho e o raio.' },
    { title: 'Camiseta OLHO', desc: 'Amarela HORNEY com o olho-sol do logo em preto. Pra ser visto de longe na grade.' },
    { title: 'Ecobag H◎RNEY', desc: 'Algodão cru com o logo amarelo. Cabe o merch, o casaco e a água do show.' },
    { title: 'Kit de adesivos', desc: 'Olho, capa de ANTI-RASO e logo — pra colar no case, no skate, no capacete.' }
  ];
  const thumbs = $$('.thumb');
  const miArt = $('#mi-art');
  function selectItem(i) {
    thumbs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    $('#mi-title').textContent = ITEMS[i].title;
    $('#mi-desc').textContent = ITEMS[i].desc;
    miArt.replaceChildren(cloneUnique($('svg', thumbs[i]), '-d'));
    $('#merch-status').textContent = ITEMS.length + ' objeto(s) · ' + ITEMS[i].title + ' · 0 em estoque (ainda!)';
  }
  thumbs.forEach((b) => b.addEventListener('click', () => selectItem(Number(b.dataset.item))));
  selectItem(0);

  /* ================= Messenger ================= */
  const socialWin = $('#win-social');
  $('#nudge-btn').addEventListener('click', () => {
    socialWin.classList.remove('is-nudge', 'is-flash');
    void socialWin.offsetWidth;
    socialWin.classList.add(reduced() ? 'is-flash' : 'is-nudge');
    notify('HORNEY Messenger', 'Você chamou a atenção da HORNEY! Agora sai de casa e cola no show ⚡😈');
  });

  /* ================= Shutdown ================= */
  const shutdown = $('#shutdown');
  function reboot() {
    shutdown.hidden = true;
    startBtn.focus();
  }
  $('#shutdown-btn').addEventListener('click', () => {
    setStart(false);
    pauseMusic();
    shutdown.hidden = false;
    $('#reboot-btn').focus();
  });
  $('#reboot-btn').addEventListener('click', reboot);

  /* ================= Clock & calendar ================= */
  function tick() {
    const d = new Date();
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    clockBtn.textContent = time;
    clockBtn.title = date;
    clockBtn.setAttribute('aria-label', time + ', ' + date + '. Abrir calendário de shows');
  }
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000 + 50);

  let calView = new Date(today.getFullYear(), today.getMonth(), 1);
  const calGrid = $('#cal-grid');
  function renderCal() {
    const y = calView.getFullYear();
    const m = calView.getMonth();
    $('#cal-title').textContent = calView.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const frag = document.createDocumentFragment();
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((d) => {
      const s = document.createElement('span');
      s.className = 'cal__dow';
      s.textContent = d;
      s.setAttribute('aria-hidden', 'true');
      frag.append(s);
    });
    const lead = new Date(y, m, 1).getDay();
    for (let i = 0; i < lead; i++) frag.append(document.createElement('span'));
    const days = new Date(y, m + 1, 0).getDate();
    const now = new Date();
    for (let d = 1; d <= days; d++) {
      const key = y + '-' + pad(m + 1) + '-' + pad(d);
      const show = SHOW_DATES.get(key);
      const el = document.createElement(show ? 'button' : 'span');
      el.className = 'cal__d';
      el.textContent = String(d);
      if (y === now.getFullYear() && m === now.getMonth() && d === now.getDate()) el.classList.add('is-today');
      if (show) {
        el.type = 'button';
        el.classList.add('is-show');
        if (show === 'past') el.classList.add('is-past');
        el.setAttribute('aria-label', d + ': show da HORNEY' + (show === 'past' ? ' (já foi)' : '') + '. Abrir SHOWS.txt');
        el.addEventListener('click', () => { setCal(false); openWin('win-shows', clockBtn); });
      }
      frag.append(el);
    }
    calGrid.replaceChildren(frag);
  }
  $('#cal-prev').addEventListener('click', () => { calView = new Date(calView.getFullYear(), calView.getMonth() - 1, 1); renderCal(); });
  $('#cal-next').addEventListener('click', () => { calView = new Date(calView.getFullYear(), calView.getMonth() + 1, 1); renderCal(); });

  /* ================= Boot ================= */
  markTrack();
  openWin('win-player', null, { focus: false });
  refresh();
  setTimeout(() => {
    if (discState !== 'case') return;
    notify('Novo hardware encontrado', mobile()
      ? 'CD-R "HORNEY — ANTI-RASO" detectado. Toca no disco pra ele entrar no HORNEY AMP.'
      : 'CD-R "HORNEY — ANTI-RASO" detectado. Arrasta o disco pro HORNEY AMP (ou só clica nele).');
  }, 1400);
  if (nToday) {
    setTimeout(() => notify('HOJE TEM SHOW!!!', 'Último show do ano é hoje — local em breve no @horney.band. Abre o SHOWS.txt.', 8000), 10000);
  }
})();
