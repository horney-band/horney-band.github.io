/* HORNEY — 14 · LAN HOUSE — apps: MSN Messenger (O Olho, HORNEY, sala dos Fãs), HORNEY AMP, eMula. */
(() => {
  'use strict';
  const LH = window.LH;
  if (!LH) return;
  const { $, $$, el, H } = LH;
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const L = {
    dm: { label: 'DM no Instagram', href: 'https://ig.me/m/horney.band' },
    ig: { label: 'Instagram @horney.band', href: 'https://www.instagram.com/horney.band/' },
    tiktok: { label: 'TikTok @horney.band', href: 'https://www.tiktok.com/@horney.band' },
    threads: { label: 'Threads @horney.band', href: 'https://www.threads.com/@horney.band' },
    yt: { label: 'YouTube @bandaHorney', href: 'https://www.youtube.com/@bandaHorney' },
    spotify: { label: 'HORNEY no Spotify', href: 'https://open.spotify.com/artist/5zJVmieIGGEeOKbIrXmhZi' }
  };

  /* =====================================================================
     MSN MESSENGER
     ===================================================================== */
  const msnWin = $('#win-msn');
  const signin = $('#msn-signin');
  const msnMain = $('#msn-main');
  const mePm = $('#msn-me-pm');
  const fansList = $('#fans-list');
  const fansCount = $('#fans-count');
  let signedIn = false;
  let signT = 0;

  function finishSignin(quiet) {
    clearTimeout(signT);
    signedIn = true;
    signin.classList.remove('is-spin');
    signin.hidden = true;
    msnMain.hidden = false;
    if (!quiet) {
      LH.sfx('signin');
      LH.announce('MSN Messenger: você entrou como ' + LH.nick() + '.');
    }
    loadFans();
  }
  msnWin.addEventListener('win:open', (e) => {
    $('#msn-signin-nick').textContent = LH.nick();
    if (signedIn) return;
    const restore = e.detail && e.detail.restore;
    signin.hidden = false;
    msnMain.hidden = true;
    if (restore || LH.reduced()) { finishSignin(restore); return; }
    signin.classList.remove('is-spin');
    void signin.offsetWidth;
    signin.classList.add('is-spin');
    signT = setTimeout(() => finishSignin(false), 1500);
  });
  msnWin.addEventListener('win:close', () => {
    clearTimeout(signT);
    signedIn = false;
  });

  function paintFans(all) {
    if (!H) {
      fansCount.textContent = '0';
      fansList.replaceChildren(el('li', 'msn__sub', 'mural fora do ar nesta máquina.'));
      return;
    }
    const seen = new Set();
    const people = [];
    all.filter((m) => m.channel === 'mural').forEach((m) => {
      const key = m.name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      people.push(m);
    });
    fansCount.textContent = String(people.length);
    fansList.replaceChildren(...people.slice(0, 5).map((m) => {
      const li = el('li');
      const b = el('button', 'contact');
      b.type = 'button';
      b.dataset.chat = 'fas';
      const dot = el('span', 'dot dot--away');
      dot.setAttribute('aria-hidden', 'true');
      const pic = el('span', 'contact__pic', (Array.from(m.name.trim())[0] || '?').toUpperCase());
      pic.setAttribute('aria-hidden', 'true');
      const t = el('span', 'contact__t');
      t.append(el('b', null, m.name), el('small', null, m.text));
      b.append(dot, pic, t);
      li.append(b);
      return li;
    }));
  }
  function loadFans() {
    if (!H) { paintFans([]); return; }
    H.mural.list().then(paintFans).catch(() => paintFans([]));
  }

  /* =====================================================================
     CHATS
     ===================================================================== */
  const NAMES = { olho: 'O Olho (oráculo)', banda: 'HORNEY (banda)', fas: 'Fãs' };
  const EMO = [
    [':)', '🙂', 'sorriso'], [':D', '😃', 'risadão'], [';)', '😉', 'piscadinha'], [':(', '🙁', 'triste'],
    [':P', '😛', 'língua'], [':O', '😮', 'surpresa'], ['(H)', '😎', 'descolado'], ['(L)', '❤️', 'coração'],
    ['(U)', '💔', 'coração partido'], ['(6)', '😈', 'diabinho'], ['(8)', '🎵', 'música'], ['(Y)', '👍', 'joinha']
  ];
  const EMO_RE = new RegExp('(' + EMO.map((e) => e[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'gi');
  function appendEmo(node, text) {
    String(text).split(EMO_RE).forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 1) {
        const e = EMO.find((x) => x[0].toLowerCase() === part.toLowerCase());
        if (e) {
          const s = el('span', 'emo', e[1]);
          s.setAttribute('role', 'img');
          s.setAttribute('aria-label', e[2]);
          node.append(s);
          return;
        }
      }
      node.append(part);
    });
  }

  const stored = LH.store.get('chats', {});
  const hist = {
    olho: Array.isArray(stored && stored.olho) ? stored.olho.filter(validMsg) : [],
    banda: Array.isArray(stored && stored.banda) ? stored.banda.filter(validMsg) : []
  };
  function validMsg(m) { return m && typeof m === 'object' && typeof m.t === 'string' && typeof m.w === 'string'; }
  function saveHist() { LH.store.set('chats', { olho: hist.olho.slice(-80), banda: hist.banda.slice(-80) }); }

  function msgNode(id, m) {
    if (m.w === 'sys' || m.w === 'nudge') return el('p', 'msg msg--sys' + (m.w === 'nudge' ? ' msg--nudge' : ''), m.t);
    const me = m.w === 'me';
    const box = el('div', 'msg msg--' + (me ? 'me' : 'them'));
    const who = me ? (typeof m.n === 'string' && m.n ? m.n : LH.nick()) : (typeof m.n === 'string' && m.n ? m.n : NAMES[id]);
    box.append(el('p', 'msg__who', who + ' diz:'));
    const tx = el('p', 'msg__text');
    appendEmo(tx, m.t);
    box.append(tx);
    if (Array.isArray(m.l) && m.l.length) {
      const lw = el('p', 'msg__links');
      m.l.forEach((lk) => {
        if (lk && typeof lk.href === 'string' && /^https:\/\//.test(lk.href) && typeof lk.label === 'string') lw.append(LH.extLink(lk.label + ' ↗', lk.href));
      });
      if (lw.childNodes.length) box.append(lw);
    }
    return box;
  }

  const chats = {};
  ['olho', 'banda', 'fas'].forEach((id) => {
    const win = $('#win-chat-' + id);
    chats[id] = {
      id, win,
      log: $('.chat__log', win),
      typing: $('.chat__typing', win),
      form: $('.chat__form', win),
      ta: $('.chat__text', win),
      send: $('.chat__send', win),
      emoBtn: $('.chat__emo-btn', win),
      emoPop: $('.chat__emo-pop', win),
      nudgeBtn: $('.chat__nudge', win),
      clearBtn: $('.chat__clear', win)
    };
  });

  function scrollEnd(c) { c.log.scrollTop = c.log.scrollHeight; }
  function push(c, m, persist = true) {
    m.at = m.at || new Date().toISOString();
    if (persist && hist[c.id]) { hist[c.id].push(m); if (hist[c.id].length > 80) hist[c.id].splice(0, hist[c.id].length - 80); saveHist(); }
    c.log.append(msgNode(c.id, m));
    scrollEnd(c);
  }
  function greet(c) {
    if (c.id === 'olho') {
      push(c, { w: 'them', t: '◎ pergunta. o olho responde. shows, discos, merch, amor, futuro… o olho não julga, só enxerga fundo.' });
      if (H) push(c, { w: 'them', t: 'sorte do dia: ' + H.oraculo.sorte() });
      else push(c, { w: 'sys', t: 'O Olho tá fora do ar nesta máquina (o módulo do oráculo não carregou). Recarrega a página.' }, false);
    } else if (c.id === 'banda') {
      push(c, {
        w: 'them',
        t: 'fala, ' + LH.nick() + '! aqui é a HORNEY versão MSN de lan house (6) real: este chat é automático. pra falar com a banda de verdade, os caminhos são esses aqui embaixo ⚡',
        l: [L.dm, L.ig, L.tiktok, L.threads, L.yt, L.spotify]
      });
    }
  }
  function renderHist(c) {
    c.log.replaceChildren();
    if (!hist[c.id].length) greet(c);
    else hist[c.id].forEach((m) => c.log.append(msgNode(c.id, m)));
    scrollEnd(c);
  }

  /* --- O Olho --- */
  const OLHO_NUDGES = [
    'Chamou? O olho nunca dormiu.',
    'Você me cutucou. Eu te vi antes.',
    'Cutucar o olho é raso. Pergunta alguma coisa funda.',
    'Tô aqui. Sempre tô. Pergunta.'
  ];
  let olhoNudgeIdx = 0;
  function askOlho(c, q) {
    if (q) push(c, { w: 'me', t: q, n: LH.nick() });
    c.typing.textContent = 'O Olho está digitando…';
    const delay = LH.reduced() ? 450 : 700 + Math.min(1400, q.length * 18);
    setTimeout(() => {
      c.typing.textContent = '';
      if (!H) {
        push(c, { w: 'sys', t: 'O Olho tá fora do ar nesta máquina (o módulo do oráculo não carregou). Recarrega a página.' }, false);
        return;
      }
      const ans = H.oraculo.ask(q);
      push(c, { w: 'them', t: ans.text, l: Array.isArray(ans.links) ? ans.links.map((x) => ({ label: x.label, href: x.href })) : [] });
      LH.sfx('msg');
      blink();
      if (!LH.isOpen('win-chat-olho')) LH.notify('O Olho diz:', ans.text.slice(0, 120));
    }, delay);
  }

  /* --- HORNEY (banda) --- */
  const BANDA_REPLIES = [
    { t: 'valeu pelo recado! :) real: quem responde aqui é o robô da lan. a HORNEY de verdade lê a DM do Instagram 👉', l: [L.dm] },
    { t: 'anotado ⚡ mas pra chegar na banda mesmo, o caminho é a DM. show na tua cidade, merch, parceria: tudo por lá.', l: [L.dm, L.ig] },
    { t: 'se for sobre show: datas novas saem primeiro no Instagram. se for sobre merch: EM BREVE, reserva na DM. se for sobre o EP: ANTI-RASO já saiu!!!', l: [L.ig, L.dm, L.spotify] }
  ];
  let bandaIdx = 0;
  function sayBanda(c, q) {
    push(c, { w: 'me', t: q, n: LH.nick() });
    c.typing.textContent = 'HORNEY (banda) está digitando…';
    setTimeout(() => {
      c.typing.textContent = '';
      const r = BANDA_REPLIES[bandaIdx++ % BANDA_REPLIES.length];
      push(c, { w: 'them', t: r.t, l: r.l });
      LH.sfx('msg');
    }, LH.reduced() ? 400 : 900);
  }

  /* --- Nudge (chamar atenção) --- */
  let lastNudge = 0;
  function nudge(c) {
    if (Date.now() - lastNudge < 6000) {
      push(c, { w: 'sys', t: 'Você não pode chamar a atenção com tanta frequência.' }, false);
      return;
    }
    lastNudge = Date.now();
    push(c, { w: 'nudge', t: 'Você chamou a atenção de ' + NAMES[c.id] + '!' });
    LH.shake(c.win);
    LH.sfx('nudge');
    setTimeout(() => {
      if (c.id === 'olho') {
        push(c, { w: 'nudge', t: 'O Olho chamou a sua atenção!' });
        LH.shake(c.win);
        LH.sfx('nudge');
        blink();
        push(c, { w: 'them', t: OLHO_NUDGES[olhoNudgeIdx++ % OLHO_NUDGES.length] });
      } else {
        push(c, { w: 'them', t: 'Você chamou a atenção da HORNEY! Agora sai de casa e cola no show ⚡😈', l: [L.ig] });
        LH.sfx('msg');
      }
    }, 1400);
  }

  /* --- Fãs (mural as chat room) --- */
  function paintFas(all) {
    const c = chats.fas;
    if (!H) {
      c.log.replaceChildren(el('p', 'msg msg--sys', 'a sala dos fãs tá fora do ar nesta máquina (o módulo do mural não carregou).'));
      return;
    }
    const nearEnd = c.log.scrollHeight - c.log.scrollTop - c.log.clientHeight < 60;
    const items = all.filter((m) => m.channel === 'mural').slice(0, 40).reverse();
    const nodes = [el('p', 'msg msg--sys', 'você entrou na sala como ' + LH.nick() + ' · ' + items.length + ' mensagens recentes do mural')];
    items.forEach((m) => {
      const me = !m.seed && m.name === LH.nick();
      const n = msgNode('fas', { w: me ? 'me' : 'them', t: m.text, n: m.name });
      const time = el('time', 'sr-only', ' (' + LH.fmtWhen(m.at) + ')');
      $('.msg__who', n).append(time);
      nodes.push(n);
    });
    c.log.replaceChildren(...nodes);
    if (nearEnd || !c.log.dataset.seen) { scrollEnd(c); c.log.dataset.seen = '1'; }
  }
  function loadFas() {
    if (!H) { paintFas([]); return; }
    H.mural.list().then(paintFas).catch(() => paintFas([]));
  }
  if (H) {
    H.mural.subscribe((all) => {
      paintFans(all);
      if (LH.isOpen('win-chat-fas')) paintFas(all);
    });
  }

  /* --- Wiring for all three chat windows --- */
  function closeEmo(c, focusBtn) {
    if (c.emoPop.hidden) return;
    c.emoPop.hidden = true;
    c.emoBtn.setAttribute('aria-expanded', 'false');
    if (focusBtn) c.emoBtn.focus();
  }
  Object.values(chats).forEach((c) => {
    c.emoPop.replaceChildren(...EMO.map((e) => {
      const b = el('button', null, e[1]);
      b.type = 'button';
      b.setAttribute('aria-label', e[2] + ' ' + e[0]);
      b.addEventListener('click', () => {
        const ta = c.ta;
        const s = ta.selectionStart == null ? ta.value.length : ta.selectionStart;
        const en = ta.selectionEnd == null ? s : ta.selectionEnd;
        const ins = (s > 0 && ta.value[s - 1] !== ' ' ? ' ' : '') + e[0] + ' ';
        ta.value = ta.value.slice(0, s) + ins + ta.value.slice(en);
        closeEmo(c, false);
        ta.focus();
        const p = s + ins.length;
        ta.setSelectionRange(p, p);
      });
      return b;
    }));
    c.emoBtn.addEventListener('click', () => {
      const open = c.emoPop.hidden;
      c.emoPop.hidden = !open;
      c.emoBtn.setAttribute('aria-expanded', String(open));
      if (open) c.emoPop.querySelector('button').focus();
    });
    c.form.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !c.emoPop.hidden) { e.stopPropagation(); closeEmo(c, true); }
    });
    c.emoPop.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !c.emoPop.contains(e.relatedTarget) && e.relatedTarget !== c.emoBtn) closeEmo(c, false);
    });
    document.addEventListener('pointerdown', (e) => {
      if (!c.emoPop.hidden && !c.emoPop.contains(e.target) && !c.emoBtn.contains(e.target)) closeEmo(c, false);
    });
    c.ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); c.form.requestSubmit ? c.form.requestSubmit() : c.form.dispatchEvent(new Event('submit', { cancelable: true })); }
    });
    if (c.nudgeBtn) c.nudgeBtn.addEventListener('click', () => nudge(c));
    if (c.clearBtn) c.clearBtn.addEventListener('click', () => {
      hist[c.id] = [];
      saveHist();
      renderHist(c);
      LH.announce('Histórico apagado.');
    });
    c.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = c.ta.value.trim();
      if (c.id === 'olho') { c.ta.value = ''; askOlho(c, q); return; }
      if (!q) { c.ta.focus(); return; }
      if (c.id === 'banda') { c.ta.value = ''; sayBanda(c, q); return; }
      if (!H) return;
      c.send.disabled = true;
      H.mural.post({ name: LH.nick(), text: q, channel: 'mural' }).then(() => {
        c.ta.value = '';
        LH.sfx('msg');
        LH.announce('Mensagem enviada pra sala dos fãs e pro mural.');
      }).catch((err) => {
        const t = err && err.message ? err.message : 'não deu pra enviar agora.';
        c.log.append(el('p', 'msg msg--sys', t));
        scrollEnd(c);
        LH.announce(t);
        LH.sfx('error');
      }).then(() => { c.send.disabled = false; });
    });
    c.win.addEventListener('win:open', () => {
      if (c.id === 'fas') loadFas();
      else renderHist(c);
      if (c.id === 'fas' && !H) { c.ta.disabled = true; c.send.disabled = true; }
    });
    c.win.addEventListener('win:show', () => setTimeout(() => {
      scrollEnd(c);
      if (!LH.mobile() && document.activeElement === c.win) c.ta.focus({ preventScroll: true });
    }, 0));
  });

  LH.openChat = (id, opener) => {
    const c = chats[id];
    if (!c) return;
    LH.openWin(c.win.id, opener);
    if (!LH.mobile()) c.ta.focus({ preventScroll: true });
  };
  LH.on('nick', () => {
    if (LH.isOpen('win-chat-fas')) loadFas();
    $('#msn-signin-nick').textContent = LH.nick();
  });

  /* --- The Eye display picture: follows the cursor, blinks --- */
  const eyeSvg = $('#win-chat-olho .eyeball');
  const pupil = $('.eye__pupil', eyeSvg);
  let px = 0;
  let py = 0;
  let eyeRaf = 0;
  let lastT = '';
  let blinkT = 0;
  const eyeActive = () => LH.isOpen('win-chat-olho') && !document.hidden && !LH.reduced();
  function eyeFrame() {
    eyeRaf = 0;
    const r = eyeSvg.getBoundingClientRect();
    if (!r.width) return;
    const dx = px - (r.left + r.width / 2);
    const dy = py - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 240);
    const t = 'translate(' + ((dx / d) * 12 * k).toFixed(1) + ' ' + ((dy / d) * 6 * k).toFixed(1) + ')';
    if (t !== lastT) { pupil.setAttribute('transform', t); lastT = t; }
  }
  window.addEventListener('pointermove', (e) => {
    if (!eyeActive()) return;
    px = e.clientX;
    py = e.clientY;
    if (!eyeRaf) eyeRaf = requestAnimationFrame(eyeFrame);
  }, { passive: true });
  function blink() {
    if (!eyeActive()) return;
    eyeSvg.classList.remove('is-blink');
    void eyeSvg.getBoundingClientRect();
    eyeSvg.classList.add('is-blink');
  }
  eyeSvg.addEventListener('animationend', () => eyeSvg.classList.remove('is-blink'));
  function scheduleBlink() {
    clearTimeout(blinkT);
    if (!eyeActive()) return;
    blinkT = setTimeout(() => { blink(); scheduleBlink(); }, 2400 + Math.random() * 4200);
  }
  function resetEye() {
    clearTimeout(blinkT);
    if (eyeRaf) { cancelAnimationFrame(eyeRaf); eyeRaf = 0; }
    if (LH.reduced()) { pupil.removeAttribute('transform'); lastT = ''; }
  }
  chats.olho.win.addEventListener('win:show', scheduleBlink);
  chats.olho.win.addEventListener('win:hide', resetEye);
  LH.on('visibility', (hidden) => { if (hidden) resetEye(); else scheduleBlink(); });
  LH.on('motion', () => { resetEye(); scheduleBlink(); });

  /* =====================================================================
     HORNEY AMP — Spotify iFrame API controller (loaded on first play)
     ===================================================================== */
  const TRACKS = [
    { title: 'OFF!', id: '7KteAUfbNB4CtxnbMudBad', dur: 199338, bpm: 168 },
    { title: 'QUEBRA-CABEÇA (feat. Dani Buarque)', id: '3SYpLwh1ChHyNEOn5TNOWy', dur: 260385, bpm: 128 },
    { title: 'MERGULHAR', id: '0aJtgSakI5r87CfAqNdDXP', dur: 224974, bpm: 112 },
    { title: 'ROMÂNTICA', id: '2p5r9m60eSDxMGey8GRubR', dur: 148481, bpm: 140 }
  ];
  const ampWin = $('#win-amp');
  const amp = $('#amp');
  const ampState = $('#amp-state');
  const ampTime = $('#amp-time');
  const mq = $('#amp-marquee .amp__mq');
  const seek = $('#amp-seek');
  const stereo = $('#amp-stereo');
  const spNote = $('#sp-note');
  const ampNow = $('#amp-now');
  const trackBtns = $$('.amp-track');
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  };

  let cur = 0;
  let mode = 'idle'; // idle | loading | api | fallback
  let controller = null;
  let pendingPlay = false;
  let isPaused = true;
  let fbPlaying = false;
  let everPlayed = false;
  let pos = 0;
  let dur = TRACKS[0].dur;
  let lastPos = 0;
  let lastDur = 0;
  let seeking = false;
  let loadTimer = 0;
  let hintT = 0;
  let hinted = false;

  const isPlaying = () => (mode === 'api' ? !isPaused : mode === 'fallback' && fbPlaying);
  const trackLine = (i) => (i + 1) + '. HORNEY - ' + TRACKS[i].title + ' (' + fmt(TRACKS[i].dur) + ')';
  function setMarquee(text) {
    const t = text + '  ***  ';
    mq.children[0].textContent = t;
    mq.children[1].textContent = t;
  }
  function setLCD(glyph, p, d) {
    pos = p;
    dur = d || dur;
    ampState.textContent = glyph;
    ampTime.textContent = fmt(p);
    if (!seeking) seek.value = String(Math.round((d ? clamp(p / d, 0, 1) : 0) * 1000));
  }
  function markTrack() {
    trackBtns.forEach((b, i) => {
      b.classList.toggle('is-current', i === cur);
      if (i === cur) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
  }
  let lastNow = '';
  function refresh() {
    const p = isPlaying();
    amp.classList.toggle('is-playing', p);
    stereo.classList.toggle('is-on', p);
    seek.disabled = mode !== 'api';
    const t = TRACKS[cur].title;
    mePm.textContent = p ? '♪ ouvindo: HORNEY – ' + t : everPlayed ? '♪ ouvindo: HORNEY – ' + t + ' (pausado)' : '♪ ouvindo: nada ainda — abre o HORNEY AMP';
    const now = p ? 'Tocando: HORNEY, ' + t : '';
    if (now && now !== lastNow) ampNow.textContent = now;
    lastNow = now;
    vizKick();
  }
  const uri = (i) => 'spotify:track:' + TRACKS[i].id;

  function mountFallback() {
    clearTimeout(loadTimer);
    mode = 'fallback';
    controller = null;
    const f = el('iframe');
    f.id = 'sp-slot';
    f.title = 'Spotify — HORNEY, ' + TRACKS[cur].title;
    f.height = '80';
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    f.src = 'https://open.spotify.com/embed/track/' + TRACKS[cur].id + '?utm_source=generator&theme=0';
    $('#sp-wrap').replaceChildren(f);
    fbPlaying = false;
    spNote.textContent = 'aperta ▶ dentro do player do Spotify aqui embaixo.';
    setLCD('▶', 0, TRACKS[cur].dur);
    setMarquee(trackLine(cur) + '  ***  APERTA ▶ NO SPOTIFY AQUI EMBAIXO');
    refresh();
  }

  function loadApi() {
    if (mode !== 'idle') return;
    mode = 'loading';
    spNote.textContent = 'carregando o plug-in do Spotify…';
    setLCD('…', 0, TRACKS[cur].dur);
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      if (mode !== 'loading') return;
      IFrameAPI.createController($('#sp-slot'), { uri: uri(cur), width: '100%', height: 80 }, (ctrl) => {
        clearTimeout(loadTimer);
        if (mode !== 'loading') return;
        controller = ctrl;
        mode = 'api';
        spNote.textContent = 'tocando pelo Spotify. se não começar, aperta ▶ dentro do player aqui embaixo.';
        refresh();
        setTimeout(() => { if (pendingPlay && controller === ctrl) { pendingPlay = false; ctrl.play(); } }, 2500);
        ctrl.addListener('ready', () => { if (pendingPlay) { pendingPlay = false; ctrl.play(); } });
        ctrl.addListener('playback_update', (e) => {
          const d = e && e.data;
          if (!d) return;
          const wasPlaying = !isPaused;
          isPaused = !!d.isPaused;
          if (!isPaused) { clearTimeout(hintT); everPlayed = true; }
          const du = d.duration || TRACKS[cur].dur;
          setLCD(d.isBuffering ? '…' : isPaused ? '❚❚' : '▶', d.position || 0, du);
          refresh();
          if (wasPlaying && isPaused && lastDur && lastPos >= lastDur - 1500) {
            lastPos = 0;
            go(cur + 1, true);
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
    clearTimeout(hintT);
    hintT = setTimeout(() => {
      if (mode === 'api' && isPaused && !hinted) {
        hinted = true;
        LH.notify('HORNEY AMP', 'Se o som não começou, aperta o ▶ dentro do player do Spotify (logo abaixo da playlist).');
      }
    }, 5000);
  }

  function go(i, play) {
    cur = (i + TRACKS.length) % TRACKS.length;
    lastPos = 0;
    lastDur = 0;
    markTrack();
    setMarquee(trackLine(cur));
    if (mode === 'api' && controller) {
      pendingPlay = !!play;
      isPaused = true;
      controller.loadUri(uri(cur));
      if (play) {
        const ctrl = controller;
        setTimeout(() => { if (pendingPlay && controller === ctrl) { pendingPlay = false; ctrl.play(); } }, 1500);
        hintIfSilent();
      }
      setLCD(play ? '…' : '■', 0, TRACKS[cur].dur);
    } else if (mode === 'fallback') {
      const f = $('#sp-slot');
      if (f) {
        f.src = 'https://open.spotify.com/embed/track/' + TRACKS[cur].id + '?utm_source=generator&theme=0';
        f.title = 'Spotify — HORNEY, ' + TRACKS[cur].title;
      }
      fbPlaying = !!play;
      if (play) everPlayed = true;
      setLCD('▶', 0, TRACKS[cur].dur);
      setMarquee(trackLine(cur) + '  ***  APERTA ▶ NO SPOTIFY AQUI EMBAIXO');
    } else if (mode === 'idle') {
      if (play) { pendingPlay = true; loadApi(); hintIfSilent(); }
      else setLCD('■', 0, TRACKS[cur].dur);
    } else {
      pendingPlay = !!play || pendingPlay;
    }
    refresh();
  }

  function play() {
    if (mode === 'idle') { pendingPlay = true; loadApi(); hintIfSilent(); return; }
    if (mode === 'api' && controller) {
      if (isPaused) { if (pos > 0) controller.resume(); else controller.play(); hintIfSilent(); }
      return;
    }
    if (mode === 'fallback') {
      fbPlaying = true;
      everPlayed = true;
      refresh();
      LH.notify('HORNEY AMP', 'Aperta o ▶ dentro do player do Spotify logo abaixo ⚡');
    }
  }
  function pause() {
    if (mode === 'api' && controller) {
      if (isPaused) { if (pos > 0) controller.resume(); }
      else controller.pause();
    } else if (mode === 'fallback') { fbPlaying = false; refresh(); }
  }
  function stop() {
    clearTimeout(hintT);
    pendingPlay = false;
    if (mode === 'api' && controller) { controller.pause(); controller.seek(0); }
    fbPlaying = false;
    isPaused = true;
    setLCD('■', 0, dur);
    refresh();
  }
  function pauseMusic() {
    pendingPlay = false;
    if (mode === 'api' && controller && !isPaused) controller.pause();
    if (mode === 'fallback' && fbPlaying) { fbPlaying = false; refresh(); }
  }

  $('#amp-play').addEventListener('click', play);
  $('#amp-pause').addEventListener('click', pause);
  $('#amp-stop').addEventListener('click', stop);
  $('#amp-prev').addEventListener('click', () => go(cur - 1, isPlaying() || pendingPlay));
  $('#amp-next').addEventListener('click', () => go(cur + 1, isPlaying() || pendingPlay));
  trackBtns.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.track), true)));
  seek.addEventListener('input', () => {
    seeking = true;
    ampTime.textContent = fmt((Number(seek.value) / 1000) * dur);
  });
  seek.addEventListener('change', () => {
    seeking = false;
    if (mode === 'api' && controller) controller.seek(Math.floor(((Number(seek.value) / 1000) * dur) / 1000));
  });

  LH.play = (i, opener) => {
    LH.openWin('win-amp', opener);
    go(i, true);
  };
  LH.pauseMusic = pauseMusic;
  LH.on('shutdown', pauseMusic);

  /* Visualizer: fake 20-band spectrum, only animates while playing and visible. */
  const canvas = $('#amp-viz');
  const ctx = canvas.getContext('2d');
  const N = 20;
  const bars = new Float32Array(N);
  const peaks = new Float32Array(N);
  const hold = new Float32Array(N);
  const seeds = Array.from({ length: N }, () => [Math.random() * 6.28, 0.6 + Math.random() * 1.8, Math.random() * 6.28, 1.3 + Math.random() * 2.2]);
  let raf = 0;
  let last = 0;
  let dpr = 1;
  let grad = null;

  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
    grad.addColorStop(0, '#f2a900');
    grad.addColorStop(0.55, '#ff7a1a');
    grad.addColorStop(1, '#ff2bd6');
    draw();
  }
  if ('ResizeObserver' in window) new ResizeObserver(sizeCanvas).observe(canvas);
  ampWin.addEventListener('win:show', () => { sizeCanvas(); vizKick(); });

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
  }
  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!grad) return;
    const gap = 2 * dpr;
    const bw = (w - gap * (N - 1)) / N;
    ctx.fillStyle = grad;
    for (let i = 0; i < N; i++) {
      const bh = Math.max(1 * dpr, bars[i] * h);
      ctx.fillRect(i * (bw + gap), h - bh, bw, bh);
    }
    ctx.fillStyle = '#000';
    for (let y = h - 3 * dpr; y > 0; y -= 4 * dpr) ctx.fillRect(0, y, w, 1 * dpr);
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < N; i++) {
      if (peaks[i] > 0.01) ctx.fillRect(i * (bw + gap), h - peaks[i] * h - 2 * dpr, bw, 2 * dpr);
    }
  }
  function frame(now) {
    raf = 0;
    if (ampWin.hidden || document.hidden || ampOffscreen) { last = 0; return; }
    const playing = isPlaying();
    step(now, playing);
    draw();
    let energy = 0;
    for (let i = 0; i < N; i++) energy += bars[i] + peaks[i];
    if (playing || energy > 0.01) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function vizKick() {
    if (ampWin.hidden) return;
    if (LH.reduced()) {
      const p = isPlaying();
      for (let i = 0; i < N; i++) { bars[i] = p ? target(i, 1.3, TRACKS[cur].bpm) : 0; peaks[i] = bars[i]; }
      draw();
      return;
    }
    if (!raf && !document.hidden && !ampOffscreen) raf = requestAnimationFrame(frame);
  }
  LH.on('visibility', (hidden) => { if (!hidden) vizKick(); });
  LH.on('motion', vizKick);
  /* Marquee + visualizer pause whenever the player is scrolled/dragged out of view. */
  let ampOffscreen = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        ampOffscreen = !en.isIntersecting;
        amp.classList.toggle('is-offscreen', ampOffscreen);
        if (!ampOffscreen) vizKick();
      });
    }).observe(canvas);
  }

  setMarquee(trackLine(0) + '  ***  APERTA ▶ PRA TOCAR');
  markTrack();
  refresh();

  /* =====================================================================
     eMula — the discography as a 2006 download list (ends in Spotify)
     ===================================================================== */
  const FILES = [
    { name: 'HORNEY - ANTI-RASO (2026) [320kbps].rar', size: '32,5 MB', kind: 'ok', icon: 'i-amp', href: 'https://open.spotify.com/album/7EM81z5ydGQq04ZbkIE5aS' },
    { name: 'HORNEY - MERGULHAR (single 2026) [320kbps].mp3', size: '8,8 MB', kind: 'ok', icon: 'i-amp', href: 'https://open.spotify.com/album/5jJ1py37M3i7qaZgkOOf4V' },
    { name: 'HORNEY - OFF! (single 2025) [320kbps].mp3', size: '7,8 MB', kind: 'ok', icon: 'i-amp', href: 'https://open.spotify.com/album/6Cg0ULHHKTsJo7GlEfPKrF' },
    { name: 'HORNEY - Four Rooms for Four Fools (EP 2022).zip', size: '?? MB', kind: 'ok', icon: 'i-folder', href: 'https://open.spotify.com/album/3m7dNgjIIiHDuZiNcu8Vhi' },
    { name: 'HORNEY - Fool\'s Game (clipe oficial 2022).avi', size: '?? MB', kind: 'video', icon: 'i-img' },
    { name: 'musica_nova_(NAO_E_VIRUS).mp3.exe', size: '666 KB', kind: 'virus', icon: 'i-txt' },
    { name: 'toque_polifonico_generico_TOP.mid', size: '12 KB', kind: 'stuck', icon: 'i-txt' },
    { name: 'fotos_da_festa_da_lan_2005.zip', size: '140 MB', kind: 'offline', icon: 'i-folder' }
  ];
  const emList = $('#em-list');
  const emStatus = $('#em-status');
  const rows = FILES.map((f, i) => {
    const li = el('li', 'dl');
    const name = el('span', 'dl__name');
    name.append(LH.svgUse(f.icon, 'dl__ico'), el('span', null, f.name));
    const bar = el('span', 'dl__bar');
    const fill = el('i');
    bar.append(fill);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Progresso: ' + f.name);
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', '100');
    bar.setAttribute('aria-valuenow', '0');
    const st = el('span', 'dl__st', 'na fila');
    const act = el('span', 'dl__act');
    li.append(name, el('span', 'dl__size', f.size), bar, st, act);
    emList.append(li);
    const row = { f, i, li, fill, bar, st, act, p: 0, state: 'queued', start: 0, dur: 0, stopAt: 1, lastSpeed: 0 };
    setAction(row, 'Baixar', () => startDl(row));
    return row;
  });

  function setAction(row, label, fn, cls) {
    const b = el('button', 'btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.addEventListener('click', fn);
    const hadFocus = row.act.contains(document.activeElement);
    row.act.replaceChildren(b);
    if (hadFocus) b.focus();
    return b;
  }
  function setLinkAction(row, label, href) {
    const hadFocus = row.act.contains(document.activeElement);
    const a = LH.extLink(label, href, 'btn btn--go');
    row.act.replaceChildren(a);
    if (hadFocus) a.focus();
  }
  function setP(row, p) {
    row.p = p;
    row.fill.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    row.bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }
  function emPaint() {
    const down = rows.filter((r) => r.state === 'down').length;
    const done = rows.filter((r) => r.state === 'done').length;
    emStatus.textContent = rows.filter((r) => r.li.isConnected).length + ' arquivo(s) na fila · ' + down + ' baixando · ' + done + ' completo(s)';
  }

  let emRaf = 0;
  function startDl(row) {
    row.li.classList.remove('is-stuck', 'is-blocked');
    const k = row.f.kind;
    row.state = 'down';
    row.start = performance.now();
    row.dur = k === 'offline' ? 1200 : 2200 + Math.random() * 2200;
    row.stopAt = k === 'virus' ? 0.63 : k === 'stuck' ? 0.99 : k === 'offline' ? 0 : 1;
    setP(row, 0);
    row.st.textContent = k === 'offline' ? 'procurando fontes…' : 'baixando…';
    setAction(row, 'Cancelar', () => cancelDl(row));
    emPaint();
    if (LH.reduced()) { settle(row); return; }
    if (!emRaf) emRaf = requestAnimationFrame(emFrame);
  }
  function cancelDl(row) {
    row.state = 'queued';
    row.li.classList.remove('is-stuck', 'is-blocked');
    setP(row, 0);
    row.st.textContent = 'cancelado (sábia decisão)';
    setAction(row, 'Baixar', () => startDl(row));
    emPaint();
  }
  function settle(row) {
    const k = row.f.kind;
    setP(row, row.stopAt);
    if (k === 'ok' || k === 'video') {
      row.state = 'done';
      row.st.textContent = 'Completo · ' + (k === 'video' ? 'abre no navegador' : 'abre no Spotify');
      if (k === 'ok') setLinkAction(row, 'Abrir no Spotify ↗', row.f.href);
      else setAction(row, 'Assistir no navegador', (e) => LH.browse('www.youtube.com/horney', e.currentTarget), 'btn--go');
      LH.sfx('done');
      LH.announce('Download completo: ' + row.f.name);
    } else if (k === 'virus') {
      row.state = 'blocked';
      row.li.classList.add('is-blocked');
      row.st.textContent = 'BLOQUEADO pelo antivírus (desatualizado desde 2004, mas esse ele pegou)';
      setAction(row, 'Excluir', () => removeRow(row));
      LH.sfx('error');
      LH.announce('Download bloqueado pelo antivírus: ' + row.f.name);
    } else if (k === 'stuck') {
      row.state = 'stuck';
      row.li.classList.add('is-stuck');
      row.st.textContent = '99% · aguardando 1 fonte… desde 2006';
      setAction(row, 'Cancelar', () => cancelDl(row));
    } else {
      row.state = 'offline';
      row.st.textContent = 'fonte offline: o dono desligou o PC';
      setAction(row, 'Tentar de novo', () => startDl(row));
    }
    emPaint();
  }
  function removeRow(row) {
    const next = rows.slice(row.i + 1).find((r) => r.li.isConnected) || rows.slice(0, row.i).reverse().find((r) => r.li.isConnected);
    row.li.remove();
    row.state = 'removed';
    LH.announce(row.f.name + ' excluído. Boa.');
    emPaint();
    if (next) { const b = $('button, a', next.act); if (b) b.focus(); }
  }
  function emFrame(now) {
    emRaf = 0;
    let active = false;
    rows.forEach((row) => {
      if (row.state !== 'down') return;
      const p = Math.min(row.stopAt, ((now - row.start) / row.dur) * (row.stopAt || 1));
      const done = now - row.start >= row.dur;
      if (Math.abs(p - row.p) > 0.002) setP(row, p);
      if (row.f.kind !== 'offline' && now - row.lastSpeed > 320) {
        row.lastSpeed = now;
        row.st.textContent = Math.round(p * 100) + '% · ' + (2 + Math.random() * 30).toFixed(1).replace('.', ',') + ' kB/s';
      }
      if (done) settle(row);
      else active = true;
    });
    if (active) emRaf = requestAnimationFrame(emFrame);
  }
  emPaint();
})();
