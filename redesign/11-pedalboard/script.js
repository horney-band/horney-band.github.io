/* H◎RNEY — 11 PEDALBOARD: stomps, knobs → FX bus, Web Audio rig, wobbling cables */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const root = document.documentElement;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mqReduce.matches;

  /* ---------------------------------------------------------------- params */
  const DEFAULTS = { drive: 0.14, tone: 0, time: 0.35, mix: 0.3, glitch: 0.1, wah: 0.25, vol: 0.6 };
  const P = { ...DEFAULTS };
  const turb = document.getElementById('fx-turb');
  const disp = document.getElementById('fx-disp');

  let fxQueued = false;
  function applyFx() {
    if (fxQueued) return;
    fxQueued = true;
    requestAnimationFrame(applyFxNow);
  }
  function applyFxNow() {
    fxQueued = false;
    const d = P.drive;
    disp.setAttribute('scale', (d * 70).toFixed(1));
    turb.setAttribute('baseFrequency', `${(0.006 + d * 0.02).toFixed(4)} ${(0.012 + d * 0.06).toFixed(4)}`);
    const hue = Math.round(P.tone * 300);
    const sat = (1 + P.wah * 1.1).toFixed(2);
    const lite = `hue-rotate(${hue}deg) saturate(${sat})`;
    root.style.setProperty('--fx', `${d > 0.02 ? 'url(#fx-drive) ' : ''}${lite}`);
    // full-bleed backdrop gets GPU-cheap color filters only, never the displacement
    root.style.setProperty('--fx-lite', lite);
    root.style.setProperty('--echo', (P.time * 14).toFixed(2));
    root.style.setProperty('--echoa', P.mix.toFixed(3));
    root.style.setProperty('--gs', (P.glitch * 4).toFixed(2));
    root.style.setProperty('--wah', P.wah.toFixed(3));
  }

  /* static grain: render noise once to a small tile instead of live SVG turbulence */
  (function grain() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (!g) return;
    const img = g.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    root.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
    root.style.setProperty('--grain-o', '.045');
  })();

  /* ---------------------------------------------------------------- knobs */
  const controls = $$('[data-param]');
  const byParam = {};
  controls.forEach((el) => { (byParam[el.dataset.param] ||= []).push(el); });

  function labelOf(el) {
    const wrap = el.classList.contains('treadle') ? el : el.parentElement;
    return wrap ? wrap.querySelector('.knob-label') : null;
  }

  function paint(el, v) {
    el.style.setProperty('--v', v.toFixed(3));
    const pct = Math.round(v * 100);
    el.setAttribute('aria-valuenow', String(pct));
    el.setAttribute('aria-valuetext', `${pct}%`);
    if (el.classList.contains('is-turning')) {
      const lab = labelOf(el);
      if (lab) lab.textContent = String(pct);
    }
  }

  function setParam(name, v) {
    v = clamp01(v);
    P[name] = v;
    (byParam[name] || []).forEach((el) => paint(el, v));
    applyFx();
    audioParam(name);
  }

  controls.forEach((el) => {
    const name = el.dataset.param;
    const isTreadle = el.classList.contains('treadle');
    const lab = labelOf(el);
    if (lab) lab.dataset.label = lab.textContent;

    const beginTurn = () => {
      el.classList.add('is-turning');
      if (lab) lab.textContent = String(Math.round(P[name] * 100));
    };
    const endTurn = () => {
      el.classList.remove('is-turning');
      if (lab) lab.textContent = lab.dataset.label;
    };

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      el.focus({ preventScroll: true });
      try { el.setPointerCapture(e.pointerId); } catch (_) { /* pointer already gone */ }
      const sx = e.clientX, sy = e.clientY, sv = P[name];
      beginTurn();
      const move = (ev) => {
        const dy = sy - ev.clientY;
        const dx = ev.clientX - sx;
        setParam(name, sv + (isTreadle ? dy / 110 : (dy + dx * 0.5) / 160));
      };
      const up = () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', up);
        endTurn();
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    });

    el.addEventListener('click', (e) => e.stopPropagation());
    el.addEventListener('dblclick', (e) => { e.stopPropagation(); setParam(name, DEFAULTS[name]); });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      setParam(name, P[name] - Math.sign(e.deltaY || -e.deltaX) * 0.03);
    }, { passive: false });

    el.addEventListener('keydown', (e) => {
      const step = e.shiftKey ? 0.1 : 0.02;
      let v = null;
      switch (e.key) {
        case 'ArrowUp': case 'ArrowRight': v = P[name] + step; break;
        case 'ArrowDown': case 'ArrowLeft': v = P[name] - step; break;
        case 'PageUp': v = P[name] + 0.1; break;
        case 'PageDown': v = P[name] - 0.1; break;
        case 'Home': v = 0; break;
        case 'End': v = 1; break;
        default: return;
      }
      e.preventDefault();
      e.stopPropagation();
      setParam(name, v);
    });

    paint(el, P[name]);
  });

  /* ---------------------------------------------------------------- audio */
  let ctx = null;
  let A = null;
  let soundOn = false;
  const AC = window.AudioContext || window.webkitAudioContext;

  function makeCurve(d) {
    const n = 1024, k = 2 + d * 140, c = new Float32Array(n), norm = Math.tanh(k);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      c[i] = Math.tanh(k * x) / norm;
    }
    return c;
  }
  const toneHz = () => 2200 + P.tone * 4800;
  const wahHz = () => 350 + P.wah * 2200;

  function initAudio() {
    ctx = new AC();
    const input = ctx.createGain();
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80;
    const pre = ctx.createGain(); pre.gain.value = 1 + P.drive * 6;
    const shaper = ctx.createWaveShaper(); shaper.curve = makeCurve(P.drive); shaper.oversample = '4x';
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = toneHz(); tone.Q.value = 0.8;
    const wah = ctx.createBiquadFilter(); wah.type = 'peaking'; wah.frequency.value = wahHz(); wah.Q.value = 4; wah.gain.value = 12;
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 4800; cab.Q.value = 0.7;
    const post = ctx.createGain(); post.gain.value = 0.32;
    const delay = ctx.createDelay(1.5); delay.delayTime.value = 0.08 + P.time * 0.6;
    const fb = ctx.createGain(); fb.gain.value = P.mix * 0.55;
    const wet = ctx.createGain(); wet.gain.value = P.mix * 0.7;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    const master = ctx.createGain(); master.gain.value = 0;

    input.connect(hp); hp.connect(pre); pre.connect(shaper); shaper.connect(tone);
    tone.connect(wah); wah.connect(cab); cab.connect(post); post.connect(comp);
    post.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(comp);
    comp.connect(master); master.connect(ctx.destination);

    A = { input, pre, shaper, tone, wah, delay, fb, wet, comp, master };
  }

  function audioParam(name) {
    if (!A) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'drive': A.shaper.curve = makeCurve(P.drive); A.pre.gain.setTargetAtTime(1 + P.drive * 6, t, 0.02); break;
      case 'tone': A.tone.frequency.setTargetAtTime(toneHz(), t, 0.03); break;
      case 'time': A.delay.delayTime.setTargetAtTime(0.08 + P.time * 0.6, t, 0.05); break;
      case 'mix': A.fb.gain.setTargetAtTime(P.mix * 0.55, t, 0.03); A.wet.gain.setTargetAtTime(P.mix * 0.7, t, 0.03); break;
      case 'wah': A.wah.frequency.setTargetAtTime(wahHz(), t, 0.03); break;
      case 'vol': A.master.gain.setTargetAtTime(soundOn ? P.vol * 0.9 : 0, t, 0.03); break;
      default: break;
    }
  }

  function noiseBurst(t, dur, freq, level, dest) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.value = level;
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  /** Power chord: root + fifth + octave, two detuned saws each, plus pick transient. */
  function chord(root, t, dur) {
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0.0001, t);
    vg.gain.exponentialRampToValueAtTime(0.2, t + 0.008);
    vg.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
    vg.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    vg.connect(A.input);
    [1, 1.4983, 2].forEach((r) => {
      [-7, 7].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = root * r;
        o.detune.value = det;
        o.connect(vg);
        o.start(t);
        o.stop(t + dur + 0.05);
      });
    });
    noiseBurst(t, 0.03, 2800, 0.35, A.input);
  }

  /** Clean reference tone straight into the compressor (a tuner mutes the dirt). */
  function beep(freq, t, dur) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(A.comp);
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = freq;
    o.connect(g); o.start(t); o.stop(t + dur + 0.05);
  }

  function playPedal(fx) {
    if (!soundOn || !A) return;
    const t = ctx.currentTime + 0.012;
    noiseBurst(t, 0.012, 4200, 0.12, A.comp); // the footswitch click
    switch (fx) {
      case 'fuzz': chord(82.41, t + 0.02, 1.9); break;
      case 'delay': chord(110, t + 0.02, 0.7); break;
      case 'tuner': beep(440, t + 0.02, 0.9); beep(220, t + 0.02, 0.9); break;
      case 'looper':
        [82.41, 98, 110, 98].forEach((f, k) => chord(f, t + 0.02 + k * 0.28, k === 3 ? 0.9 : 0.26));
        break;
      case 'wah': {
        chord(98, t + 0.02, 1.4);
        const w = A.wah.frequency;
        w.cancelScheduledValues(t);
        w.setValueAtTime(wahHz(), t);
        w.linearRampToValueAtTime(350, t + 0.05);
        w.linearRampToValueAtTime(2500, t + 0.4);
        w.linearRampToValueAtTime(500, t + 0.85);
        w.linearRampToValueAtTime(wahHz(), t + 1.3);
        break;
      }
      default: break;
    }
  }

  const soundBtn = document.getElementById('sound-toggle');
  if (!AC) {
    soundBtn.disabled = true;
    soundBtn.querySelector('b').textContent = 'N/D';
  } else {
    soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      if (soundOn && !ctx) initAudio();
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      soundBtn.querySelector('b').textContent = soundOn ? 'ON' : 'OFF';
      root.classList.toggle('is-sound', soundOn);
      const go = () => {
        audioParam('vol');
        if (soundOn) playPedal(pedals[active] ? pedals[active].dataset.fx : 'fuzz');
      };
      if (ctx.state === 'suspended') ctx.resume().then(go, go);
      else go();
    });
  }

  /* ---------------------------------------------------------------- bypass */
  document.getElementById('bypass').addEventListener('click', () => {
    ['drive', 'tone', 'mix', 'glitch', 'wah'].forEach((n) => setParam(n, 0));
  });

  /* ---------------------------------------------------------------- glitch bursts */
  function burst() {
    root.style.setProperty('--gx', ((Math.random() * 2 - 1) * (4 + P.glitch * 18)).toFixed(1));
    root.classList.add('is-glitch');
    setTimeout(() => {
      root.classList.remove('is-glitch');
      root.style.setProperty('--gx', '0');
    }, 90 + Math.random() * 170);
  }
  (function scheduleGlitch() {
    setTimeout(() => {
      if (!reduced() && !document.hidden && Math.random() < P.glitch * 1.4) burst();
      scheduleGlitch();
    }, 450 + Math.random() * 1600 * (1.15 - P.glitch));
  })();

  /* ---------------------------------------------------------------- pedals + panels */
  const pedals = $$('.pedal');
  const panels = pedals.map((p) => document.getElementById(p.dataset.target));
  const ids = panels.map((s) => s.id);
  const names = pedals.map((p) => p.querySelector('.pedal__name').textContent.trim());
  const rack = document.getElementById('rack');
  const amp = document.getElementById('amp');
  const signal = document.getElementById('signal');
  const navLinks = $$('.amp__nav a');
  const tunerNote = document.getElementById('tuner-note');
  const tunerBar = document.getElementById('tuner-bar');
  const ytFacades = new WeakMap();
  let active = -1;

  function retrigger(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // restart CSS animation
    el.classList.add(cls);
  }

  function renderSignal() {
    signal.textContent = '';
    signal.append('IN ▸ ');
    names.forEach((n, i) => {
      const node = i === active ? document.createElement('b') : document.createTextNode(n);
      if (i === active) node.textContent = n;
      signal.append(node, i < names.length - 1 ? ' ▸ ' : '');
    });
    signal.append(' ▸ AMP');
  }

  function engage(i, opts = {}) {
    const { sound = true, scroll = false, focus = false, anim = true } = opts;
    const p = pedals[i];
    if (!p) return;

    if (anim) {
      retrigger(p, 'is-stomp');
      retrigger(amp, 'is-thump');
      kickCables(i);
    }
    if (sound) playPedal(p.dataset.fx);

    tunerNote.textContent = p.dataset.note;
    tunerBar.style.setProperty('--tc', String(Math.round(Math.random() * 30 - 15)));
    setTimeout(() => tunerBar.style.setProperty('--tc', '0'), 260);

    if (i !== active) {
      if (active >= 0) resetVideos(panels[active]);
      pedals.forEach((q, j) => {
        q.classList.toggle('is-on', j === i);
        q.querySelector('.footswitch').setAttribute('aria-pressed', String(j === i));
      });
      panels.forEach((s, j) => {
        const on = j === i;
        s.classList.toggle('is-active', on);
        s.hidden = !on;
      });
      navLinks.forEach((a) => {
        if (a.hash === `#${ids[i]}`) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
      active = i;
      renderSignal();
      if (anim && history.replaceState) history.replaceState(null, '', `#${ids[i]}`);
      if (ids[i] === 'shows') settleTuner();
    }

    if (focus) panels[i].focus({ preventScroll: true });
    if (scroll) rack.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  pedals.forEach((p, i) => {
    p.addEventListener('click', (e) => {
      if (e.target.closest('[data-param]')) return;
      engage(i);
      // only pull the panel into view when it is (almost) entirely below the fold
      const r = rack.getBoundingClientRect();
      if (r.top > window.innerHeight - 80) {
        rack.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }
    });
  });

  $$('a[href^="#"]').forEach((a) => {
    const idx = ids.indexOf(a.hash.slice(1));
    if (idx < 0) return;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      engage(idx, { scroll: true, focus: true });
    });
  });

  document.getElementById('prev-pedal').addEventListener('click', () => engage((active - 1 + pedals.length) % pedals.length));
  document.getElementById('next-pedal').addEventListener('click', () => engage((active + 1) % pedals.length));

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], [role="slider"]')) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= pedals.length) {
      e.preventDefault();
      engage(n - 1, { scroll: true });
    }
  });

  window.addEventListener('hashchange', () => {
    const idx = ids.indexOf(location.hash.slice(1));
    if (idx >= 0 && idx !== active) engage(idx, { sound: false, scroll: true });
  });

  /* ---------------------------------------------------------------- video facades */
  $$('.yt').forEach((box) => {
    const btn = box.querySelector('.yt__btn');
    ytFacades.set(box, btn);
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube.com/embed/${box.dataset.yt}?autoplay=1&rel=0`;
      f.title = box.dataset.title;
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      box.replaceChildren(f);
      box.classList.add('is-playing');
    });
  });
  function resetVideos(panel) {
    $$('.yt.is-playing', panel).forEach((box) => {
      box.replaceChildren(ytFacades.get(box));
      box.classList.remove('is-playing');
    });
  }

  /* ---------------------------------------------------------------- shows: status + tuner */
  const statusEl = document.getElementById('next-status');
  const nextGig = document.getElementById('next-gig');
  const heroWhen = document.getElementById('hero-when');
  (function gigStatus() {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const date = statusEl.dataset.date;
    if (today === date) {
      statusEl.textContent = 'HOJE!!!';
      nextGig.classList.add('is-today');
      nextGig.dataset.read = 'É HOJE · COLA';
      heroWhen.textContent = 'HOJE';
    } else if (today > date) {
      statusEl.textContent = 'PASSADO';
      nextGig.classList.remove('is-next');
      nextGig.classList.add('is-past');
      nextGig.dataset.cents = '-8';
      nextGig.dataset.read = 'VALEU, 2026';
    }
  })();

  const tunerBig = document.getElementById('tuner-big');
  const tunerBigNote = document.getElementById('tuner-big-note');
  const tunerBigRead = document.getElementById('tuner-big-read');
  const gigs = $$('.gig');
  function pointTuner(li) {
    tunerBig.style.setProperty('--cents', li.dataset.cents);
    tunerBigNote.textContent = li.dataset.note;
    tunerBigRead.textContent = li.dataset.read;
  }
  function settleTuner() {
    tunerBig.style.setProperty('--cents', '-50');
    requestAnimationFrame(() => requestAnimationFrame(() => pointTuner(nextGig)));
  }
  gigs.forEach((li) => {
    li.addEventListener('pointerenter', () => pointTuner(li));
    li.addEventListener('focusin', () => pointTuner(li));
    li.addEventListener('pointerleave', () => pointTuner(nextGig));
  });

  /* ---------------------------------------------------------------- cables */
  const SVGNS = 'http://www.w3.org/2000/svg';
  const board = document.getElementById('board');
  const svg = document.getElementById('cables');
  const COLORS = ['#F2A900', '#1B3BFF', '#FF2BD6', '#c8ff4d', '#efe6d2', '#F2A900'];
  const cables = COLORS.map((color, i) => {
    const g = document.createElementNS(SVGNS, 'g');
    const mk = (cls) => {
      const el = document.createElementNS(SVGNS, 'path');
      el.setAttribute('class', cls);
      g.appendChild(el);
      return el;
    };
    const outer = mk('c-outer');
    const inner = mk('c-inner');
    inner.style.stroke = color;
    const hi = mk('c-hi');
    svg.appendChild(g);
    return { outer, inner, hi, a: null, b: null, kick: 0, phase: i * 1.7 };
  });

  function jackPoint(p, side) {
    const j = p.querySelector(side === 'l' ? '.jack--l' : '.jack--r');
    return {
      x: p.offsetLeft + j.offsetLeft + (side === 'r' ? j.offsetWidth : 0),
      y: p.offsetTop + j.offsetTop + j.offsetHeight / 2,
    };
  }

  function layoutCables() {
    if (!pedals.length) return;
    const W = board.clientWidth;
    const first = jackPoint(pedals[0], 'l');
    const last = jackPoint(pedals[pedals.length - 1], 'r');
    cables[0].a = { x: -30, y: first.y + 70 };
    cables[0].b = first;
    for (let i = 1; i < pedals.length; i++) {
      cables[i].a = jackPoint(pedals[i - 1], 'r');
      cables[i].b = jackPoint(pedals[i], 'l');
    }
    cables[pedals.length].a = last;
    cables[pedals.length].b = { x: W + 30, y: last.y + 70 };
    drawCables(performance.now(), true);
  }

  function drawCables(t, still) {
    cables.forEach((c) => {
      if (!c.a || !c.b) return;
      const { a, b } = c;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const hx = Math.min(120, Math.max(28, Math.abs(dx) * 0.35));
      const w = still ? 0 : Math.sin(t * 0.0016 + c.phase) * (Math.min(1.6, c.kick) + c.kick) + Math.sin(t * 0.0043 + c.phase * 2) * c.kick * 0.5;
      const wx = still ? 0 : Math.cos(t * 0.0012 + c.phase) * (Math.min(1, c.kick) + c.kick * 0.6);
      const sag = 22 + dist * 0.16 + Math.max(0, dy) * 0.25 + w;
      const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${(a.x + hx + wx).toFixed(1)} ${(a.y + sag).toFixed(1)} ${(b.x - hx - wx).toFixed(1)} ${(b.y + sag - Math.max(0, dy) * 0.4).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
      c.outer.setAttribute('d', d);
      c.inner.setAttribute('d', d);
      c.hi.setAttribute('d', d);
    });
  }

  function kickCables(i) {
    // pedal i sits between cable i (its input) and cable i+1 (its output)
    cables.forEach((c, k) => {
      const near = k === i || k === i + 1 ? 22 : (k === i - 1 || k === i + 2 ? 8 : 2);
      c.kick = Math.min(40, c.kick + near);
    });
    if (!reduced()) wake();
  }

  let boardVisible = true;
  let running = false;
  let last = 0;
  function wake() {
    if (running || !boardVisible || document.hidden) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { boardVisible = entries[0].isIntersecting; wake(); }).observe(board);
  }
  document.addEventListener('visibilitychange', wake);
  if ('ResizeObserver' in window) new ResizeObserver(layoutCables).observe(board);
  window.addEventListener('resize', layoutCables);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutCables);

  /* ---------------------------------------------------------------- cable wobble loop: runs only while a stomp kick decays */
  function tick(t) {
    const dt = Math.min(64, t - last);
    last = t;
    if (reduced() || !boardVisible || document.hidden) {
      cables.forEach((c) => { c.kick = 0; });
      drawCables(t, true);
      running = false;
      return;
    }
    const decay = Math.pow(0.94, dt / 16.7);
    let alive = false;
    cables.forEach((c) => { c.kick *= decay; if (c.kick > 0.05) alive = true; else c.kick = 0; });
    if (!alive) {
      drawCables(t, true);
      running = false;
      return;
    }
    drawCables(t, false);
    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------------------- boot */
  applyFx();
  layoutCables();
  const startIdx = ids.indexOf(location.hash.slice(1));
  engage(startIdx >= 0 ? startIdx : 0, { sound: false, anim: false });
  if (startIdx >= 0) rack.scrollIntoView({ behavior: 'auto', block: 'start' });
})();
