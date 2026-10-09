// HORNEY — 09 THE EYE
// UI (nav, reveals, facades, shows, depth HUD) runs without WebGL; the eye shader is layered on top
// via a dynamic import of three so a CDN/WebGL failure simply leaves the static fallback in place.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const root = document.documentElement;
let needsRender = true;
let gl = null;
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceMQ.matches;
root.classList.toggle('rm', reduced);
root.classList.add('js');
reduceMQ.addEventListener('change', (e) => {
  reduced = e.matches;
  root.classList.toggle('rm', reduced);
  revealAll();
  needsRender = true;
});

/* ------------------------------------------------------------------ nav */

const navToggle = $('#nav-toggle');
const nav = $('#site-nav');

function setMenu(open) {
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.querySelector('.nav-toggle-label').textContent = open ? 'FECHAR' : 'MENU';
  root.classList.toggle('menu-open', open);
}
navToggle.addEventListener('click', () => setMenu(navToggle.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    setMenu(false);
    blink();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && root.classList.contains('menu-open')) {
    setMenu(false);
    navToggle.focus();
  }
});
matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* --------------------------------------------------------------- reveals */

const reveals = $$('.reveal');
['.disco', '.merch', '.ig-grid', '.shows', '.socials'].forEach((sel) => {
  $$(`${sel} > .reveal, ${sel}.reveal`).forEach((el, i) => el.style.setProperty('--d', `${(i % 6) * 0.08}s`));
});

let revealIO = null;
function revealAll() {
  reveals.forEach((el) => el.classList.add('is-in'));
  revealIO?.disconnect();
}
if (reduced || !('IntersectionObserver' in window)) {
  revealAll();
} else {
  revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealIO.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  reveals.forEach((el) => revealIO.observe(el));
}

/* -------------------------------------------------------- video facades */

$$('.facade').forEach((btn) => {
  btn.addEventListener('click', () => {
    const frame = btn.parentElement;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
    iframe.title = btn.dataset.title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
    iframe.focus();
  });
});

/* --------------------------------------------- show status vs. today */

{
  const now = new Date();
  const today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  $$('.show[data-date]').forEach((li) => {
    const d = Number(li.dataset.date.replaceAll('-', ''));
    const tag = $('.show-status', li);
    li.classList.remove('is-past', 'is-today', 'is-next');
    if (d < today) { li.classList.add('is-past'); tag.textContent = 'JÁ ROLOU'; }
    else if (d === today) { li.classList.add('is-today'); tag.textContent = 'HOJE ⚡️'; }
    else { li.classList.add('is-next'); tag.textContent = 'PRÓXIMO'; }
  });
}

/* ------------------------------------------------- layers / scroll map */

const hero = $('#top');
const layers = $$('[data-layer]').map((el) => ({
  el,
  id: el.id,
  name: el.dataset.layer,
  depth: Number(el.dataset.depth),
  tint: el.dataset.tint.split(',').map((n) => Number(n) / 255),
  tintCss: el.dataset.tint,
  top: 0,
}));
const navLinks = $$('.site-nav ul a');
const hudDepth = $('#hud-depth');
const hudFill = $('#hud-fill');
const hudLayer = $('#hud-layer');

let heroRange = 1;
let docRange = 1;
let vh = innerHeight;

let measureQueued = false;
function measure() {
  measureQueued = false;
  vh = innerHeight;
  heroRange = Math.max(1, hero.offsetHeight - vh);
  docRange = Math.max(1, root.scrollHeight - vh);
  layers.forEach((l) => { l.top = l.el.getBoundingClientRect().top + scrollY; });
  scrollDirty = true;
  needsRender = true;
}
// batch resize/RO bursts into one layout read per frame
function queueMeasure() {
  if (measureQueued) return;
  measureQueued = true;
  requestAnimationFrame(measure);
}
let scrollDirty = true;
measure();
addEventListener('resize', queueMeasure);
addEventListener('load', queueMeasure);
if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(document.body);
// --dive is scoped to the two elements that use it, so writing it does not restyle the whole document
const diveTargets = [$('.stage'), $('.hero-ui')].filter(Boolean);

const scroll = {
  y: 0, lastY: scrollY, vel: 0,
  dive: 0, depth: 0, sectionFade: 0,
  current: 0,
};
let lastDiveCss = -1;
let lastDepthText = '';
let lastLayer = -1;
let lastFill = '';

function readScroll(dt) {
  const y = scrollY;
  if (!scrollDirty && y === scroll.lastY) { scroll.vel = 0; return; }
  scrollDirty = false;
  scroll.vel = dt > 0 ? (y - scroll.lastY) / dt : 0;
  scroll.lastY = y;
  scroll.y = y;
  scroll.dive = clamp(y / (heroRange * 0.88));
  scroll.depth = clamp((y - heroRange) / Math.max(1, docRange - heroRange));
  scroll.sectionFade = clamp((y - heroRange * 0.88) / vh);

  // current layer = last whose top passed the middle of the viewport
  const probe = y + vh * 0.5;
  let i = 0;
  for (let k = 0; k < layers.length; k++) if (probe >= layers[k].top) i = k;
  scroll.current = i;

  // depth readout interpolated between layer depths
  let meters;
  if (i === 0) {
    meters = layers[1] ? layers[1].depth * scroll.dive : 0;
  } else {
    const a = layers[i];
    const b = layers[i + 1];
    meters = b ? a.depth + (b.depth - a.depth) * clamp((probe - a.top) / Math.max(1, b.top - a.top)) : a.depth;
  }
  const text = String(Math.round(meters)).padStart(4, '0');
  if (text !== lastDepthText) { hudDepth.textContent = text; lastDepthText = text; }
  const fill = `scaleY(${clamp(y / docRange).toFixed(3)})`;
  if (fill !== lastFill) { hudFill.style.transform = fill; lastFill = fill; }

  if (i !== lastLayer) {
    lastLayer = i;
    hudLayer.textContent = layers[i].name;
    root.style.setProperty('--tint', layers[i].tintCss);
    navLinks.forEach((a) => {
      if (a.getAttribute('href') === `#${layers[i].id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  const diveCss = Math.round(scroll.dive * 1000) / 1000;
  if (diveCss !== lastDiveCss) {
    lastDiveCss = diveCss;
    diveTargets.forEach((el) => el.style.setProperty('--dive', String(diveCss)));
    root.classList.toggle('dived', diveCss > 0.42);
  }
}

/* --------------------------------------------------- eye behaviour input */

const input = {
  look: { x: 0, y: 0 },
  lastPointer: -1e9,
  lastTilt: -1e9,
  hover: 0,
  blinkStart: -1e9,
  nextBlink: performance.now() + 2200,
  nextSaccade: 0,
};

// vertical offset of the eye above screen centre, as a fraction of viewport height (shared with CSS fallback)
function eyeOffset() {
  return innerWidth / innerHeight < 1 ? 0.15 : 0.1;
}

function eyeScreenCenter() {
  return { x: innerWidth * 0.5, y: innerHeight * (0.5 - eyeOffset()) };
}

addEventListener('pointermove', (e) => {
  const c = eyeScreenCenter();
  input.look.x = clamp((e.clientX - c.x) / (innerWidth * 0.5), -1, 1);
  input.look.y = clamp((c.y - e.clientY) / (innerHeight * 0.5), -1, 1);
  input.lastPointer = performance.now();
}, { passive: true });

document.addEventListener('pointerover', (e) => {
  input.hover = e.target.closest('a, button') ? 1 : 0;
});

function onTilt(e) {
  if (e.gamma == null || e.beta == null) return;
  input.look.x = clamp(e.gamma / 28, -1, 1);
  input.look.y = clamp((50 - e.beta) / 28, -1, 1);
  input.lastTilt = performance.now();
}

const tiltBtn = $('#tilt-btn');
const needsTiltPermission = typeof DeviceOrientationEvent !== 'undefined'
  && typeof DeviceOrientationEvent.requestPermission === 'function';
if (needsTiltPermission) {
  if (matchMedia('(pointer: coarse)').matches) {
    tiltBtn.hidden = false;
    tiltBtn.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission()
        .then((state) => { if (state === 'granted') addEventListener('deviceorientation', onTilt); })
        .catch(() => {})
        .finally(() => { tiltBtn.hidden = true; });
    });
  }
} else {
  addEventListener('deviceorientation', onTilt);
}

function blink() {
  if (reduced) return;
  input.blinkStart = performance.now();
}
$('.hero-stage').addEventListener('click', (e) => {
  if (!e.target.closest('a, button')) blink();
});

/* --------------------------------------------------------------- WebGL */

const VERT = /* glsl */`
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */`
uniform float uTime;
uniform vec2  uRes;
uniform float uDpr;
uniform float uFit;
uniform vec2  uCenter;
uniform vec2  uLook;
uniform float uDilate;
uniform float uBlink;
uniform float uDive;
uniform float uDepth;
uniform vec3  uTint;
uniform float uFade;

const vec3 YEL    = vec3(0.949, 0.663, 0.0);
const vec3 YEL_HI = vec3(1.0, 0.824, 0.29);
const vec3 ORG    = vec3(0.72, 0.30, 0.0);
const vec3 INK    = vec3(0.016, 0.013, 0.010);
const vec3 SCL    = vec3(0.93, 0.90, 0.83);
const float TAU   = 6.2831853;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = r * p * 2.02 + 17.1;
    a *= 0.5;
  }
  return v;
}

// Log-polar fibre tunnel inside the pupil: scale-invariant, so zooming never runs out of detail.
vec3 tunnel(vec2 q, float screenDist) {
  float lq = log(max(length(q), 1e-4));
  float u = lq * 1.25 - uTime * 0.05 - uDepth * 9.0;
  float id = floor(u);
  float f = fract(u);
  float ring = smoothstep(0.0, 0.5, f) * smoothstep(1.0, 0.6, f);
  float ang = uTime * 0.015 + id * 0.4;
  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 qd = rot * (q / max(length(q), 1e-4));
  float fib = fbm(qd * 5.0 + vec2(id * 1.73, id * 0.91));
  float streak = pow(fib, 2.5) * ring;
  float spark = smoothstep(0.82, 0.95, noise(qd * 40.0 + id * 3.1)) * ring;
  float tb = smoothstep(-3.0, -0.4, log(max(screenDist, 1e-4)));
  return (uTint * streak * 1.25 + mix(uTint, vec3(1.0), 0.5) * spark * 0.45) * tb;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 s = (frag - 0.5 * uRes) / uRes.y * uFit - uCenter;

  // the dive: exponential dolly centred on the pupil
  float zoom = exp(4.3 * pow(uDive, 1.5));
  vec2 c = uLook * vec2(0.115, 0.045);
  vec2 p = c + (s - c) / zoom;
  float px = uFit / uRes.y / zoom;

  // background
  vec3 col = vec3(0.028, 0.024, 0.02);
  col += uTint * 0.04 * (1.0 - smoothstep(0.0, 1.2, length(s / uFit)));

  // ---- yellow sun disc (the O of HORNEY) with halftone falloff
  vec2 pd = p * vec2(0.97, 1.03);
  float rd = length(pd);
  vec2 ddir = pd / max(rd, 1e-5);
  float RD = 0.56 + (noise(ddir * 3.0 + uTime * 0.3) - 0.5) * 0.01;
  float discMask = 1.0 - smoothstep(RD - px * 1.5, RD + px * 1.5, rd);
  float glow = exp(-max(rd - RD, 0.0) * 7.0);
  col += YEL * glow * 0.26 * (1.0 - discMask);

  float shade = smoothstep(0.30, RD, rd);
  vec2 hp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * frag / (5.0 * uDpr);
  float dotD = length(fract(hp) - 0.5);
  float dotR = shade * 0.62 - 0.07;
  float ht = 1.0 - smoothstep(dotR - 0.06, dotR + 0.06, dotD);
  vec3 discCol = mix(YEL_HI, YEL, smoothstep(0.0, 0.45, rd));
  discCol = mix(discCol, ORG, ht * 0.9);
  discCol = mix(discCol, INK, smoothstep(RD - 0.014 - px, RD - 0.014, rd));
  col = mix(col, discCol, discMask);

  // ---- black hand-drawn sun rays
  vec2 ps = p * vec2(0.95, 1.05);
  float r = length(ps);
  vec2 dir = ps / max(r, 1e-5);
  float a = atan(ps.y, ps.x + 1e-6);
  float N = 15.0;
  float t = a / TAU * N + 0.25;
  float rid = mod(floor(t), N);
  float spike = pow(1.0 - abs(fract(t) - 0.5) * 2.0, 2.4);
  float jit = hash(vec2(rid, 7.3));
  float breathe = sin(uTime * 1.3 + rid * 1.7) * 0.012;
  float R = 0.335 + (0.105 + 0.06 * jit + breathe) * spike;
  R += (noise(dir * 7.0 + p * 4.0 + uTime * 0.2) - 0.5) * 0.02;
  float sunMask = 1.0 - smoothstep(R - px * 1.5, R + px * 1.5, r);
  col = mix(col, INK, sunMask);

  // ---- the eye
  float W = 0.32;
  float open = clamp(1.0 - uBlink, 0.0, 1.0);
  float xn = clamp(p.x / W, -1.0, 1.0);
  float lid = 1.0 - xn * xn;
  float h = (p.y > 0.0 ? 0.172 : 0.128) * lid * open;
  float e = abs(p.y) - h;
  float xcap = 1.0 - smoothstep(W, W + px * 2.0, abs(p.x));
  float eyeMask = (1.0 - smoothstep(-px * 1.2, px * 1.2, e)) * xcap * smoothstep(0.0, 0.08, open);

  // closed-lid line while blinking
  float closed = smoothstep(0.55, 0.95, uBlink);
  float lidLine = (1.0 - smoothstep(0.007, 0.007 + px * 1.5, abs(p.y + 0.02 * lid))) * xcap * closed;
  col = mix(col, YEL, lidLine);

  if (eyeMask > 0.0) {
    vec2 ip = p - c;
    float ir = length(ip);
    float Ri = 0.118;
    float Rp = mix(0.04, 0.092, uDilate);

    // sclera, darker towards the corners
    vec3 inner = SCL * (0.72 + 0.28 * lid);
    inner = mix(inner, vec3(0.86, 0.6, 0.55), 0.12 * xn * xn);

    // iris fibres
    if (ir > Rp - px * 2.0 && ir < Ri + 0.01) {
      vec2 idir = ip / max(ir, 1e-5);
      float rr = clamp((ir - Rp) / (Ri - Rp), 0.0, 1.0);
      float fib = fbm(idir * (9.0 + rr * 1.8) + vec2(uTime * 0.02, 3.0));
      float fib2 = noise(idir * 46.0 + rr * 2.0);
      vec3 iris = mix(ORG * 0.5, YEL, smoothstep(0.3, 0.75, fib));
      iris = mix(iris, YEL_HI, smoothstep(0.55, 0.95, fib2) * 0.55 * (1.0 - rr));
      float cr = (rr - 0.25) * 7.0;
      iris += YEL_HI * 0.4 * exp(-cr * cr) * fib;
      iris *= mix(1.0, 0.18, smoothstep(0.72, 1.0, rr));
      iris *= mix(0.45, 1.0, smoothstep(0.0, 0.14, rr));
      float irisMask = 1.0 - smoothstep(Ri - px * 1.5, Ri + px * 1.5, ir);
      inner = mix(inner, iris, irisMask);
    }

    // pupil: the way in
    if (ir < Rp + px * 2.0) {
      float pupilMask = 1.0 - smoothstep(Rp - px * 1.5, Rp + px * 1.5, ir);
      vec3 deep = INK + tunnel(ip / Rp, ir * zoom / uFit) * mix(0.35, 1.0, uDive);
      inner = mix(inner, deep, pupilMask);
    }

    // lid shadow (stronger from the upper lid)
    inner *= 1.0 - (p.y > 0.0 ? 0.5 : 0.25) * smoothstep(-0.05, 0.0, e) * open;

    // specular dot, fades out before it would balloon during the dive
    float hl = 1.0 - smoothstep(0.017 - px, 0.017 + px, length(p - c - vec2(-0.042, 0.04)));
    inner = mix(inner, vec3(1.0, 0.98, 0.94), hl * 0.95 * (1.0 - smoothstep(0.08, 0.4, uDive)));

    col = mix(col, inner, eyeMask);
  }

  col *= uFade;
  col += (hash(frag + fract(uTime * 7.0) * 113.0) - 0.5) * 0.05;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

async function initGL() {
  const canvas = $('#eye-gl');
  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) return null;
  probe.getExtension('WEBGL_lose_context')?.loseContext();

  let THREE;
  try {
    THREE = await import('three');
  } catch {
    return null;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'low-power' });
  } catch {
    return null;
  }

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uFit: { value: 1.55 },
    uCenter: { value: new THREE.Vector2(0, 0.1) },
    uLook: { value: new THREE.Vector2(0, 0) },
    uDilate: { value: 0.3 },
    uBlink: { value: 0 },
    uDive: { value: 0 },
    uDepth: { value: 0 },
    uTint: { value: new THREE.Vector3(0.949, 0.663, 0) },
    uFade: { value: 1 },
  };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  // the shader is full-viewport: render at CSS-pixel density at most (Retina DPR 2 would be 4x the fragments)
  let dprCap = 1;
  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w < 820 ? Math.min(0.85, dprCap) : dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(uniforms.uRes.value);
    uniforms.uDpr.value = dpr;
    const aspect = w / h;
    const fit = Math.max(1.85, 1.42 / aspect);
    uniforms.uFit.value = fit;
    uniforms.uCenter.value.set(0, eyeOffset() * fit);
    needsRender = true;
  }
  resize();
  addEventListener('resize', resize);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    root.classList.remove('gl-on');
    gl = null;
  });

  // smoothed state
  const sm = { dive: 0, lx: 0, ly: 0, dil: 0.3, tint: [0.949, 0.663, 0], fade: 1 };
  let time = 0;
  let slowFrames = 0;
  const target = { x: 0, y: 0 };

  function render(dt, now) {
    // adaptive resolution: if we keep missing frames, drop the pixel ratio a notch
    if (!reduced) {
      slowFrames = dt > 0.045 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 30 && dprCap > 0.6) { dprCap -= 0.15; slowFrames = 0; resize(); }
    }

    const tintTarget = layers[scroll.current].tint;

    if (reduced) {
      // one static, calm frame; only re-render when the page state changes
      const fade = 1 - scroll.dive * 0.9 - scroll.sectionFade * 0.05;
      let changed = needsRender || Math.abs(fade - sm.fade) > 0.002;
      for (let k = 0; k < 3; k++) if (Math.abs(sm.tint[k] - tintTarget[k]) > 0.002) changed = true;
      if (!changed) return;
      sm.fade = fade;
      sm.tint = tintTarget.slice();
      uniforms.uTime.value = 12.0;
      uniforms.uDive.value = 0;
      uniforms.uDepth.value = 0;
      uniforms.uLook.value.set(0, 0);
      uniforms.uDilate.value = 0.35;
      uniforms.uBlink.value = 0;
      uniforms.uTint.value.set(sm.tint[0], sm.tint[1], sm.tint[2]);
      uniforms.uFade.value = clamp(fade, 0.08, 1);
      renderer.render(scene, camera);
      needsRender = false;
      return;
    }

    time += dt;

    // gaze: pointer / tilt, otherwise idle saccades
    const active = Math.max(input.lastPointer, input.lastTilt);
    let lookRate = 9;
    if (now - active < 2600) {
      target.x = input.look.x;
      target.y = input.look.y;
    } else if (now > input.nextSaccade) {
      target.x = (Math.random() * 2 - 1) * 0.8;
      target.y = (Math.random() * 2 - 1) * 0.55;
      input.nextSaccade = now + 700 + Math.random() * 2600;
    }
    if (now - active >= 2600) lookRate = 22;
    sm.lx += (target.x - sm.lx) * damp(lookRate, dt);
    sm.ly += (target.y - sm.ly) * damp(lookRate, dt);

    sm.dive += (scroll.dive - sm.dive) * damp(7, dt);

    // pupil: hover excites, scroll speed dilates, diving opens it all the way, plus hippus
    const speed = Math.min(1, Math.abs(scroll.vel) / 2500);
    const dilTarget = clamp(0.28 + input.hover * 0.42 + speed * 0.35 + Math.sin(time * 1.7) * Math.sin(time * 0.63) * 0.05);
    sm.dil += (dilTarget - sm.dil) * damp(input.hover ? 5 : 3, dt);

    // blink
    if (now > input.nextBlink) {
      blink();
      input.nextBlink = now + 2800 + Math.random() * 4500;
      if (Math.random() < 0.15) setTimeout(blink, 260);
    }
    const bt = (now - input.blinkStart) / 170;
    const blinkVal = bt >= 0 && bt <= 1 ? Math.sin(Math.PI * bt) : 0;

    for (let k = 0; k < 3; k++) sm.tint[k] += (tintTarget[k] - sm.tint[k]) * damp(2.2, dt);
    const fade = 1 - scroll.sectionFade * 0.3;
    sm.fade += (fade - sm.fade) * damp(6, dt);

    const lookScale = 1 - sm.dive * 0.85;
    uniforms.uTime.value = time;
    uniforms.uDive.value = sm.dive;
    uniforms.uDepth.value = scroll.depth;
    uniforms.uLook.value.set(sm.lx * lookScale, sm.ly * lookScale);
    uniforms.uDilate.value = Math.max(sm.dil, smoothstep(0, 0.55, sm.dive));
    uniforms.uBlink.value = blinkVal * (1 - sm.dive);
    uniforms.uTint.value.set(sm.tint[0], sm.tint[1], sm.tint[2]);
    uniforms.uFade.value = sm.fade;
    renderer.render(scene, camera);
    needsRender = false;
  }

  return { render };
}

/* ------------------------------------------------------------------ loop */

// The eye animates continuously while the hero is on screen; once the page is scrolled into the
// content sections the dimmed eye only needs ~30fps, which frees the GPU for scrolling.
// The loop stops entirely while the tab is hidden.
let last = performance.now();
let lastGL = 0;
let running = false;
function frame(now) {
  if (document.hidden) { running = false; return; }
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  readScroll(dt);
  if (gl) {
    const inHero = scroll.y < heroRange + vh * 0.5;
    const minGap = inHero || Math.abs(scroll.vel) > 0 ? 0 : 1000 / 30 - 2;
    if (now - lastGL >= minGap) {
      gl.render(Math.min(0.05, (now - (lastGL || now)) / 1000), now);
      lastGL = now;
    }
  }
  requestAnimationFrame(frame);
}
function startLoop() {
  if (running || document.hidden) return;
  running = true;
  last = performance.now();
  lastGL = 0;
  scrollDirty = true;
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', startLoop);
startLoop();

initGL().then((api) => {
  gl = api;
  if (gl) root.classList.add('gl-on');
});
