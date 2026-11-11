/* HORNEY — 14 · LAN HOUSE — Internet Explorer: barra de endereço, histórico, favoritos e os sites internos
   (Horkut, horney.band/shows, Fotolog, YouTube 2006, MercadoLivre, página de erro). */
(() => {
  'use strict';
  const LH = window.LH;
  if (!LH) return;
  const { $, $$, el, H } = LH;
  const pad = (n) => String(n).padStart(2, '0');
  const NS = 'http://www.w3.org/2000/svg';

  const ieWin = $('#win-ie');
  const view = $('#ie-view');
  const urlInput = $('#ie-url');
  const backBtn = $('#ie-back');
  const fwdBtn = $('#ie-fwd');
  const statusEl = $('#ie-status');
  const prog = $('#ie-prog');
  const throb = $('#ie-throb');
  const HOME = 'www.horkut.com.br/horney';
  const SHOWS_URL = 'www.horney.band/shows';
  const FOTOLOG = 'www.fotolog.com.br/horney';
  const YT = 'www.youtube.com/horney';
  const ML = 'www.mercadolivre.com.br/horney-merch';

  const SITES = {
    [HOME]: { tpl: 'tpl-horkut', title: 'horkut — HORNEY', init: initHorkut },
    [SHOWS_URL]: { tpl: 'tpl-shows', title: 'HORNEY · shows', init: initShows },
    [FOTOLOG]: { tpl: 'tpl-fotolog', title: 'fotolog.com.br/horney', init: initFotolog },
    [YT]: { tpl: 'tpl-youtube', title: 'YouTube — bandaHorney', init: initYoutube },
    [ML]: { tpl: 'tpl-ml', title: 'MercadoLivre — HORNEY merch', init: null }
  };
  const ALIASES = {
    'horkut': HOME, 'orkut': HOME, 'horney': HOME, 'www.horkut.com.br': HOME, 'www.orkut.com': HOME,
    'www.orkut.com/horney': HOME, 'www.orkut.com.br': HOME, 'www.orkut.com.br/horney': HOME,
    'shows': SHOWS_URL, 'www.horney.band': SHOWS_URL,
    'fotolog': FOTOLOG, 'fotos': FOTOLOG, 'www.fotolog.com.br': FOTOLOG, 'www.fotolog.com/horney': FOTOLOG,
    'youtube': YT, 'videos': YT, 'www.youtube.com': YT, 'www.youtube.com/@bandahorney': YT, 'www.youtube.com/bandahorney': YT,
    'mercadolivre': ML, 'merch': ML, 'www.mercadolivre.com.br': ML
  };

  function norm(raw) {
    let u = String(raw == null ? '' : raw).trim().toLowerCase();
    u = u.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\s+/g, '');
    if (!u) return HOME;
    if (ALIASES[u]) return ALIASES[u];
    if (!u.startsWith('www.') && /^[a-z0-9-]+\.[a-z]/.test(u)) {
      const w = 'www.' + u;
      if (ALIASES[w]) return ALIASES[w];
      if (SITES[w]) return w;
    }
    return u.slice(0, 200);
  }

  /* ================= Navigation ================= */
  const hist = [];
  let idx = -1;
  let cleanups = [];
  let loadT = 0;
  let pending = false;

  function cleanup() {
    cleanups.forEach((fn) => fn());
    cleanups = [];
  }

  function navigate(raw) {
    const u = norm(raw);
    hist.splice(idx + 1);
    hist.push(u);
    idx = hist.length - 1;
    render(u);
  }

  function render(u) {
    cleanup();
    const site = SITES[u];
    const tpl = $('#' + (site ? site.tpl : 'tpl-404'));
    const frag = tpl.content.cloneNode(true);
    const page = frag.firstElementChild;
    view.replaceChildren(frag);
    view.scrollTop = 0;
    LH.paintNick();
    if (site && site.init) site.init(page);
    if (!site) init404(page, u);
    urlInput.value = 'http://' + u;
    const title = site ? site.title : 'A página não pode ser exibida';
    $('#t-ie').textContent = title + ' — Microsoft Internet Explorer';
    LH.setWinTitle('win-ie', title);
    backBtn.disabled = idx <= 0;
    fwdBtn.disabled = idx >= hist.length - 1;
    if (site) LH.store.set('url', u);
    loading(u, !!site);
    LH.announce('Página carregada: ' + title);
  }

  function loading(u, ok) {
    clearTimeout(loadT);
    const done = () => {
      throb.classList.remove('is-loading');
      prog.classList.remove('is-run');
      statusEl.textContent = ok ? 'Concluído' : 'Concluído, mas com erros na página.';
    };
    statusEl.textContent = 'Abrindo página http://' + u + '…';
    if (LH.reduced()) { done(); return; }
    throb.classList.add('is-loading');
    prog.classList.remove('is-run');
    void prog.offsetWidth;
    prog.classList.add('is-run');
    loadT = setTimeout(done, 520);
  }

  function goBack() { if (idx > 0) { idx--; render(hist[idx]); } }
  function goFwd() { if (idx < hist.length - 1) { idx++; render(hist[idx]); } }

  backBtn.addEventListener('click', goBack);
  fwdBtn.addEventListener('click', goFwd);
  $('#ie-reload').addEventListener('click', () => { if (idx >= 0) render(hist[idx]); else navigate(HOME); });
  $('#ie-home').addEventListener('click', () => navigate(HOME));
  $('#ie-form').addEventListener('submit', (e) => {
    e.preventDefault();
    navigate(urlInput.value);
    view.focus({ preventScroll: true });
  });
  urlInput.addEventListener('focus', () => urlInput.select());

  ieWin.addEventListener('win:open', () => {
    if (pending) return;
    navigate(LH.store.get('url', HOME) || HOME);
  });
  ieWin.addEventListener('win:close', () => {
    cleanup();
    clearTimeout(loadT);
    view.replaceChildren();
    hist.length = 0;
    idx = -1;
  });

  LH.browse = (raw, opener, opts = {}) => {
    pending = true;
    LH.openWin('win-ie', opener, { focus: opts.focus });
    pending = false;
    navigate(raw);
  };

  /* Status bar shows where links go; in-page jumps (Horkut menu). */
  function describe(t) {
    if (t.dataset.url != null) return 'http://' + norm(t.dataset.url);
    if (t.dataset.chat) return 'msn: abrir conversa (' + t.dataset.chat + ')';
    if (t.dataset.play != null) return 'horneyamp: tocar ANTI-RASO';
    if (t.dataset.open) return 'executar: ' + t.dataset.open.replace('win-', '') + '.exe';
    if (t.dataset.jump) return 'http://' + (hist[idx] || HOME) + '#' + t.dataset.jump;
    return t.href || '';
  }
  const LINKISH = '[data-url],[data-chat],[data-play],[data-open],[data-jump],a[href]';
  function hover(e) {
    const t = e.target.closest(LINKISH);
    if (t && view.contains(t)) statusEl.textContent = describe(t);
  }
  function unhover(e) {
    const t = e.target.closest(LINKISH);
    if (t && !t.contains(e.relatedTarget) && !throb.classList.contains('is-loading')) statusEl.textContent = 'Concluído';
  }
  view.addEventListener('mouseover', hover);
  view.addEventListener('focusin', hover);
  view.addEventListener('mouseout', unhover);
  view.addEventListener('focusout', unhover);
  view.addEventListener('click', (e) => {
    const j = e.target.closest('[data-jump]');
    if (!j) return;
    const target = view.querySelector('#' + j.dataset.jump);
    if (!target) return;
    const top = view.scrollTop + target.getBoundingClientRect().top - view.getBoundingClientRect().top - 8;
    view.scrollTo({ top, behavior: LH.reduced() ? 'auto' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ================= Fan wall boards (Horney.mural) ================= */
  function initial(name) {
    const c = Array.from(String(name).trim())[0] || '?';
    return c.toUpperCase();
  }
  function scrapItem(m, isNew) {
    const li = el('li', 'scrap' + (isNew ? ' is-new' : ''));
    const av = el('span', 'scrap__av', initial(m.name));
    av.setAttribute('aria-hidden', 'true');
    const body = el('div');
    const who = el('p', 'scrap__who');
    who.append(el('b', null, m.name));
    const t = el('time', null, LH.fmtWhen(m.at));
    t.dateTime = m.at;
    who.append(t);
    if (m.seed) {
      const s = el('span', 'scrap__seed', 'exemplo');
      s.title = 'recado de exemplo que já vem com o site';
      who.append(s);
    }
    body.append(who, el('p', 'scrap__text', m.text));
    li.append(av, body);
    return li;
  }

  function wireBoard(board, page) {
    const channel = board.dataset.channel;
    const noun = board.dataset.noun || 'recado';
    const form = $('.board__form', board);
    const ta = $('.board__text', board);
    const msg = $('.board__msg', board);
    const list = $('.board__list', board);
    const more = $('.board__more', board);
    const counts = $$('.js-count-' + channel, page);
    let limit = 8;
    const mine = new Set();

    if (!H) {
      $$('textarea, button', form).forEach((n) => { n.disabled = true; });
      msg.textContent = 'o mural tá fora do ar nesta máquina (o módulo do mural não carregou). Recarrega a página.';
      list.replaceChildren(el('li', 'board__empty', 'sem conexão com o mural agora.'));
      counts.forEach((c) => { c.textContent = '0'; });
      return;
    }

    function paint(all) {
      const items = all.filter((m) => m.channel === channel);
      counts.forEach((c) => { c.textContent = String(items.length); });
      if (!items.length) {
        list.replaceChildren(el('li', 'board__empty', 'nenhum ' + noun + ' ainda. seja o primeiro!'));
        more.hidden = true;
        return;
      }
      list.replaceChildren(...items.slice(0, limit).map((m) => scrapItem(m, mine.has(m.id))));
      more.hidden = items.length <= limit;
    }
    function load() {
      H.mural.list({ channel }).then(paint).catch(() => {
        list.replaceChildren(el('li', 'board__empty', 'não deu pra carregar o mural agora.'));
      });
    }
    load();
    cleanups.push(H.mural.subscribe(paint));
    more.addEventListener('click', () => { limit += 10; load(); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.classList.remove('is-ok');
      msg.textContent = 'enviando…';
      H.mural.post({ name: LH.nick(), text: ta.value, channel }).then((m) => {
        mine.add(m.id);
        ta.value = '';
        msg.classList.add('is-ok');
        msg.textContent = noun + ' enviado! já tá no mural da HORNEY.';
        LH.sfx('msg');
      }).catch((err) => {
        msg.textContent = err && err.message ? err.message : 'não deu pra enviar agora. tenta de novo.';
        LH.sfx('error');
      });
    });
  }

  /* ================= Horkut ================= */
  function initHorkut(page) {
    $('.js-sorte', page).textContent = H ? H.oraculo.sorte() : 'o Olho tá offline nesta máquina. a sorte hoje é você mesmo(a).';
    $$('.board', page).forEach((b) => wireBoard(b, page));
  }

  /* ================= horney.band/shows ================= */
  const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const LABEL = { past: 'PASSADO', today: 'HOJE', next: 'PRÓXIMO' };
  function weekday(d) { return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(); }
  function dateBlock(d) {
    const box = el('div', 'show__date');
    box.setAttribute('aria-hidden', 'true');
    box.append(el('span', 'show__d', pad(d.getDate())), el('span', 'show__m', MONTHS[d.getMonth()]), el('span', 'show__wd', weekday(d)));
    return box;
  }
  function initShows(page) {
    const sorted = LH.SHOWS.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    $('.js-shows', page).replaceChildren(...sorted.map((s) => {
      const st = LH.showStatus(s);
      const d = LH.parseDate(s.date);
      const li = el('li', 'show is-' + st);
      const info = el('div');
      info.append(
        el('p', 'sr-only', d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ':'),
        el('p', 'show__title', s.title),
        el('p', 'show__where', s.where),
        el('p', 'show__blurb', s.blurb),
        LH.extLink(st === 'past' ? s.linkPast : s.linkNext, s.link, 'show__link')
      );
      li.append(dateBlock(d), info, el('span', 'show__st', LABEL[st]));
      return li;
    }));
    const box = $('.js-next', page);
    const next = LH.upcomingShows()[0];
    if (next) {
      const st = LH.showStatus(next);
      const d = LH.parseDate(next.date);
      const row = el('div', 'show is-' + st);
      const info = el('div');
      info.append(
        el('p', 'sr-only', d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ':'),
        el('p', 'show__title', next.title),
        el('p', 'show__where', next.where),
        el('p', 'show__blurb', 'SAI DE CASA E COLE NOS SHOWS!!! Local e ingressos saem primeiro nos stories.'),
        LH.extLink(next.linkNext, next.link, 'show__link')
      );
      row.append(dateBlock(d), info, el('span', 'show__st', LABEL[st]));
      box.replaceChildren(row);
    } else {
      box.replaceChildren(
        el('p', 'hb__none', 'sem shows marcados — cola no Instagram pra saber primeiro'),
        LH.extLink('@horney.band no Instagram ↗', 'https://www.instagram.com/horney.band/')
      );
    }
  }

  /* ================= Fotolog ================= */
  function initFotolog(page) {
    const P = LH.PHOTOS;
    const img = $('.js-photo', page);
    const cap = $('.js-cap', page);
    const count = $('.js-count', page);
    let i = 0;
    const thumbs = P.map((p, k) => {
      const li = el('li');
      const b = el('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ver foto ' + (k + 1) + ': ' + p.alt);
      const im = el('img');
      im.src = p.src;
      im.alt = '';
      im.width = p.w;
      im.height = p.h;
      im.loading = 'lazy';
      b.append(im);
      b.addEventListener('click', () => show(k));
      li.append(b);
      return b;
    });
    $('.js-thumbs', page).replaceChildren(...thumbs.map((b) => b.parentElement));
    function show(k) {
      i = (k + P.length) % P.length;
      const p = P[i];
      img.width = p.w;
      img.height = p.h;
      img.src = p.src;
      img.alt = p.alt;
      cap.textContent = p.alt;
      count.textContent = 'foto ' + (i + 1) + ' de ' + P.length;
      thumbs.forEach((b, n) => b.setAttribute('aria-current', String(n === i)));
    }
    $('.js-prev', page).addEventListener('click', () => show(i - 1));
    $('.js-next', page).addEventListener('click', () => show(i + 1));
    show(0);
    wireBoard($('.board', page), page);
  }

  /* ================= YouTube 2006 ================= */
  const VIDEOS = [
    { id: '9uP1P11at9M', title: 'HORNEY — Fool\'s Game (clipe oficial)', meta: 'clipe oficial (2022), dir. Rique Duarte', thumb: '../assets/yt-fools-game.jpg' },
    { id: 'V9Rpgtc2vTs', title: 'HORNEY ao vivo (clipe de 38s)', meta: 'ao vivo · 0:38 — 38 segundos de HORNEY ao vivo. Agora imagina inteiro, na tua frente.', thumb: '../assets/yt-live.jpg' }
  ];
  function playIcon() {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M7 4.5v15l12.5-7.5z');
    s.append(p);
    return s;
  }
  function thumbImg(v) {
    const im = el('img');
    im.src = v.thumb;
    im.alt = '';
    im.width = 1280;
    im.height = 720;
    im.loading = 'lazy';
    return im;
  }
  function initYoutube(page) {
    const player = $('.js-player', page);
    const title = $('.js-title', page);
    const meta = $('.js-meta', page);
    const res = $('.js-res', page);
    const items = VIDEOS.map((v, k) => {
      const li = el('li');
      const b = el('button');
      b.type = 'button';
      const t = el('span');
      t.append(el('b', null, v.title), el('small', null, v.meta));
      b.append(thumbImg(v), t);
      b.addEventListener('click', () => { select(k); player.querySelector('button').focus(); });
      li.append(b);
      return li;
    });
    $('.js-list', page).replaceChildren(...items);

    function facade(v) {
      const b = el('button', 'facade');
      b.type = 'button';
      b.setAttribute('aria-label', 'Assistir: ' + v.title);
      const play = el('span', 'facade__play');
      play.append(playIcon());
      b.append(thumbImg(v), play, el('span', 'facade__cap', '▶ PLAY · ' + v.title));
      b.addEventListener('click', () => {
        if (typeof LH.pauseMusic === 'function') LH.pauseMusic();
        const f = el('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0&playsinline=1';
        f.title = v.title;
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        player.replaceChildren(f);
        f.focus();
      });
      return b;
    }
    function select(k) {
      const v = VIDEOS[k];
      items.forEach((li, n) => li.firstChild.setAttribute('aria-pressed', String(n === k)));
      title.textContent = v.title;
      meta.textContent = v.meta;
      player.replaceChildren(facade(v));
    }
    $('.js-search', page).addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = $('.js-q', page).value.trim();
      const q = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let n = 0;
      items.forEach((li, k) => {
        const hay = (VIDEOS[k].title + ' ' + VIDEOS[k].meta).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const hit = !q || q.split(/\s+/).every((w) => hay.includes(w));
        li.hidden = !hit;
        if (hit) n++;
      });
      res.textContent = !raw ? '' : n ? n + ' resultado(s) pra “' + raw + '”' : 'nenhum vídeo da HORNEY pra “' + raw + '”. tenta “ao vivo” ou “fool”.';
    });
    select(0);
  }

  /* ================= Erro ================= */
  function init404(page, u) {
    $('.js-addr', page).textContent = 'http://' + u;
    const b = $('.js-back', page);
    if (idx <= 0) b.disabled = true;
    b.addEventListener('click', goBack);
  }
})();
