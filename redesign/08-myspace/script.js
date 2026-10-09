/* H◎RNEYspace — concept 08 · MySpace 2004 reboot. Vanilla JS, no dependencies. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = window.matchMedia('(pointer: fine)');

  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: keep it in memory only */ }
    }
  };

  /* ---------------- Toast ---------------- */
  var toastEl = $('#toast');
  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3200);
  }

  /* ---------------- Glitter cursor trail ---------------- */
  var canvas = $('#glitter');
  var ctx = canvas.getContext('2d');
  var parts = [];
  var MAX_PARTS = 140;
  var sparkColors = ['#ffcc00', '#ff6600', '#6698cb', '#ffffff'];
  var glitterOn = store.get('horney-myspace-glitter', true);
  var rafId = 0;
  var dpr = 1;

  function readSparkColors() {
    var raw = getComputedStyle(root).getPropertyValue('--spark').trim();
    if (raw) sparkColors = raw.split(',').map(function (c) { return c.trim(); }).filter(Boolean);
  }
  function sizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
  }
  function glitterAllowed() { return glitterOn && !reduceMQ.matches; }

  function spawn(x, y, vx, vy, size) {
    if (parts.length >= MAX_PARTS) parts.shift();
    parts.push({
      x: x, y: y,
      vx: vx, vy: vy,
      life: 1,
      decay: 0.016 + Math.random() * 0.02,
      size: size,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.2,
      color: sparkColors[(Math.random() * sparkColors.length) | 0]
    });
    if (!rafId) rafId = requestAnimationFrame(tick);
  }
  function star(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var rad = i % 2 === 0 ? r : r * 0.28;
      var a = (i * Math.PI) / 4;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function tick() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.06; p.vx *= 0.98;
      p.rot += p.spin;
      p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      star(p.x, p.y, p.size * (0.4 + p.life * 0.6), p.rot);
    }
    ctx.globalAlpha = 1;
    rafId = parts.length ? requestAnimationFrame(tick) : 0;
  }
  function burst(x, y, n) {
    if (!glitterAllowed()) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 1.5 + Math.random() * 3.5;
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 1.5, 4 + Math.random() * 6);
    }
  }
  function burstAt(el, n) {
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n || 24);
  }
  var lastX = 0, lastY = 0;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !fineMQ.matches || !glitterAllowed()) return;
    var dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    if (dist < 6) return;
    lastX = e.clientX; lastY = e.clientY;
    var count = dist > 40 ? 2 : 1;
    for (var i = 0; i < count; i++) {
      spawn(
        e.clientX + (Math.random() - 0.5) * 10,
        e.clientY + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 1.4,
        Math.random() * 0.6,
        3 + Math.random() * 5
      );
    }
  }, { passive: true });
  window.addEventListener('resize', sizeCanvas);
  sizeCanvas();

  /* Pause infinite CSS animations (shine, marquee, EQ, online ping) while offscreen. */
  if ('IntersectionObserver' in window) {
    var animIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-offscreen', !en.isIntersecting); });
    });
    $$('.network, .player__lcd, .profile, .blog').forEach(function (el) { animIO.observe(el); });
  }

  var glitterToggle = $('#glitter-toggle');
  var glitterNote = $('#glitter-note');
  function syncGlitterUI() {
    glitterToggle.checked = glitterOn && !reduceMQ.matches;
    glitterToggle.disabled = reduceMQ.matches;
    glitterNote.textContent = reduceMQ.matches
      ? '(desligado: você pediu menos movimento)'
      : (!fineMQ.matches ? '(aparece com mouse; nos botões também)' : '');
  }
  glitterToggle.addEventListener('change', function () {
    glitterOn = glitterToggle.checked;
    store.set('horney-myspace-glitter', glitterOn);
    if (glitterOn) { burstAt(glitterToggle.parentElement, 30); toast('glitter LIGADO ✨ como deve ser'); }
    else { parts.length = 0; toast('glitter desligado. respeitamos (mas sentimos falta).'); }
  });
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', syncGlitterUI);
  syncGlitterUI();

  /* ---------------- Skins ---------------- */
  var SKINS = {
    classic: { label: 'Clássico 2004', theme: '#6698cb' },
    scene: { label: 'Scene Kid 2006 🖤', theme: '#000000' },
    antiraso: { label: 'ANTI-RASO 2026 ⚡️', theme: '#050a3a' }
  };
  var themeMeta = $('meta[name="theme-color"]');
  var skinBtns = $$('[data-skin-btn]');

  function applySkin(name) {
    root.dataset.skin = name;
    skinBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.skinBtn === name)); });
    themeMeta.setAttribute('content', SKINS[name].theme);
    readSparkColors();
  }
  function setSkin(name, btn) {
    if (!SKINS[name] || root.dataset.skin === name) return;
    try { localStorage.setItem('horney-myspace-skin', name); } catch (e) { /* ignore */ }
    var run = function () { applySkin(name); };
    if (document.startViewTransition && !reduceMQ.matches) {
      document.startViewTransition(run).finished.then(function () { if (btn) burstAt(btn, 36); }, function () {});
    } else {
      run();
      if (btn) burstAt(btn, 36);
    }
    toast('layout aplicado: ' + SKINS[name].label);
  }
  skinBtns.forEach(function (b) {
    b.addEventListener('click', function () { setSkin(b.dataset.skinBtn, b); });
  });
  applySkin(SKINS[root.dataset.skin] ? root.dataset.skin : 'classic');

  /* ---------------- Dates: last login + show states ---------------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  var now = new Date();
  var todayISO = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  var loginEl = $('#last-login');
  loginEl.textContent = pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear();
  loginEl.setAttribute('datetime', todayISO);

  $$('.show').forEach(function (show) {
    var d = show.dataset.date;
    var badge = $('[data-badge]', show);
    var state = d < todayISO ? 'past' : d === todayISO ? 'today' : 'next';
    show.dataset.state = state;
    badge.textContent = state === 'past' ? 'já rolou' : state === 'today' ? 'HOJE!!!' : 'próximo';
  });

  /* ---------------- Mood ---------------- */
  var moods = ['ANTI-RASO 😈⚡️', 'mergulhando 🌊', 'quebrando a cabeça 🧩', 'romântica 💔', 'OFF! 🔌', 'com saudade do palco 🎸', 'sem superfície nenhuma ◎'];
  var moodIdx = 0;
  var moodBtn = $('#mood');
  moodBtn.addEventListener('click', function () {
    moodIdx = (moodIdx + 1) % moods.length;
    moodBtn.textContent = moods[moodIdx];
    burstAt(moodBtn, 12);
  });

  /* ---------------- Music player (Spotify iFrame API) ---------------- */
  var TRACKS = [
    { title: 'OFF!', id: '7KteAUfbNB4CtxnbMudBad', dur: 199338 },
    { title: 'QUEBRA-CABEÇA (feat. Dani Buarque)', id: '3SYpLwh1ChHyNEOn5TNOWy', dur: 260385 },
    { title: 'MERGULHAR', id: '0aJtgSakI5r87CfAqNdDXP', dur: 224974 },
    { title: 'ROMÂNTICA', id: '2p5r9m60eSDxMGey8GRubR', dur: 148481 }
  ];
  var playerBox = $('#music');
  var embedWrap = $('#spotify-slot-wrap');
  var lcdState = $('#lcd-state');
  var lcdTime = $('#lcd-time');
  var lcdTitle = $('#lcd-title');
  var lcdTitle2 = $('#lcd-title-2');
  var lcdProgress = $('#lcd-progress');
  var playBtn = $('#p-play');
  var trackBtns = $$('#tracks .track');

  var cur = 0;
  var mode = 'idle'; // idle | loading | api | fallback
  var controller = null;
  var pendingPlay = false;
  var isPaused = true;
  var lastPos = 0;
  var lastDur = 0;
  var loadTimer = 0;

  function fmt(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  function setLCD(state, pos, dur) {
    lcdState.textContent = state;
    lcdTime.textContent = fmt(pos) + ' / ' + fmt(dur);
    lcdProgress.style.transform = 'scaleX(' + (dur ? Math.min(1, pos / dur) : 0) + ')';
  }
  function setTitle() {
    var t = 'HORNEY — ' + TRACKS[cur].title + ' — ANTI-RASO (EP, 2026) —\u00a0';
    lcdTitle.textContent = t;
    lcdTitle2.textContent = t;
  }
  function markTrack() {
    trackBtns.forEach(function (b, i) {
      b.classList.toggle('is-current', i === cur);
      if (i === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }
  function setPlayingUI(playing) {
    playerBox.classList.toggle('is-playing', playing);
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Tocar');
  }
  function uri(i) { return 'spotify:track:' + TRACKS[i].id; }

  function mountFallback() {
    clearTimeout(loadTimer);
    mode = 'fallback';
    controller = null;
    var slot = $('#spotify-slot');
    var iframe = document.createElement('iframe');
    iframe.id = 'spotify-slot';
    iframe.title = 'Player do Spotify — HORNEY';
    iframe.height = '152';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.src = 'https://open.spotify.com/embed/track/' + TRACKS[cur].id + '?utm_source=generator';
    slot.replaceWith(iframe);
    embedWrap.classList.add('is-loaded');
    setLCD('▶ APERTA PLAY NO SPOTIFY', 0, TRACKS[cur].dur);
  }

  function loadApi() {
    mode = 'loading';
    setLCD('… CARREGANDO', 0, TRACKS[cur].dur);
    window.onSpotifyIframeApiReady = function (IFrameAPI) {
      if (mode !== 'loading') return;
      IFrameAPI.createController($('#spotify-slot'), { uri: uri(cur), width: '100%', height: 152 }, function (ctrl) {
        clearTimeout(loadTimer);
        if (mode !== 'loading') return;
        controller = ctrl;
        mode = 'api';
        embedWrap.classList.add('is-loaded');
        setTimeout(function () { if (pendingPlay && controller === ctrl) { pendingPlay = false; ctrl.play(); } }, 2500);
        ctrl.addListener('ready', function () {
          if (pendingPlay) { pendingPlay = false; ctrl.play(); }
        });
        ctrl.addListener('playback_update', function (e) {
          var d = e && e.data;
          if (!d) return;
          var wasPlaying = !isPaused;
          isPaused = !!d.isPaused;
          var dur = d.duration || TRACKS[cur].dur;
          setPlayingUI(!isPaused);
          setLCD(d.isBuffering ? '… BUFFERING' : isPaused ? '❚❚ PAUSED' : '▶ PLAYING', d.position || 0, dur);
          // auto-advance like the old profile players did
          if (wasPlaying && isPaused && lastDur && lastPos >= lastDur - 1500) {
            lastPos = 0;
            go(cur + 1, true);
            return;
          }
          lastPos = d.position || 0;
          lastDur = dur;
        });
      });
    };
    var s = document.createElement('script');
    s.src = 'https://open.spotify.com/embed/iframe-api/v1';
    s.async = true;
    s.onerror = mountFallback;
    document.head.appendChild(s);
    loadTimer = setTimeout(function () { if (mode === 'loading') mountFallback(); }, 9000);
  }

  function go(i, play) {
    cur = (i + TRACKS.length) % TRACKS.length;
    lastPos = 0; lastDur = 0;
    setTitle();
    markTrack();
    if (mode === 'api' && controller) {
      pendingPlay = !!play;
      controller.loadUri(uri(cur));
      setLCD('… CARREGANDO', 0, TRACKS[cur].dur);
    } else if (mode === 'fallback') {
      $('#spotify-slot').src = 'https://open.spotify.com/embed/track/' + TRACKS[cur].id + '?utm_source=generator';
      setLCD('▶ APERTA PLAY NO SPOTIFY', 0, TRACKS[cur].dur);
    } else if (mode === 'idle') {
      if (play) { pendingPlay = true; loadApi(); }
      else setLCD('■ STOPPED', 0, TRACKS[cur].dur);
    } else {
      pendingPlay = !!play || pendingPlay;
    }
  }

  playBtn.addEventListener('click', function () {
    burstAt(playBtn, 14);
    if (mode === 'idle') { pendingPlay = true; loadApi(); return; }
    if (mode === 'api' && controller) { controller.togglePlay(); return; }
    if (mode === 'fallback') { toast('aperta o ▶ dentro do player do Spotify 💿'); }
  });
  $('#p-prev').addEventListener('click', function () { go(cur - 1, mode !== 'fallback'); });
  $('#p-next').addEventListener('click', function () { go(cur + 1, mode !== 'fallback'); });
  trackBtns.forEach(function (b) {
    b.addEventListener('click', function () { go(Number(b.dataset.i), true); });
  });
  setTitle();

  /* ---------------- YouTube facades ---------------- */
  $$('.vid__facade').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + btn.dataset.yt + '?autoplay=1&rel=0';
      iframe.title = btn.dataset.title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      btn.replaceWith(iframe);
      iframe.focus();
    });
  });

  /* ---------------- Lightbox ---------------- */
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
  $$('[data-lightbox]').forEach(function (b) {
    b.addEventListener('click', function () { openLightbox(b.dataset.lightbox, b.dataset.alt); });
  });
  function closeOnBackdrop(dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }
  closeOnBackdrop(lightbox);

  /* ---------------- Top 8 ---------------- */
  var friendDlg = $('#friend-dlg');
  closeOnBackdrop(friendDlg);
  var fdAv = $('#fd-av'), fdName = $('#fd-name'), fdRole = $('#fd-role'), fdTxt = $('#fd-txt');
  var fdYou = $('#fd-you'), fdActions = $('#fd-actions');
  var youInput = $('#you-input');
  var youBtn = $('[data-friend="you"]');

  var FRIENDS = {
    duda: {
      name: 'Duda', role: 'voz & letras · HORNEY',
      txt: '"ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície."',
      actions: [{ label: '▶ ouvir ANTI-RASO', play: 0 }, { label: 'ler os blurbs', href: '#about' }]
    },
    rafa: {
      name: 'Rafa Bello', role: 'composição · HORNEY',
      txt: 'Escreve as músicas junto com a Duda. Se o refrão grudou na tua cabeça, a culpa é dividida.',
      actions: [{ label: '▶ tocar MERGULHAR', play: 2 }, { label: 'General Info', href: '#info-title' }]
    },
    dani: {
      name: 'Dani Buarque', role: 'feat. em QUEBRA-CABEÇA',
      txt: 'Divide a faixa 2 de ANTI-RASO com a HORNEY. Tem peça que só encaixa a dois.',
      actions: [{ label: '▶ tocar QUEBRA-CABEÇA', play: 1 }]
    },
    mastrobiso: {
      name: 'Mastrobiso', role: 'dividiu o palco no Rock Night',
      txt: 'Qui, 17/09/2026, FFFront, São Paulo: HORNEY + Mastrobiso no mesmo flyer — e que flyer.',
      actions: [{ label: 'ver o flyer', lightbox: '../assets/sympla-rock-night.jpg', alt: 'Flyer do Rock Night na FFFront com HORNEY e Mastrobiso' }, { label: 'ir pros shows', href: '#blog' }]
    },
    unglued: {
      name: 'Unglued', role: 'deu 7.8/10 pro ANTI-RASO',
      txt: 'A review de ANTI-RASO na Unglued: 7.8 de 10. A gente imprimiu e colou na geladeira (mentalmente).',
      actions: [{ label: 'ler a review ↗', href: 'https://www.unglued.com.br/reviews/anti-raso', ext: true }]
    },
    fffront: {
      name: 'FFFront', role: 'casa do Rock Night em SP',
      txt: 'Rua Purpurina, 199 — Vila Madalena, São Paulo. Onde Joinville fez barulho em 17/09.',
      actions: [{ label: 'ver no blog de shows', href: '#blog' }]
    },
    joinville: {
      name: 'Joinville', role: 'hometown · Santa Catarina',
      txt: 'De onde vem o barulho. Um quarteto de Joinville (SC), lançando som desde o primeiro EP, em 2022.',
      actions: [{ label: 'ver fotos', href: '#pics' }, { label: 'Instagram ↗', href: 'https://www.instagram.com/horney.band/', ext: true }]
    }
  };

  function renderYou() {
    var name = store.get('horney-myspace-you', '');
    $('#you-name').textContent = name || 'You';
    $('#you-initial').textContent = name ? name.charAt(0).toUpperCase() : '?';
    youBtn.classList.toggle('is-set', !!name);
    return name;
  }
  renderYou();

  function actionEl(a) {
    var el;
    if (a.href) {
      el = document.createElement('a');
      el.href = a.href;
      if (a.ext) { el.target = '_blank'; el.rel = 'noopener'; }
      else el.addEventListener('click', function () { friendDlg.close(); });
    } else {
      el = document.createElement('button');
      el.type = 'button';
      el.addEventListener('click', function () {
        if (typeof a.play === 'number') {
          friendDlg.close();
          go(a.play, true);
          playerBox.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'start' });
        } else if (a.lightbox) {
          openLightbox(a.lightbox, a.alt);
        } else if (a.run) {
          a.run();
        }
      });
    }
    el.className = 'btn btn--bevel';
    el.textContent = a.label;
    return el;
  }

  function openFriend(key, btn) {
    var srcAv = $('.av', btn);
    fdAv.className = srcAv.className + ' av--lg';
    fdAv.innerHTML = srcAv.innerHTML;
    fdActions.textContent = '';
    if (key === 'you') {
      var name = renderYou();
      fdName.textContent = name || 'You';
      fdRole.textContent = name ? 'Top 8 oficial (neste navegador)' : 'vaga aberta no Top 8';
      fdTxt.textContent = name
        ? 'Você está no Top 8 da HORNEY. Isso é basicamente um contrato. Quer trocar o nick?'
        : 'Tem uma vaga no Top 8. É sua. Coloca teu nick aqui embaixo — e depois cola no show.';
      fdYou.hidden = false;
      youInput.value = name;
      if (name) {
        fdActions.appendChild(actionEl({ label: 'sair do Top 8', run: function () {
          store.set('horney-myspace-you', '');
          renderYou();
          friendDlg.close();
          toast('você saiu do Top 8. a vaga continua aqui, tá?');
        } }));
      }
    } else {
      var f = FRIENDS[key];
      fdName.textContent = f.name;
      fdRole.textContent = f.role;
      fdTxt.textContent = f.txt;
      fdYou.hidden = true;
      f.actions.forEach(function (a) { fdActions.appendChild(actionEl(a)); });
    }
    friendDlg.showModal();
    if (key === 'you') youInput.focus();
  }
  $$('[data-friend]').forEach(function (b) {
    b.addEventListener('click', function () { openFriend(b.dataset.friend, b); });
  });
  function saveYou() {
    var v = youInput.value.trim().slice(0, 18);
    if (!v) { youInput.focus(); toast('escreve um nick primeiro 🙃'); return; }
    store.set('horney-myspace-you', v);
    renderYou();
    friendDlg.close();
    toast(v + ' agora está no Top 8 da HORNEY ♥');
    burstAt(youBtn, 40);
    var nameInput = $('#c-name');
    if (!nameInput.value) nameInput.value = v;
  }
  $('#you-save').addEventListener('click', saveYou);
  youInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveYou(); } });

  /* ---------------- Contacting HORNEY ---------------- */
  $('#c-forward').addEventListener('click', function () {
    var data = { title: 'HORNEY', text: 'HORNEY is in your extended network ⚡️😈', url: location.href };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(location.href).then(
        function () { toast('link copiado! manda pro teu Top 8 📨'); },
        function () { toast('copia aí: ' + location.href); }
      );
    } else {
      toast('copia aí: ' + location.href);
    }
  });
  $('#c-block').addEventListener('click', function (e) {
    var b = e.currentTarget;
    b.classList.remove('wiggle');
    void b.offsetWidth;
    b.classList.add('wiggle');
    toast('bloquear a HORNEY? erro 666: permissão negada 😈');
  });
  $('#c-rank').addEventListener('click', function (e) {
    burstAt(e.currentTarget, 30);
    toast('você deu ⭐⭐⭐⭐⭐ pra HORNEY (era a única opção)');
  });

  /* ---------------- Search ---------------- */
  var ROUTES = [
    { re: /show|agenda|data|ingresso|turne|tour|blog|fffront|rock night|ultimo/, sel: '#blog' },
    { re: /merch|camis|moletom|ecobag|botto|loja|comprar/, sel: '#merch' },
    { re: /video|clipe|youtube|fool|live/, sel: '#videos' },
    { re: /foto|pic|imagem|galeria/, sel: '#pics' },
    { re: /amigo|friend|top ?8|dani|mastrobiso|unglued|review|nota/, sel: '#friends' },
    { re: /coment|comment|recado|mural|wall/, sel: '#comments' },
    { re: /insta|tiktok|threads|link|social|contato|dm/, sel: '#url-title' },
    { re: /skin|tema|layout|custom|glitter|cor/, sel: '#customize' },
    { re: /sobre|about|duda|rafa|banda|joinville|quem/, sel: '#about' },
    { re: /musica|ouvir|spotify|ep|anti|raso|off|mergulhar|romantica|quebra|player|disco|album|four rooms/, sel: '#music' }
  ];
  $('#search').addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = $('#search-q').value;
    var q = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    var wholeWeb = $('#search-scope').selectedIndex === 1;
    if (!q) { toast('digita algo tipo "shows" ou "merch" 🔎'); return; }
    var hit = null;
    for (var i = 0; i < ROUTES.length; i++) { if (ROUTES[i].re.test(q)) { hit = ROUTES[i].sel; break; } }
    if (!hit) { toast('nada de "' + raw.trim() + '" por aqui. tenta "shows", "merch" ou "mergulhar"'); return; }
    var target = $(hit);
    var section = target.closest('section') || target;
    section.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'start' });
    var heading = $('h2', section) || section;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    if (wholeWeb) toast('a internet inteira = este perfil. desculpa, Tom.');
  });

  /* ---------------- Comments wall ---------------- */
  var SEED = [
    { name: 'xX_mergulhadora_Xx', pic: '🌊', date: '8 out 2026, 23:42', text: 'ANTI-RASO no repeat desde 30/07. MERGULHAR me destruiu de um jeito bom 🖤' },
    { name: 'punk.de.joinville.666', pic: '😈', date: '8 out 2026, 21:07', text: 'ORGULHO DE SC!!! thanks for the add!!! pc4pc4 ⚡️' },
    { name: '~*quebra_cabeca_girl*~', pic: '🧩', date: '7 out 2026, 02:13', text: 'QUEBRA-CABEÇA com a Dani Buarque é covardia. ouvi 14 vezes e ainda não montei' },
    { name: 'tom_from_2004', pic: '👕', date: '6 out 2026, 12:00', text: 'hey, eu ainda sou o primeiro amigo de todo mundo. a HORNEY é o segundo. justo.', tom: true },
    { name: 'gritei_no_OFF', pic: '🔌', date: '5 out 2026, 18:30', text: 'meu pescoço ainda não voltou desde o último show. vale cada vértebra' },
    { name: 'olhinho.do.O', pic: '👁', date: '3 out 2026, 09:51', text: 'alguém mais reparou que tem um olho dentro do O do logo?? ele tá me olhando agora' },
    { name: 'romantica_sim_raso_nao', pic: '💔', date: '1 out 2026, 00:04', text: 'ROMÂNTICA: 2 min e 28 seg de perfeição. aperta o replay e finge que é a primeira vez' },
    { name: 'vovo_rocker_sc', pic: '👵', date: '28 set 2026, 15:20', text: 'meu neto me mostrou. achei barulhento. ouvi o EP inteiro duas vezes. coloquem legenda nos shows' },
    { name: 'emo_desde_2005', pic: '🖤', date: '18 set 2026, 01:17', text: 'trocaria meu Top 8 inteiro por um lugar na grade no último show do ano. EXCETO a HORNEY.' }
  ];
  var KEY_C = 'horney-myspace-comments';
  var mine = store.get(KEY_C, []);
  if (!Array.isArray(mine)) mine = [];
  var wall = $('#wall');
  var countEl = $('#c-count');
  var cform = $('#cform');
  var cName = $('#c-name');
  var cText = $('#c-text');
  cName.value = store.get('horney-myspace-nick', '') || store.get('horney-myspace-you', '') || '';

  function cmtEl(c, own, fresh) {
    var li = document.createElement('li');
    li.className = 'cmt' + (c.tom ? ' cmt--tom' : '') + (fresh ? ' cmt--new' : '');
    var who = document.createElement('div');
    who.className = 'cmt__who';
    var pic = document.createElement('span');
    pic.className = 'cmt__pic';
    pic.setAttribute('aria-hidden', 'true');
    pic.textContent = c.pic;
    var nm = document.createElement('span');
    nm.className = 'cmt__name';
    nm.textContent = c.name;
    who.append(pic, nm);

    var body = document.createElement('div');
    body.className = 'cmt__body';
    var meta = document.createElement('p');
    meta.className = 'cmt__date';
    var when = document.createElement('span');
    when.textContent = own ? new Date(c.ts).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : c.date;
    meta.appendChild(when);
    if (own) {
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'cmt__del';
      del.textContent = 'apagar';
      del.setAttribute('aria-label', 'Apagar seu comentário');
      del.addEventListener('click', function () {
        mine = mine.filter(function (m) { return m.id !== c.id; });
        store.set(KEY_C, mine);
        renderWall();
        cText.focus();
        toast('comentário apagado. a internet esquece (às vezes).');
      });
      meta.appendChild(del);
    }
    var txt = document.createElement('p');
    txt.className = 'cmt__text';
    txt.textContent = c.text;
    body.append(meta, txt);
    li.append(who, body);
    return li;
  }
  function renderWall(freshId) {
    wall.textContent = '';
    var frag = document.createDocumentFragment();
    mine.slice().sort(function (a, b) { return b.ts - a.ts; }).forEach(function (c) {
      frag.appendChild(cmtEl(c, true, c.id === freshId));
    });
    SEED.forEach(function (c) { frag.appendChild(cmtEl(c, false, false)); });
    wall.appendChild(frag);
    countEl.textContent = String(mine.length + SEED.length);
  }
  renderWall();

  cform.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = cName.value.trim().slice(0, 28);
    var text = cText.value.trim().slice(0, 280);
    if (!name) { cName.focus(); toast('todo mundo precisa de um nick'); return; }
    if (!text) { cText.focus(); toast('comentário vazio? nem o Tom faria isso'); return; }
    var picInput = $('input[name="pic"]:checked', cform);
    var c = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name, text: text, pic: picInput ? picInput.value : '🖤', ts: Date.now() };
    mine.push(c);
    store.set(KEY_C, mine);
    store.set('horney-myspace-nick', name);
    renderWall(c.id);
    cText.value = '';
    toast('comentário postado! pc4pc4? 💌');
    burstAt($('.btn--go', cform), 40);
  });
})();
