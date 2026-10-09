// HORNEY — 01 REFRESH
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── Footer year ── */
  $('#year').textContent = String(new Date().getFullYear());

  /* ── Grain: render a 256px noise tile once (replaces live SVG feTurbulence) ── */
  const grain = $('.grain');
  if (grain) {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.random() < 0.5 ? 0 : Math.round(Math.random() * 255);
    }
    ctx.putImageData(img, 0, 0);
    grain.style.setProperty('--grain', `url(${c.toDataURL('image/png')})`);
  }
  const onVisibility = () => document.documentElement.classList.toggle('is-hidden', document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  /* ── Pause infinite animations while offscreen ── */
  const offscreen = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-off', !e.isIntersecting));
  });
  $$('.ticker, .ftr__eye').forEach((el) => offscreen.observe(el));

  /* ── Header: compact on scroll, logo hand-off from the hero wordmark ── */
  const hdr = $('#hdr');
  let scrolled = null;
  const onScroll = () => {
    const s = window.scrollY > 24;
    if (s !== scrolled) hdr.classList.toggle('is-scrolled', (scrolled = s));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  new IntersectionObserver(
    ([entry]) => hdr.classList.toggle('show-logo', !entry.isIntersecting),
    { rootMargin: '-80px 0px 0px 0px' }
  ).observe($('[data-hero-logo]'));

  /* ── Mobile menu ── */
  const burger = $('#burger');
  const nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) $('a', nav).focus();
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      burger.focus();
    }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ── Scrollspy: highlight the nav item of the section in the middle of the viewport ── */
  const spyLinks = $$('[data-spy]');
  const linkFor = new Map(spyLinks.map((a) => [a.dataset.spy, a]));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        spyLinks.forEach((a) => a.removeAttribute('aria-current'));
        const link = linkFor.get(entry.target.id);
        if (link) link.setAttribute('aria-current', 'location');
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );
  ['top', ...linkFor.keys()].forEach((id) => spy.observe(document.getElementById(id)));

  /* ── Reveals ── */
  const revealables = $$('[data-reveal]');
  if (reduceMotion.matches) {
    revealables.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealables.forEach((el) => io.observe(el));
  }

  /* ── YouTube facades: load the iframe only on click; warm up connections on intent ── */
  let warmed = false;
  const warmUp = () => {
    if (warmed) return;
    warmed = true;
    ['https://www.youtube-nocookie.com', 'https://i.ytimg.com', 'https://www.google.com'].forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      document.head.append(link);
    });
  };
  $$('.facade').forEach((facade) => {
    const btn = $('.facade__btn', facade);
    btn.addEventListener('pointerenter', warmUp, { once: true });
    btn.addEventListener('focus', warmUp, { once: true });
    btn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${facade.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = facade.dataset.title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      facade.classList.add('is-playing');
      btn.replaceWith(iframe);
      iframe.focus();
    }, { once: true });
  });

  /* ── Shows: mark past / today / upcoming against the visitor's local date ── */
  const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let next = null;
  $$('.show').forEach((show) => {
    const date = show.dataset.date;
    const status = $('[data-status]', show);
    show.classList.remove('is-past', 'is-today', 'is-upcoming');
    if (date < todayIso) {
      show.classList.add('is-past');
      status.textContent = 'PASSADO';
    } else if (date === todayIso) {
      show.classList.add('is-today');
      status.textContent = 'HOJE';
    } else {
      show.classList.add('is-upcoming');
      status.textContent = 'PRÓXIMO';
    }
    if (date >= todayIso && (!next || date < next.dataset.date)) next = show;
  });

  const card = $('.card--next');
  const kicker = $('[data-next-kicker]', card);
  const bigDate = $('[data-next-date]', card);
  const text = $('[data-next-text]', card);
  if (next) {
    const [, m, d] = next.dataset.date.split('-');
    const isToday = next.dataset.date === todayIso;
    card.classList.toggle('is-live', isToday);
    kicker.textContent = isToday ? 'Hoje' : 'Próximo show';
    bigDate.textContent = `${d} ${MONTHS[Number(m) - 1]}`;
    text.textContent = next.dataset.blurb;
  } else {
    card.classList.remove('is-live');
    kicker.textContent = 'Agenda';
    bigDate.textContent = 'EM BREVE';
    text.textContent = 'Datas novas saem primeiro no Instagram. Segue lá pra não perder.';
  }
})();
