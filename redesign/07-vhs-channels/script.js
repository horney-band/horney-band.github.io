/* HORNEY · 07 CHANNEL SURF: channel switching, CRT power, canvas static, Web Audio blips */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;

  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduce = mqReduce.matches;

  const tube = $('#tube');
  const channelsEl = $('#channels');
  const channels = $$('.channel', channelsEl);
  const total = channels.length;
  const numLinks = $$('.rnum');
  const osd = $('#osd');
  const osdNum = $('#osd-num');
  const osdName = $('#osd-name');
  const osdVol = $('#osd-vol');
  const announcer = $('#announcer');
  const btnPower = $('#btn-power');
  const btnMute = $('#btn-mute');

  let current = 0;   // channel on screen
  let target = 0;    // channel being tuned (differs from current mid-switch)
  let powered = false;

  const pad2 = (n) => String(n).padStart(2, '0');
  const later = (fn, ms) => window.setTimeout(fn, ms);

  /* ------------------------------------------------------------------ */
  /* Canvas static                                                       */
  /* ------------------------------------------------------------------ */
  const staticFx = (() => {
    const cvs = $('#static');
    const ctx = cvs.getContext('2d');
    const W = 200;
    let H = 150;
    let frames = [];
    let raf = 0;
    let last = 0;
    let fi = 0;
    let burstStart = 0;
    let burstUntil = 0;

    function build() {
      const r = cvs.getBoundingClientRect();
      const ratio = r.width > 0 ? r.height / r.width : 0.75;
      H = Math.max(60, Math.min(400, Math.round(W * ratio)));
      cvs.width = W;
      cvs.height = H;
      frames = [];
      for (let f = 0; f < 8; f++) {
        const img = ctx.createImageData(W, H);
        const buf = new Uint32Array(img.data.buffer);
        for (let i = 0; i < buf.length; i++) {
          const v = (Math.random() * 255) | 0;
          buf[i] = 0xff000000 | (v << 16) | (v << 8) | v;
        }
        frames.push(img);
      }
      paint(false);
    }

    function paint(bursting) {
      if (!frames.length) return;
      fi = (fi + 1 + ((Math.random() * 3) | 0)) % frames.length;
      const off = (Math.random() * H) | 0;
      ctx.putImageData(frames[fi], 0, off);
      ctx.putImageData(frames[fi], 0, off - H);
      if (bursting) {
        // VHS tracking bars and dropouts
        for (let k = 0; k < 3; k++) {
          const y = (Math.random() * H) | 0;
          const h = 2 + ((Math.random() * H * 0.12) | 0);
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.6)';
          ctx.fillRect(0, y, W, h);
        }
      }
    }

    function idleWanted() {
      return powered && !reduce && !document.hidden;
    }

    // Bursts run a short rAF loop; idle snow is one painted frame jittered by a
    // CSS transform animation (compositor-only), so no loop runs while idle.
    function loop(now) {
      raf = 0;
      const bursting = now < burstUntil;
      if (!bursting) {
        if (idleWanted()) {
          paint(false);
          cvs.style.opacity = '0.065';
          cvs.classList.add('is-idle');
        } else {
          cvs.classList.remove('is-idle');
          cvs.style.opacity = powered && reduce ? '0.04' : '0';
        }
        return;
      }
      cvs.classList.remove('is-idle');
      if (now - last >= 20) {
        last = now;
        paint(true);
        const t = (now - burstStart) / (burstUntil - burstStart);
        cvs.style.opacity = String(Math.max(0.07, 0.96 - 0.89 * t * t));
      }
      raf = window.requestAnimationFrame(loop);
    }

    function kick() {
      if (!raf) raf = window.requestAnimationFrame(loop);
    }

    function burst(ms) {
      const now = performance.now();
      burstStart = now;
      burstUntil = now + ms;
      kick();
    }

    let resizeT = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeT);
      resizeT = later(build, 200);
    });
    document.addEventListener('visibilitychange', kick);

    return { build, burst, kick };
  })();

  /* ------------------------------------------------------------------ */
  /* Web Audio (muted by default)                                        */
  /* ------------------------------------------------------------------ */
  const audio = (() => {
    let ctx = null;
    let master = null;
    let noise = null;
    let muted = true;

    function ensure() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.45;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return ctx;
    }

    function ready() {
      if (muted) return null;
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
      return c;
    }

    function envelope(g, t, peak, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.setValueAtTime(peak * 0.8, t + dur * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    function blip(dur = 0.3) {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noise;
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 600;
      const peak = c.createBiquadFilter();
      peak.type = 'peaking';
      peak.frequency.value = 3200;
      peak.Q.value = 0.8;
      peak.gain.value = 7;
      const g = c.createGain();
      envelope(g, t, 0.32, dur);
      src.connect(hp).connect(peak).connect(g).connect(master);
      src.start(t, Math.random() * 0.5, dur + 0.05);
    }

    function power(on) {
      const c = ready();
      if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      if (on) {
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(36, t + 0.35);
      } else {
        o.frequency.setValueAtTime(900, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.42);
      }
      envelope(g, t, 0.5, 0.48);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.52);
      if (on) {
        // flyback transformer whine, fading out
        const w = c.createOscillator();
        const wg = c.createGain();
        w.type = 'sine';
        w.frequency.value = 15734;
        wg.gain.setValueAtTime(0.0001, t);
        wg.gain.exponentialRampToValueAtTime(0.02, t + 0.05);
        wg.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        w.connect(wg).connect(master);
        w.start(t);
        w.stop(t + 1.25);
        blip(0.6);
      }
    }

    function setMuted(m) {
      muted = m;
      if (!m) ready();
      else if (ctx && ctx.state === 'running') ctx.suspend();
    }

    return { blip, power, setMuted, isMuted: () => muted };
  })();

  /* ------------------------------------------------------------------ */
  /* OSD                                                                 */
  /* ------------------------------------------------------------------ */
  let osdT = 0;
  function showOsd(i) {
    osdNum.textContent = 'CH ' + pad2(i + 1);
    osdName.textContent = channels[i].dataset.name;
    osd.classList.remove('is-visible');
    void osd.offsetWidth;
    osd.classList.add('is-visible');
    window.clearTimeout(osdT);
    osdT = later(() => osd.classList.remove('is-visible'), 2800);
  }

  let volT = 0;
  function showVol(muted) {
    osdVol.textContent = muted ? 'MUTE' : 'VOLUME ▮▮▮▮▮▮▮▯▯▯';
    osdVol.classList.add('is-visible');
    window.clearTimeout(volT);
    volT = later(() => osdVol.classList.remove('is-visible'), 1800);
  }

  const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const clockLong = $$('[data-clock="long"]');
  const clockShort = $$('[data-clock="short"]');
  function tickClock() {
    const d = new Date();
    const hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    const day = pad2(d.getDate()) + ' ' + MONTHS[d.getMonth()];
    clockLong.forEach((el) => { el.textContent = DAYS[d.getDay()] + ' ' + day + ' · ' + hm; });
    clockShort.forEach((el) => { el.textContent = day + ' ' + hm; });
  }

  /* ------------------------------------------------------------------ */
  /* Lazy embeds                                                         */
  /* ------------------------------------------------------------------ */
  const TAPES = [
    { id: '9uP1P11at9M', thumb: '../assets/yt-fools-game.jpg', title: "Fool's Game (clipe oficial)" },
    { id: 'V9Rpgtc2vTs', thumb: '../assets/yt-live.jpg', title: 'Horney Live' }
  ];
  const vcrScreen = $('#vcr-screen');
  const vcrMode = $('.vcr__mode');
  const tapeBtns = $$('.tape');
  let tapeIdx = 0;

  function renderFacade() {
    const tape = TAPES[tapeIdx];
    vcrScreen.textContent = '';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'facade';
    const img = document.createElement('img');
    img.src = tape.thumb;
    img.alt = '';
    img.width = 1280;
    img.height = 720;
    img.decoding = 'async';
    const play = document.createElement('span');
    play.className = 'facade__play';
    play.setAttribute('aria-hidden', 'true');
    play.textContent = '▶ PLAY';
    const label = document.createElement('span');
    label.className = 'sr-only';
    label.textContent = 'Tocar “' + tape.title + '”: carrega o player do YouTube';
    b.append(img, play, label);
    vcrScreen.append(b);
    vcrMode.textContent = '■ STOP';
  }

  function playTape() {
    const tape = TAPES[tapeIdx];
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube.com/embed/' + tape.id + '?autoplay=1&rel=0&playsinline=1';
    f.title = tape.title + ' — YouTube';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    vcrScreen.textContent = '';
    vcrScreen.append(f);
    vcrMode.textContent = '▶ PLAY';
    f.focus();
  }

  vcrScreen.addEventListener('click', (e) => {
    if (e.target.closest('.facade')) {
      if (!reduce) staticFx.burst(260);
      audio.blip(0.18);
      playTape();
    }
  });

  tapeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.tape);
      const wasPlaying = !!vcrScreen.querySelector('iframe');
      tapeIdx = idx;
      tapeBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-current', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (!reduce) staticFx.burst(320);
      audio.blip(0.22);
      if (wasPlaying) playTape();
      else renderFacade();
    });
  });

  function enterChannel(el) {
    $$('iframe[data-src]', el).forEach((f) => {
      f.src = f.dataset.src;
      f.removeAttribute('data-src');
    });
  }

  function leaveChannel(el) {
    // changing channel stops the tape, like a real set
    if (el.contains(vcrScreen) && vcrScreen.querySelector('iframe')) renderFacade();
  }

  /* ------------------------------------------------------------------ */
  /* Channel switching                                                   */
  /* ------------------------------------------------------------------ */
  function syncUI(i) {
    const ch = channels[i];
    numLinks.forEach((a, k) => {
      if (k === i) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    tube.dataset.ch = String(i + 1);
    root.style.setProperty('--glow', ch.dataset.glow);
    document.title = 'CH ' + pad2(i + 1) + ' · ' + ch.dataset.name + ' — HORNEY';
    const hash = '#' + ch.id;
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }

  function swapTo(i) {
    const next = channels[i];
    const hadFocus = channelsEl.contains(document.activeElement) && !next.contains(document.activeElement);
    channels.forEach((c) => {
      if (c === next) return;
      if (c.classList.contains('is-active')) {
        leaveChannel(c);
        c.classList.remove('is-active');
      }
    });
    next.classList.add('is-active');
    next.scrollTop = 0;
    current = i;
    enterChannel(next);
    syncUI(i);
    if (hadFocus) {
      const h = next.querySelector('[tabindex="-1"]');
      if (h) h.focus({ preventScroll: true });
    }
  }

  let swapT = 0;
  let tuneT = 0;
  function setChannel(i) {
    i = ((i % total) + total) % total;
    if (!powered) {
      powerOn(i);
      return;
    }
    if (i === target && i === current) {
      showOsd(i);
      return;
    }
    target = i;
    showOsd(i);
    announcer.textContent = 'Canal ' + (i + 1) + ': ' + channels[i].dataset.name;
    audio.blip();
    if (reduce) {
      swapTo(i);
      return;
    }
    staticFx.burst(480);
    tube.classList.remove('is-tuning');
    void tube.offsetWidth;
    tube.classList.add('is-tuning');
    window.clearTimeout(swapT);
    swapT = later(() => swapTo(i), 140);
    window.clearTimeout(tuneT);
    tuneT = later(() => tube.classList.remove('is-tuning'), 520);
  }

  const step = (dir) => setChannel(target + dir);

  /* ------------------------------------------------------------------ */
  /* Power                                                               */
  /* ------------------------------------------------------------------ */
  let powerT = 0;
  function setPowerUI() {
    btnPower.setAttribute('aria-pressed', String(powered));
    btnPower.setAttribute('aria-label', powered ? 'Desligar a TV (P)' : 'Ligar a TV (P)');
  }

  function powerOn(i = target) {
    if (powered) return;
    powered = true;
    window.clearTimeout(powerT);
    tube.classList.remove('anim-off');
    root.classList.remove('power-off');
    root.classList.add('power-on');
    channelsEl.inert = false;
    target = ((i % total) + total) % total;
    swapTo(target);
    setPowerUI();
    audio.power(true);
    announcer.textContent = 'TV ligada. Canal ' + (target + 1) + ': ' + channels[target].dataset.name;
    if (reduce) {
      showOsd(target);
      staticFx.kick();
      return;
    }
    tube.classList.remove('anim-on');
    void tube.offsetWidth;
    tube.classList.add('anim-on');
    staticFx.burst(1000);
    powerT = later(() => {
      tube.classList.remove('anim-on');
      showOsd(target);
    }, 950);
  }

  function powerOff() {
    if (!powered) return;
    powered = false;
    window.clearTimeout(powerT);
    window.clearTimeout(swapT);
    tube.classList.remove('anim-on', 'is-tuning');
    if (target !== current) swapTo(target);
    leaveChannel(channels[current]);
    if (channelsEl.contains(document.activeElement)) btnPower.focus();
    channelsEl.inert = true;
    osd.classList.remove('is-visible');
    setPowerUI();
    audio.power(false);
    announcer.textContent = 'TV desligada. Aperte power ou um número de 1 a 6.';
    const finish = () => {
      tube.classList.remove('anim-off');
      root.classList.remove('power-on');
      root.classList.add('power-off');
      staticFx.kick();
    };
    if (reduce) {
      finish();
      return;
    }
    tube.classList.add('anim-off');
    powerT = later(finish, 600);
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                               */
  /* ------------------------------------------------------------------ */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-goto]');
    if (!a) return;
    e.preventDefault();
    setChannel(Number(a.dataset.goto) - 1);
  });

  btnPower.addEventListener('click', () => (powered ? powerOff() : powerOn()));
  $('#btn-next').addEventListener('click', () => step(1));
  $('#btn-prev').addEventListener('click', () => step(-1));

  function toggleMute() {
    const m = !audio.isMuted();
    audio.setMuted(m);
    btnMute.setAttribute('aria-pressed', String(!m));
    announcer.textContent = m ? 'Som dos efeitos desligado' : 'Som dos efeitos ligado';
    if (powered) {
      showVol(m);
      if (!m) audio.blip(0.18);
    }
  }
  btnMute.addEventListener('click', toggleMute);

  window.addEventListener('hashchange', () => {
    const m = /^#ch-([1-9])$/.exec(location.hash);
    if (m && Number(m[1]) <= total) setChannel(Number(m[1]) - 1);
  });

  function activeScroller() {
    return channels[current];
  }
  function canScroll(el, dir) {
    if (!el) return false;
    if (dir > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    return el.scrollTop > 2;
  }

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable="true"]')) return;
    const k = e.key;
    if (/^[1-9]$/.test(k) && Number(k) <= total) {
      e.preventDefault();
      setChannel(Number(k) - 1);
      return;
    }
    switch (k) {
      case 'ArrowRight':
        e.preventDefault();
        step(1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        step(-1);
        break;
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!powered) return;
        const dir = k === 'ArrowDown' ? 1 : -1;
        e.preventDefault();
        const sc = activeScroller();
        if (canScroll(sc, dir)) sc.scrollBy({ top: dir * 140, behavior: reduce ? 'auto' : 'smooth' });
        else step(dir);
        break;
      }
      case 'm':
      case 'M':
        toggleMute();
        break;
      case 'p':
      case 'P':
        if (powered) powerOff();
        else powerOn();
        break;
      default:
    }
  });

  // Wheel: scroll the channel first; at its edge, a fresh flick changes channel.
  let wheelAcc = 0;
  let wheelLock = 0;
  let lastNative = 0;
  let wheelIdleT = 0;
  window.addEventListener('wheel', (e) => {
    if (!powered || e.ctrlKey) return;
    const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const dy = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * mult;
    const dir = Math.sign(dy);
    if (!dir) return;
    const now = performance.now();
    if (now < wheelLock) {
      e.preventDefault();
      return;
    }
    if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && canScroll(activeScroller(), dir)) {
      lastNative = now;
      wheelAcc = 0;
      return;
    }
    e.preventDefault();
    if (now - lastNative < 380) return; // trackpad inertia from a native scroll
    wheelAcc += dy;
    window.clearTimeout(wheelIdleT);
    wheelIdleT = later(() => { wheelAcc = 0; }, 240);
    if (Math.abs(wheelAcc) > 90) {
      wheelAcc = 0;
      wheelLock = now + 850;
      step(dir);
    }
  }, { passive: false });

  // Swipe: horizontal flick on the screen changes channel.
  const screenEl = $('#screen');
  let tx = 0;
  let ty = 0;
  let tt = 0;
  screenEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
    tt = performance.now();
  }, { passive: true });
  screenEl.addEventListener('touchend', (e) => {
    if (!tt || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    const dt = performance.now() - tt;
    tt = 0;
    if (dt < 700 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (powered) step(dx < 0 ? 1 : -1);
      else powerOn();
    }
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Shows: past / today / next from today's date                         */
  /* ------------------------------------------------------------------ */
  (() => {
    const d = new Date();
    const today = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    let upcoming = 0;
    $$('.show[data-date]').forEach((row) => {
      const date = row.dataset.date;
      const st = $('.show__status', row);
      row.classList.remove('is-past', 'is-today', 'is-next');
      if (date < today) {
        row.classList.add('is-past');
        st.textContent = 'JÁ ROLOU';
      } else if (date === today) {
        row.classList.add('is-today');
        st.textContent = 'HOJE!!! ⚡️';
        upcoming++;
      } else {
        row.classList.add('is-next');
        st.textContent = 'PRÓXIMO';
        upcoming++;
      }
    });
    if (!upcoming) {
      $('#shows-note').textContent = 'AGENDA NOVA EM BREVE. SEGUE O INSTA PRA SABER PRIMEIRO.';
    }
  })();

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */
  mqReduce.addEventListener('change', (e) => {
    reduce = e.matches;
    staticFx.kick();
  });

  tickClock();
  window.setInterval(tickClock, 15000);

  const m = /^#ch-([1-9])$/.exec(location.hash);
  const start = m && Number(m[1]) <= total ? Number(m[1]) - 1 : 0;
  target = current = start;
  channels.forEach((c, k) => c.classList.toggle('is-active', k === start));
  syncUI(start);
  channelsEl.inert = true;
  staticFx.build();

  if (reduce) powerOn(start);
  else later(() => powerOn(start), 280);
})();
