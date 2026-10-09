/* HORNEY — 05 · DARKROOM
   Progressive enhancement: the page is complete without this file.
   Motion (Lenis + GSAP) only runs when the CDN libraries loaded and the user allows motion. */
(() => {
  'use strict';
  window.__darkroom = true;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = Boolean(window.gsap && window.ScrollTrigger);
  const motion = root.classList.contains('motion') && !reduceMotion && hasGsap;
  if (!motion) root.classList.remove('motion');

  let lenis = null;

  /* ---------------------------------------------------------- safelight switch */
  const LIGHT_KEY = 'horney-darkroom-light';
  const toggle = document.getElementById('lightToggle');
  const toggleLabel = toggle.querySelector('.light-toggle__label');
  const status = document.getElementById('lightStatus');
  const flash = document.querySelector('.flash');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let switchTimer = 0;

  const renderLight = () => {
    const safe = root.dataset.light !== 'white';
    toggleLabel.textContent = safe ? 'Acender a luz' : 'Luz vermelha';
    toggle.title = safe
      ? 'Acender a luz branca: ver as fotos em cores reais'
      : 'Voltar para a luz vermelha de segurança';
    themeMeta.content = safe ? '#0b0302' : '#0c0b0a';
  };

  toggle.addEventListener('click', () => {
    const next = root.dataset.light === 'white' ? 'safe' : 'white';
    root.classList.add('is-switching');
    if (motion && next === 'white') {
      flash.classList.remove('go');
      void flash.offsetWidth; // restart the animation
      flash.classList.add('go');
    }
    root.dataset.light = next;
    renderLight();
    status.textContent = next === 'white'
      ? 'Luz branca acesa: fotos em cores reais.'
      : 'Luz vermelha de segurança: fotos em monocromo.';
    try { localStorage.setItem(LIGHT_KEY, next); } catch (e) { /* storage unavailable */ }
    clearTimeout(switchTimer);
    switchTimer = setTimeout(() => root.classList.remove('is-switching'), 1400);
  });
  renderLight();

  /* ---------------------------------------------------------- mobile menu */
  const menuBtn = document.querySelector('.menu-btn');
  const menuLabel = menuBtn.querySelector('.menu-btn__label');
  const nav = document.getElementById('site-nav');

  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuLabel.textContent = open ? 'Fechar' : 'Menu';
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) nav.querySelector('a').focus();
  };
  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
    if (e.matches && root.classList.contains('menu-open')) setMenu(false);
  });

  /* ---------------------------------------------------------- in-page anchors */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (hash.length < 2) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    e.preventDefault();
    if (root.classList.contains('menu-open')) setMenu(false);
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.8 });
    } else {
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }
    history.pushState(null, '', hash);
    target.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------- video facades */
  document.querySelectorAll('.facade').forEach((btn) => {
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${btn.dataset.yt}?autoplay=1&rel=0`;
      iframe.title = btn.dataset.title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ---------------------------------------------------------- show status by date */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  document.querySelectorAll('.show[data-date]').forEach((show) => {
    const [y, m, d] = show.dataset.date.split('-').map(Number);
    const day = new Date(y, m - 1, d).getTime();
    const label = show.querySelector('.show__status');
    show.classList.remove('is-past', 'is-today', 'is-next');
    if (day < today.getTime()) {
      show.classList.add('is-past');
      label.textContent = 'Passado';
    } else if (day === today.getTime()) {
      show.classList.add('is-today');
      label.textContent = 'Hoje ⚡️';
    } else {
      show.classList.add('is-next');
      label.textContent = 'Próximo';
    }
  });

  /* ---------------------------------------------------------- HUD: stage + timer, nav state */
  const hudStage = document.querySelector('.hud__stage');
  const hudTime = document.querySelector('.hud__time');
  const navLinks = [...document.querySelectorAll('.nav a')];
  const stages = [...document.querySelectorAll('section[data-stage]')];
  const TOTAL_SECONDS = 7 * 60; // a full print run: 7 minutes in the trays

  const stageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      hudStage.textContent = entry.target.dataset.stage;
      const id = entry.target.id;
      navLinks.forEach((a) => {
        if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  stages.forEach((s) => stageObserver.observe(s));

  let timerQueued = false;
  let scrollMax = 0;
  const measure = () => { scrollMax = document.documentElement.scrollHeight - window.innerHeight; };
  const renderTimer = () => {
    timerQueued = false;
    const p = scrollMax > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollMax)) : 0;
    const secs = Math.round(p * TOTAL_SECONDS);
    const text = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    if (hudTime.textContent !== text) hudTime.textContent = text;
  };
  window.addEventListener('scroll', () => {
    if (!timerQueued) { timerQueued = true; requestAnimationFrame(renderTimer); }
  }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('load', () => { measure(); renderTimer(); });
  measure();
  renderTimer();

  /* ---------------------------------------------------------- film grain: pre-render one static tile */
  try {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    root.style.setProperty('--grain-tile', `url(${c.toDataURL('image/png')})`);
  } catch (e) { /* no canvas: no grain */ }

  /* ---------------------------------------------------------- pause ambient loops when hidden / offscreen */
  document.addEventListener('visibilitychange', () => root.classList.toggle('is-hidden', document.hidden));
  const offObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-off', !entry.isIntersecting));
  });
  document.querySelectorAll('.hero, .lens, .varal, .foot, .show.is-next').forEach((el) => offObserver.observe(el));

  /* ---------------------------------------------------------- word split for rack-focus quote */
  const splitWords = (el) => {
    const text = el.textContent.trim();
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    text.split(/\s+/).forEach((word, i) => {
      if (i) visual.append(' ');
      const w = document.createElement('span');
      w.className = 'w';
      w.textContent = word;
      visual.append(w);
    });
    el.replaceChildren(sr, visual);
    return visual.querySelectorAll('.w');
  };

  if (!motion) return;

  /* ================================================================ MOTION */
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* Hero: the first print develops in the tray, the wordmark comes into focus. */
  const heroPrint = document.querySelector('.print--hero img');
  gsap.timeline({ delay: 0.25 })
    .fromTo(heroPrint, { opacity: 0 }, { opacity: 1, duration: 4.4, ease: 'power2.inOut' })
    .fromTo('.hero__title',
      { opacity: 0, filter: 'blur(22px)', scale: 1.05 },
      { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 2.6, ease: 'power3.out', clearProps: 'filter' }, 0.7)
    .fromTo('.hero [data-intro]',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 1.6, stagger: 0.18, ease: 'power3.out' }, 1.5);

  gsap.to('.hero__copy', {
    opacity: 0.15, y: -60, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  });

  /* Every other print develops (fades up on the paper) while it travels up the viewport. */
  gsap.utils.toArray('.print[data-develop] img').forEach((img) => {
    gsap.fromTo(img, { opacity: 0 }, {
      opacity: 1, ease: 'power1.in',
      scrollTrigger: { trigger: img.parentElement, start: 'top 95%', end: 'top 30%', scrub: 1.4 },
    });
  });

  /* Grease-pencil circle on the chosen frame. */
  gsap.fromTo('.grease path', { strokeDashoffset: 1 }, {
    strokeDashoffset: 0, ease: 'power2.inOut',
    scrollTrigger: { trigger: '.frame--pick', start: 'top 75%', end: 'top 35%', scrub: 1 },
  });

  /* Rack focus: type pulls into focus (opacity + scale, compositor-only) as it reaches mid-screen. */
  gsap.utils.toArray('.focus').forEach((el) => {
    gsap.fromTo(el, { opacity: 0.15, y: 30, scale: 1.04 }, {
      opacity: 1, y: 0, scale: 1, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 55%', scrub: 1 },
    });
  });

  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.1, y: 6 }, {
      opacity: 1, y: 0, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 1 },
    });
  });

  /* Ambient parallax. */
  gsap.utils.toArray('[data-speed]').forEach((el) => {
    const s = parseFloat(el.dataset.speed) || 0;
    gsap.fromTo(el, { yPercent: -s * 10 }, {
      yPercent: s * 10, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* The clothesline drifts sideways as the page moves (desktop layout only). */
  gsap.matchMedia().add('(min-width: 861px)', () => {
    gsap.fromTo('.varal__row', { xPercent: 4 }, {
      xPercent: -4, ease: 'none',
      scrollTrigger: { trigger: '.varal', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* Statement fragments drift up through the whole page. */
  gsap.utils.toArray('.drift span').forEach((span) => {
    const speed = parseFloat(span.dataset.drift) || 0.5;
    gsap.to(span, {
      y: () => -speed * window.innerHeight * 1.3, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 2, invalidateOnRefresh: true },
    });
  });

  /* Enlarger lamp follows a fine pointer. */
  if (window.matchMedia('(pointer: fine)').matches) {
    const lamp = document.querySelector('.lamp');
    const moveX = gsap.quickTo(lamp, 'x', { duration: 1.1, ease: 'power3' });
    const moveY = gsap.quickTo(lamp, 'y', { duration: 1.1, ease: 'power3' });
    gsap.set(lamp, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    window.addEventListener('pointermove', (e) => {
      moveX(e.clientX);
      moveY(e.clientY);
      lamp.classList.add('is-on');
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => lamp.classList.remove('is-on'));
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
