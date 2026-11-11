/*
  horkut — HORNEY concept 13 · script.js
  Hash-routed Orkut clone. Shared fan wall + oracle through ../assets/oraculo.js (window.Horney).
  SECURITY: every fan-provided string (names, recados, perguntas, enquete "outra", hash params)
  goes into the DOM as text nodes / textContent only. Never innerHTML.
*/
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var H = window.Horney && window.Horney.mural && window.Horney.oraculo ? window.Horney : null;
  var A = '../assets/';
  var P = 'horney:horkut:';
  var U = {
    ig: 'https://www.instagram.com/horney.band/',
    dm: 'https://ig.me/m/horney.band',
    tiktok: 'https://www.tiktok.com/@horney.band',
    threads: 'https://www.threads.com/@horney.band',
    yt: 'https://www.youtube.com/@bandaHorney',
    spotify: 'https://open.spotify.com/artist/5zJVmieIGGEeOKbIrXmhZi',
    presave: 'https://ps.algohits.com/horney-anti-raso',
    unglued: 'https://www.unglued.com.br/reviews/anti-raso',
    antiRaso: 'https://open.spotify.com/album/7EM81z5ydGQq04ZbkIE5aS',
    mergulhar: 'https://open.spotify.com/album/5jJ1py37M3i7qaZgkOOf4V',
    off: 'https://open.spotify.com/album/6Cg0ULHHKTsJo7GlEfPKrF',
    fourRooms: 'https://open.spotify.com/album/3m7dNgjIIiHDuZiNcu8Vhi'
  };
  var MURAL_DOWN = 'o servidor de recados não carregou (bad, bad server). o resto do horkut funciona normal.';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var RM = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { RM = e.matches; });

  /* ================= helpers ================= */
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }

  function append(n, kids) {
    (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null || c === false) return;
      n.appendChild(typeof c === 'string' || typeof c === 'number' ? doc.createTextNode(String(c)) : c);
    });
    return n;
  }
  function el(tag, props, kids) {
    var n = doc.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'on') Object.keys(v).forEach(function (ev) { n.addEventListener(ev, v[ev]); });
        else if (k === 'ext') { n.target = '_blank'; n.rel = 'noopener'; }
        else if (v === true) n.setAttribute(k, '');
        else n.setAttribute(k, String(v));
      });
    }
    if (kids != null) append(n, kids);
    return n;
  }
  function link(href, text, cls) {
    return el('a', { href: href, class: cls || null, ext: /^https?:/.test(href) }, text);
  }
  function chars(s) { return Array.from(String(s)); }
  function clip(s, n) { var c = chars(s); return c.length > n ? c.slice(0, n).join('') + '…' : String(s); }
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function fmtN(n) { return n.toLocaleString('pt-BR'); }
  var uid = 0;
  function nid(p) { uid += 1; return (p || 'x') + uid; }
  function has(o, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); }

  function load(k, d) {
    try { var v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  }
  function save(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { /* memória só */ } }
  function drop(k) { try { localStorage.removeItem(P + k); } catch (e) { /* nada */ } }

  /* ================= dates ================= */
  var MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtDate(t) { var d = new Date(t); return d.getDate() + ' ' + MES[d.getMonth()] + ' ' + d.getFullYear(); }
  function rel(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var s = (Date.now() - t) / 1000;
    if (s < 45) return 'agora mesmo';
    if (s < 3600) { var m = Math.round(s / 60); return 'há ' + m + (m === 1 ? ' minuto' : ' minutos'); }
    if (s < 86400) { var h = Math.round(s / 3600); return 'há ' + h + (h === 1 ? ' hora' : ' horas'); }
    var d = Math.floor(s / 86400);
    if (d === 1) return 'ontem';
    if (d < 7) return 'há ' + d + ' dias';
    return fmtDate(t);
  }
  function timeEl(iso, cls) { return el('time', { class: cls || 'when', datetime: iso }, rel(iso)); }

  /* ================= content (from the canonical content sheet) ================= */
  var TRACKS = [
    { n: '01', t: 'OFF!', d: '3:19', id: '7KteAUfbNB4CtxnbMudBad' },
    { n: '02', t: 'QUEBRA-CABEÇA', feat: 'feat. Dani Buarque', d: '4:20', id: '3SYpLwh1ChHyNEOn5TNOWy' },
    { n: '03', t: 'MERGULHAR', d: '3:45', id: '0aJtgSakI5r87CfAqNdDXP' },
    { n: '04', t: 'ROMÂNTICA', d: '2:28', id: '2p5r9m60eSDxMGey8GRubR' }
  ];
  function trackUrl(i) { return 'https://open.spotify.com/track/' + TRACKS[i].id; }

  var RELEASES = [
    { t: 'ANTI-RASO', meta: 'EP · 30.07.2026 · 4 faixas', img: 'cover-anti-raso.jpg', alt: 'Capa do EP ANTI-RASO: uma porta aberta no meio do mar, um olho gigante e raios em magenta e azul.', href: U.antiRaso },
    { t: 'MERGULHAR', meta: 'single · 2026 · também está no EP ANTI-RASO', img: 'cover-mergulhar.jpg', alt: 'Capa do single MERGULHAR', href: U.mergulhar },
    { t: 'OFF!', meta: 'single · 13 NOV 2025 · abre o EP ANTI-RASO', img: 'cover-off.jpg', alt: 'Capa do single OFF!', href: U.off },
    { t: 'Four Rooms for Four Fools', meta: 'EP · 2022', img: 'cover-four-rooms.jpg', alt: 'Capa de Four Rooms for Four Fools', href: U.fourRooms }
  ];

  var VIDEOS = [
    { id: '9uP1P11at9M', title: 'HORNEY — Fool\'s Game (videoclipe oficial)', label: 'Fool\'s Game', meta: 'clipe oficial (2022), dir. Rique Duarte', img: 'yt-fools-game.jpg' },
    { id: 'V9Rpgtc2vTs', title: 'HORNEY ao vivo (clipe de 38s)', label: 'HORNEY ao vivo', meta: 'ao vivo · 0:38 — 38 segundos de HORNEY ao vivo. Agora imagina inteiro, na tua frente.', img: 'yt-live.jpg' }
  ];

  /* Shows: one data array. Status is computed from today's date at runtime. */
  var SHOWS = [
    { date: '2026-09-17', title: 'ROCK NIGHT @ FFFront — São Paulo', where: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso', txt: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.', flyer: true, linkLabel: 'Fotos no IG ↗' },
    { date: '2026-10-03', title: 'Show — 03 de outubro', where: 'local não divulgado aqui', txt: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤', linkLabel: 'Fotos no IG ↗' },
    { date: '2026-10-09', title: 'ÚLTIMO SHOW DO ANO ⚡️😈', where: 'LOCAL EM BREVE — fica de olho no insta', txt: 'Último show do ano. SAI DE CASA E COLE NOS SHOWS!!! Local e ingressos saem primeiro nos stories.', linkLabel: 'Infos no IG ↗' }
  ];
  var RSVP_SEED = { '2026-09-17': 212, '2026-10-03': 96, '2026-10-09': 241 };
  var STATUS = { past: 'já rolou', today: 'HOJE!!!', next: 'próximo' };
  function showStatus(s) { var t = dayKey(new Date()); return s.date < t ? 'past' : (s.date === t ? 'today' : 'next'); }
  function nextShow() {
    var t = dayKey(new Date());
    return SHOWS.filter(function (s) { return s.date >= t; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0] || null;
  }
  function showDate(iso) { var p = iso.split('-'); return { d: p[2], m: MES[parseInt(p[1], 10) - 1].toUpperCase(), y: p[0] }; }

  var MERCH = [
    { t: 'Camiseta ANTI-RASO', d: 'Preta, com a capa do EP no peito: a porta no mar, o olho e o raio.', art: 'art--tee', img: 'cover-anti-raso.jpg', w: 640, h: 640 },
    { t: 'Camiseta OLHO', d: 'Amarela HORNEY com o olho-sol do logo em preto. Pra ser visto de longe na grade.', art: 'art--tee art--y', img: 'eye-tight.png', w: 458, h: 418 },
    { t: 'Moletom OFF!', d: 'pra Joinville no inverno. e no verão também.', art: 'art--tee art--hood', img: 'cover-off.jpg', w: 640, h: 640 },
    { t: 'Ecobag H◎RNEY', d: 'Algodão cru com o logo amarelo. Cabe o merch, o casaco e a água do show.', art: 'art--tote', img: 'eye-sun.png', w: 300, h: 300 },
    { t: 'Pôster OFF!', d: 'A3, tiragem limitada.', art: 'art--poster', img: 'cover-off.jpg', w: 640, h: 640 },
    { t: 'Kit de bottons', d: 'pra mochila, pra jaqueta, pro seu Top 8 da vida real.', art: 'art--buttons' },
    { t: 'Kit de adesivos', d: 'Olho, capa de ANTI-RASO e logo — pra colar no case, no skate, no capacete.', art: 'art--stickers' }
  ];

  var MOODS = ['ANTI-RASO 😈⚡️', 'mergulhando 🌊', 'quebrando a cabeça 🧩', 'romântica 💔', 'OFF! 🔌', 'com saudade do palco 🎸', 'sem superfície nenhuma ◎'];

  var FRIENDS = [
    { id: 'duda', name: 'Duda Maiolini', role: 'voz & letras · HORNEY', txt: '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.”', img: 'ig-post-2.jpg', w: 640, h: 640, links: [['ler o manifesto', '#/comunidade/odeio-raso']] },
    { id: 'rafa', name: 'Rafa Bello', role: 'composição · HORNEY', txt: 'Escreve as músicas junto com a Duda. Se o refrão grudou na tua cabeça, a culpa é dividida.', glyph: '✍️', links: [['ouvir MERGULHAR ↗', U.mergulhar]] },
    { id: 'mais2', name: '+2', role: 'o resto do quarteto', txt: '+2 que fazem o barulho todo acontecer.', glyph: '+2', links: [['ver ao vivo', '#/videos']] },
    { id: 'dani', name: 'Dani Buarque', role: 'feat. em QUEBRA-CABEÇA', txt: 'Divide a faixa 2 de ANTI-RASO com a HORNEY. Tem peça que só encaixa a dois.', glyph: '🧩', links: [['ouvir QUEBRA-CABEÇA ↗', 'https://open.spotify.com/track/3SYpLwh1ChHyNEOn5TNOWy']] },
    { id: 'mastrobiso', name: 'Mastrobiso', role: 'dividiu o palco no Rock Night', txt: 'Qui, 17/09/2026, FFFront, São Paulo: HORNEY + Mastrobiso no mesmo flyer — e que flyer.', glyph: '🎸', links: [['ver o flyer', '#/foto/flyer']] },
    { id: 'unglued', name: 'Unglued', role: 'deu 7.8/10 pro ANTI-RASO', txt: 'A review de ANTI-RASO na Unglued: 7.8 de 10. A gente imprimiu e colou na geladeira (mentalmente).', glyph: '7.8', links: [['ler a review ↗', U.unglued]] },
    { id: 'fffront', name: 'FFFront', role: 'casa do Rock Night em SP', txt: 'Rua Purpurina, 199 — Vila Madalena, São Paulo. Onde Joinville fez barulho em 17/09.', img: 'sympla-rock-night.jpg', w: 1179, h: 662, links: [['ver os shows', '#/comunidade/show']] },
    { id: 'joinville', name: 'Joinville', role: 'hometown · Santa Catarina', txt: 'De onde vem o barulho. Um quarteto de Joinville (SC), lançando som desde o primeiro EP, em 2022.', glyph: 'SC', links: [['ver as fotos', '#/fotos']] }
  ];

  var ALBUMS = [
    { id: 'ao-vivo', t: 'ao vivo (suor incluso)', photos: ['duda', 'plateia', 'luz-azul', 'recado'] },
    { id: 'galera', t: 'a galera da grade', photos: ['chifrinhos', 'reel'] },
    { id: 'cartazes', t: 'cartazes e flyers', photos: ['chamas', 'flyer'] },
    { id: 'capas', t: 'capas (sem vírus)', photos: ['c-anti-raso', 'c-mergulhar', 'c-off', 'c-four-rooms'] }
  ];
  var PHOTOS = {
    'duda': { f: 'ig-post-2.jpg', w: 640, h: 640, short: 'Duda na luz vermelha', alt: 'Duda Maiolini cantando no microfone, luz vermelha, guitarrista ao fundo' },
    'plateia': { f: 'live-crowd.jpg', w: 1366, h: 768, short: 'plateia lotada', alt: 'Vocalista de costas diante de uma plateia lotada' },
    'luz-azul': { f: 'ig-post-3.jpg', w: 640, h: 480, short: 'luz azul', alt: 'Frame de vídeo ao vivo em luz azul', note: 'o ▶ é da foto mesmo. não adianta clicar (a gente tentou). os vídeos de verdade ficam em vídeos.', noteLink: ['ver os vídeos', '#/videos'] },
    'recado': { f: 'ig-post-4.jpg', w: 640, h: 640, short: 'UM RECADO IMPORTANTE', alt: 'Guitarrista de cabelo cacheado em luz vermelha com o texto “UM RECADO IMPORTANTE”', note: 'um recado importante: deixa o seu também.', noteLink: ['deixar recado', '#/recados'] },
    'chifrinhos': { f: 'ig-post-5.jpg', w: 640, h: 639, short: 'chifrinhos pós-show', alt: 'Público fazendo chifrinho e sorrindo depois do show' },
    'reel': { f: 'ig-reel-1.jpg', w: 360, h: 640, short: 'frame de reel', alt: 'Frame de reel do Instagram da banda', note: 'o ▶ é da foto. o reel mesmo mora no Instagram.', noteLink: ['abrir o Instagram ↗', U.ig] },
    'chamas': { f: 'ig-post-1.jpg', w: 640, h: 640, short: 'cartaz em chamas', alt: 'Pôster com a banda HORNEY dentro de um aro de chamas laranja e magenta' },
    'flyer': { f: 'sympla-rock-night.jpg', w: 1179, h: 662, short: 'flyer do Rock Night', alt: 'Flyer do Rock Night na FFFront, São Paulo, com HORNEY e Mastrobiso', note: 'Qui, 17/09/2026, FFFront, São Paulo: HORNEY + Mastrobiso no mesmo flyer — e que flyer.', noteLink: ['ver o evento', '#/comunidade/show'] },
    'c-anti-raso': { f: 'cover-anti-raso.jpg', w: 640, h: 640, short: 'capa do ANTI-RASO', alt: 'Capa do EP ANTI-RASO: uma porta aberta no meio do mar, um olho gigante e raios em magenta e azul.', noteLink: ['ouvir ANTI-RASO ↗', U.antiRaso] },
    'c-mergulhar': { f: 'cover-mergulhar.jpg', w: 640, h: 640, short: 'capa de MERGULHAR', alt: 'Capa do single MERGULHAR', noteLink: ['ouvir MERGULHAR ↗', U.mergulhar] },
    'c-off': { f: 'cover-off.jpg', w: 640, h: 640, short: 'capa de OFF!', alt: 'Capa do single OFF!', noteLink: ['ouvir OFF! ↗', U.off] },
    'c-four-rooms': { f: 'cover-four-rooms.jpg', w: 640, h: 640, short: 'capa de Four Rooms', alt: 'Capa de Four Rooms for Four Fools', noteLink: ['ouvir Four Rooms for Four Fools ↗', U.fourRooms] }
  };
  ALBUMS.forEach(function (al) { al.photos.forEach(function (id) { PHOTOS[id].album = al; }); });
  function photoPrefix(p) { return '📷 ' + p.short + ': '; }

  var CAPITAIS = ['Aracaju', 'Belém', 'Belo Horizonte', 'Boa Vista', 'Brasília', 'Campo Grande', 'Cuiabá', 'Curitiba', 'Florianópolis', 'Fortaleza', 'Goiânia', 'João Pessoa', 'Macapá', 'Maceió', 'Manaus', 'Natal', 'Palmas', 'Porto Alegre', 'Porto Velho', 'Recife', 'Rio Branco', 'Rio de Janeiro', 'Salvador', 'São Luís', 'São Paulo', 'Teresina', 'Vitória'];
  var CAP_SEED = { 'Curitiba': 64, 'Florianópolis': 58, 'Porto Alegre': 41, 'São Paulo': 37, 'Rio de Janeiro': 22, 'Belo Horizonte': 19, 'Brasília': 12, 'Recife': 9, 'Salvador': 8, 'Fortaleza': 6, 'Goiânia': 5, 'Vitória': 4, 'Campo Grande': 4, 'Belém': 3, 'Manaus': 3, 'Natal': 2, 'João Pessoa': 2, 'Cuiabá': 2 };

  var POLLS = {
    'anti-raso': { q: 'Qual faixa do ANTI-RASO te pegou mais?', opts: [['OFF!', 41], ['QUEBRA-CABEÇA (feat. Dani Buarque)', 33], ['MERGULHAR', 47], ['ROMÂNTICA', 29]] },
    'show': { q: 'Onde você fica no show?', opts: [['na grade, gritando', 52], ['no meio da roda', 31], ['lá atrás filmando (raso)', 9], ['no bar, mas cantando', 17]] },
    'discografia': { q: 'Seu lançamento favorito?', opts: [['ANTI-RASO (2026)', 58], ['MERGULHAR (2026)', 21], ['OFF! (2025)', 26], ['Four Rooms for Four Fools (2022)', 19]] },
    'odeio-raso': { q: 'Música rasa é…', opts: [['crime', 22], ['coisa de algoritmo', 37], ['ouvir no 1.5x', 18], ['pular faixa', 25]] },
    'merch': { q: 'Qual merch você quer primeiro?', opts: MERCH.map(function (m, i) { return [m.t, [44, 39, 27, 21, 15, 12, 18][i]]; }) },
    'cidade': { q: 'Em qual cidade você quer ver a HORNEY?', opts: CAPITAIS.map(function (c) { return [c, CAP_SEED[c] || 1]; }).concat([['outra cidade', 47]]), select: true, other: true, top: 10 },
    'videos': { q: 'Qual vídeo você assistia escondido?', opts: [['Fool\'s Game (clipe oficial)', 34], ['HORNEY ao vivo (38s)', 27]] },
    'geladeira': { q: 'O que você encontra quando abre a geladeira?', opts: [['o refrão', 19], ['um fone esquecido', 8], ['nada (de novo)', 23], ['a review da Unglued, colada mentalmente', 11]] },
    'grade': { q: 'Quanto tempo sua voz dura depois do show?', opts: [['acabou no OFF!', 21], ['até o fim do show', 14], ['volta na terça', 17], ['que voz?', 26]] },
    'olho': { q: 'O olho tá te olhando agora?', opts: [['sim', 31], ['com certeza', 24], ['mexe o mouse e vê', 40]] }
  };

  var COMMS = [
    { slug: 'anti-raso', name: 'ANTI-RASO (EP oficial)', cat: 'Música', img: { f: 'cover-anti-raso.jpg', w: 640, h: 640 }, members: 1312,
      desc: ['Comunidade oficial do EP ANTI-RASO, lançado em 30.07.2026. 4 faixas · 13:53 · 7.8/10 na Unglued.', '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.” — Duda Maiolini, voz & letras'],
      topics: [
        { t: '01 · OFF!', by: 'HORNEY', n: 58, body: '3:19. Abre o EP. Saiu antes como single, em 13.11.2025.', link: ['ouvir OFF! no Spotify ↗', trackUrl(0)] },
        { t: '02 · QUEBRA-CABEÇA (feat. Dani Buarque)', by: 'HORNEY', n: 44, body: '4:20. Divide a faixa 2 de ANTI-RASO com a HORNEY. Tem peça que só encaixa a dois.', link: ['ouvir QUEBRA-CABEÇA no Spotify ↗', trackUrl(1)] },
        { t: '03 · MERGULHAR', by: 'HORNEY', n: 61, body: '3:45. Também saiu como single em 2026.', link: ['ouvir MERGULHAR no Spotify ↗', trackUrl(2)] },
        { t: '04 · ROMÂNTICA', by: 'HORNEY', n: 39, body: '2:28. Fecha o EP.', link: ['ouvir ROMÂNTICA no Spotify ↗', trackUrl(3)] }
      ] },
    { slug: 'show', name: 'Eu vou no show da HORNEY', cat: 'Eventos', img: { f: 'ig-post-5.jpg', w: 640, h: 639 }, members: 874,
      desc: ['SAI DE CASA E COLE NOS SHOWS!!! Aqui ficam os eventos da HORNEY. Clica em “eu vou!” (ou “eu fui!”) e entra pra lista.'],
      topics: [
        { t: 'quando é o próximo??', by: 'gritei_no_OFF', n: 27, body: 'sem shows marcados — cola no Instagram pra saber primeiro.', link: ['@horney.band no Instagram ↗', U.ig], live: 'next' },
        { t: 'ROCK NIGHT @ FFFront: quem foi?', by: 'HORNEY', n: 33, body: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.', link: ['ver o flyer', '#/foto/flyer'] },
        { t: '03/10: valeu quem colou', by: 'HORNEY', n: 12, body: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤' }
      ] },
    { slug: 'discografia', name: 'Discografia completa (sem vírus)', cat: 'Música', img: { f: 'cover-four-rooms.jpg', w: 640, h: 640 }, members: 655,
      desc: ['Tudo que a HORNEY lançou, em ordem. Sem .exe, sem .zip, sem vírus: só link oficial.'],
      topics: [
        { t: '[DOWNLOAD] ANTI-RASO.zip (link direto!!!)', by: 'xX_mergulhadora_Xx', n: 15, body: 'não tem .zip. tem Spotify. é link oficial, não pega vírus e a banda agradece.', link: ['ANTI-RASO no Spotify ↗', U.antiRaso] },
        { t: 'MERGULHAR_single_FINAL_v2 (1).mp3', by: 'romantica_sim_raso_nao', n: 9, body: 'single de 2026 que também está no EP ANTI-RASO. sem v2, sem (1): a versão oficial tá aqui.', link: ['MERGULHAR no Spotify ↗', U.mergulhar] },
        { t: 'OFF! (single 2025) rip 320kbps', by: 'punk.de.joinville.666', n: 11, body: 'single lançado em 13 de novembro de 2025. abre o EP ANTI-RASO.', link: ['OFF! no Spotify ↗', U.off] },
        { t: 'Four Rooms for Four Fools (2022) COMPLETO', by: 'emo_desde_2005', n: 21, body: 'o primeiro EP, de 2022. quem tá desde lá levanta a mão.', link: ['Four Rooms for Four Fools no Spotify ↗', U.fourRooms] }
      ] },
    { slug: 'odeio-raso', name: 'Eu odeio música rasa', cat: 'Música', img: { f: 'ig-post-4.jpg', w: 640, h: 640 }, members: 1033,
      desc: ['Pra quem ouve o disco inteiro, sem pular faixa. Manifesto oficial logo abaixo.'],
      topics: [
        { t: 'o que é ANTI-RASO, afinal?', by: 'HORNEY', n: 47, body: '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.” — Duda' },
        { t: 'pesado ou melancólico? escolhe um', by: 'emo_desde_2005', n: 19, body: '“A Horney não é uma banda que vai tocar só rock pesado, nem uma banda que vai tocar só música melancólica.” — Duda, respondendo antes de você perguntar.' },
        { t: 'ouvir no 1.5x é raso?', by: 'vovo_rocker_sc', n: 8, body: 'é. pergunta pro Oráculo do Olho se você duvida.', link: ['perguntar ao olho', '#/oraculo'] }
      ] },
    { slug: 'merch', name: 'Quem tem merch da HORNEY levanta a mão', cat: 'Moda', img: { f: 'eye-sun.png', w: 300, h: 300 }, members: 288,
      desc: ['Ninguém levantou ainda: tá tudo EM BREVE. Nada de carrinho, nada de checkout. Quer garantir? Manda DM e a gente te avisa primeiro.'],
      topics: [
        { t: 'cadê a camiseta do olho??', by: 'Rafa (não o Bello)', n: 16, body: 'EM BREVE. sem preço ainda. quem manda DM fica sabendo primeiro.', link: ['Quero — DM ↗', U.dm] },
        { t: 'quanto custa?', by: 'punk.de.joinville.666', n: 6, body: 'ainda não tem preço. nada à venda ainda. a DM tá aberta.', link: ['Mandar DM ↗', U.dm] }
      ] },
    { slug: 'cidade', name: 'Queremos HORNEY na minha cidade', cat: 'Cidades', img: { f: 'live-crowd.jpg', w: 1366, h: 768 }, members: 517, pollInBody: true,
      desc: ['Não viu sua cidade? Vota na enquete e chama a gente na DM. Datas novas saem primeiro no Instagram.'],
      topics: [
        { t: 'Joinville invadiu SP. qual é a próxima?', by: 'HORNEY', n: 22, body: 'Em 17/09 foi na FFFront, em São Paulo, com a Mastrobiso. Quer na tua cidade? Vota aqui e manda DM.', link: ['Mandar DM ↗', U.dm] },
        { t: 'como levo a HORNEY pra minha cidade?', by: 'vovo_rocker_sc', n: 14, body: 'Não viu sua cidade? Chama a gente — DM no Instagram. Datas novas saem primeiro lá.', link: ['DM no Instagram ↗', U.dm] }
      ] },
    { slug: 'videos', name: 'Vídeos que a mãe não deixava ver', cat: 'Vídeos', img: { f: 'yt-fools-game.jpg', w: 1280, h: 720 }, members: 402,
      desc: ['Um clipe de olhar fixo e 38 segundos de suor. Volume no máximo e porta do quarto fechada.'],
      topics: [
        { t: 'Fool\'s Game: quem dirigiu?', by: 'olhinho.do.O', n: 7, body: 'Rique Duarte. Clipe oficial, 2022.', link: ['canal @bandaHorney ↗', U.yt] },
        { t: '38 segundos é pouco', by: 'gritei_no_OFF', n: 13, body: '38 segundos de HORNEY ao vivo. Agora imagina inteiro, na tua frente.', link: ['ir pros shows', '#/comunidade/show'] }
      ] },
    { slug: 'geladeira', name: 'Eu abro a geladeira pra pensar no refrão', cat: 'Humor', glyph: '🧊', members: 219,
      desc: ['Você abre, olha, fecha, abre de novo. Não queria comer. Queria o refrão.'],
      topics: [
        { t: 'abri a geladeira 14 vezes hoje', by: '~*quebra_cabeca_girl*~', n: 18, body: 'ainda não montei o refrão. nem o QUEBRA-CABEÇA.' },
        { t: 'o que tem na sua geladeira agora?', by: 'tom_from_2004', n: 25, body: 'aqui: a review da Unglued, colada mentalmente. 7.8.', link: ['ler a review ↗', U.unglued] }
      ] },
    { slug: 'grade', name: 'Eu grito o refrão de OFF! na grade', cat: 'Humor', glyph: '🔌', members: 377,
      desc: ['Você. No próximo show. Na grade. Gritando o refrão de OFF!'],
      topics: [
        { t: 'meu pescoço ainda não voltou', by: 'gritei_no_OFF', n: 31, body: 'meu pescoço ainda não voltou desde o último show. vale cada vértebra' },
        { t: 'trocaria meu Top 8 por um lugar na grade', by: 'emo_desde_2005', n: 17, body: 'trocaria meu Top 8 inteiro por um lugar na grade no último show do ano. EXCETO a HORNEY.', link: ['eventos', '#/comunidade/show'] }
      ] },
    { slug: 'olho', name: 'Eu já reparei no olho dentro do O', cat: 'Mistério', glyph: '◎', members: 146,
      desc: ['alguém mais reparou que tem um olho dentro do O do logo?? ele tá me olhando agora'],
      topics: [
        { t: 'ele tá me olhando agora', by: 'olhinho.do.O', n: 29, body: 'mexe o mouse. ele acompanha. não é impressão.' },
        { t: 'perguntei pro olho e ele respondeu', by: 'xX_mergulhadora_Xx', n: 12, body: 'é sério. tem um aplicativo. vai lá e pergunta.', link: ['abrir o Oráculo do Olho', '#/oraculo'] }
      ] }
  ];
  var COMM_BY = {};
  COMMS.forEach(function (c) { COMM_BY[c.slug] = c; });

  var KARMA = [
    { k: 'fas', label: 'fãs', icon: '★', base: 2.8 },
    { k: 'confiavel', label: 'confiável', icon: '☺', base: 2.4 },
    { k: 'legal', label: 'legal', icon: '❄', base: 2.9 },
    { k: 'sexy', label: 'sexy', icon: '♥', base: 2.6 }
  ];
  var KARMA_N = 37;

  /* ================= local state ================= */
  var S = {
    me: null, meTemp: false,
    msgs: [], loaded: false, mine: Object.create(null),
    prevVisit: null,
    karma: {}, comms: [], rsvp: [], polls: {}, friend: null, pend: Object.create(null),
    timers: Object.create(null), draft: ''
  };
  (function loadState() {
    var me = load('me', null);
    if (me && typeof me === 'object' && typeof me.name === 'string') S.me = { name: chars(me.name).slice(0, 40).join(''), skipped: !!me.skipped };
    var pv = load('visit', null);
    if (typeof pv === 'string' && !isNaN(Date.parse(pv))) S.prevVisit = new Date(Date.parse(pv)).toISOString();
    save('visit', new Date().toISOString());
    var k = load('karma', {});
    if (k && typeof k === 'object') KARMA.forEach(function (t) { var v = k[t.k]; if (v === 0 || v === 1 || v === 2 || v === 3) S.karma[t.k] = v; });
    var c = load('comms', []);
    if (Array.isArray(c)) S.comms = c.filter(function (s) { return has(COMM_BY, s); });
    var r = load('rsvp', []);
    if (Array.isArray(r)) S.rsvp = r.filter(function (d) { return has(RSVP_SEED, d); });
    var p = load('polls', {});
    if (p && typeof p === 'object') Object.keys(POLLS).forEach(function (id) {
      var v = p[id];
      if (v && typeof v.i === 'number' && v.i >= 0 && v.i < POLLS[id].opts.length && Math.floor(v.i) === v.i) {
        S.polls[id] = { i: v.i };
        if (POLLS[id].other && typeof v.o === 'string' && v.o.trim()) S.polls[id].o = chars(v.o.trim()).slice(0, 40).join('');
      }
    });
    var f = load('friend', null);
    if (f && (f.state === 'pending' || f.state === 'friends') && typeof f.at === 'number') S.friend = { state: f.state, at: f.at };
    var pend = load('depo-pending', {});
    if (pend && typeof pend === 'object') Object.keys(pend).forEach(function (id) { if (typeof pend[id] === 'number') S.pend[id] = pend[id]; });
  })();

  function myName() { return S.me && S.me.name ? S.me.name : ''; }
  function saveMe() { if (S.me && !S.meTemp) save('me', S.me); }
  function rememberName(name) {
    if (!name) return;
    if (!S.me || S.me.name !== name) {
      S.me = { name: name, skipped: false };
      saveMe();
      renderMe();
    }
  }

  /* ================= toasts ================= */
  var toastsEl = $('#toasts');
  function toast(msg) {
    if (!toastsEl) return;
    var t = el('div', { class: 'toast' }, msg);
    toastsEl.appendChild(t);
    while (toastsEl.children.length > 3) toastsEl.removeChild(toastsEl.firstChild);
    requestAnimationFrame(function () { t.classList.add('is-in'); });
    setTimeout(function () {
      t.classList.remove('is-in');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, RM ? 0 : 260);
    }, 4600);
  }

  /* ================= the Eye (vector, cursor-tracking, blinking) ================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ALMOND = 'M32 100 Q100 22 168 100 Q100 178 32 100 Z';
  var SUN = (function () {
    var pts = [];
    for (var i = 0; i < 36; i++) {
      var a = i * Math.PI / 18 - Math.PI / 2;
      var r = i % 2 ? 72 : 97;
      pts.push((100 + Math.cos(a) * r).toFixed(1) + ',' + (100 + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(' ');
  })();
  function svg(tag, attrs) {
    var n = doc.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  var EYES = [];
  var eyeSeq = 0;
  var ptr = null;
  var rafId = 0;
  var rectsDirty = true;
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var e = en.target.__eye;
      if (e) { e.visible = en.isIntersecting; e.rect = null; }
    });
    kick();
    scheduleBlink();
  }) : null;

  function makeEye(size) {
    eyeSeq += 1;
    var cid = 'eyeclip-' + eyeSeq;
    var s = svg('svg', { viewBox: '0 0 200 200', class: 'eye eye--' + size, 'aria-hidden': 'true', focusable: 'false' });
    var defs = svg('defs', {});
    var cp = svg('clipPath', { id: cid });
    cp.appendChild(svg('path', { d: ALMOND }));
    defs.appendChild(cp);
    s.appendChild(defs);
    s.appendChild(svg('circle', { cx: '100', cy: '100', r: '99', class: 'eye__disc' }));
    s.appendChild(svg('polygon', { points: SUN, class: 'eye__sun' }));
    var g = svg('g', { 'clip-path': 'url(#' + cid + ')' });
    g.appendChild(svg('path', { d: ALMOND, class: 'eye__white' }));
    var iris = svg('g', { class: 'eye__iris' });
    var pupil = svg('g', {});
    pupil.appendChild(svg('circle', { cx: '100', cy: '100', r: '26', class: 'eye__pupil' }));
    iris.appendChild(pupil);
    iris.appendChild(svg('circle', { cx: '110', cy: '90', r: '7', class: 'eye__glint' }));
    g.appendChild(iris);
    g.appendChild(svg('rect', { x: '28', y: '58', width: '144', height: '44', class: 'eye__lid eye__lid--top' }));
    g.appendChild(svg('rect', { x: '28', y: '98', width: '144', height: '44', class: 'eye__lid eye__lid--bot' }));
    s.appendChild(g);
    var e = { root: s, iris: iris, pupil: pupil, x: 0, y: 0, sc: 1, wx: null, wy: null, ws: null, rect: null, visible: !io, dilate: 0, lookAt: null, dilT: 0 };
    s.__eye = e;
    EYES.push(e);
    if (io) io.observe(s);
    return e;
  }
  function kick() {
    if (!rafId && !doc.hidden) rafId = requestAnimationFrame(tick);
  }
  function tick() {
    rafId = 0;
    EYES = EYES.filter(function (e) {
      if (e.root.isConnected) return true;
      if (io) io.unobserve(e.root);
      return false;
    });
    var active = EYES.filter(function (e) { return e.visible; });
    active.forEach(function (e) { if (rectsDirty || !e.rect) e.rect = e.root.getBoundingClientRect(); });
    rectsDirty = false;
    var moving = false;
    var f = RM ? 1 : 0.2;
    active.forEach(function (e) {
      var tx = 0, ty = 0;
      var look = e.lookAt || ptr;
      if (look && e.rect && e.rect.width) {
        var dx = look.x - (e.rect.left + e.rect.width / 2);
        var dy = look.y - (e.rect.top + e.rect.height / 2);
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var k = Math.min(1, d / 260);
        tx = dx / d * 30 * k;
        ty = dy / d * 13 * k;
      }
      var ts = 1 + e.dilate * 0.32;
      e.x += (tx - e.x) * f;
      e.y += (ty - e.y) * f;
      e.sc += (ts - e.sc) * f;
      if (Math.abs(tx - e.x) > 0.05 || Math.abs(ty - e.y) > 0.05 || Math.abs(ts - e.sc) > 0.002) moving = true;
      else { e.x = tx; e.y = ty; e.sc = ts; }
      var x = Math.round(e.x * 10) / 10, y = Math.round(e.y * 10) / 10, sc = Math.round(e.sc * 1000) / 1000;
      if (x !== e.wx || y !== e.wy) { e.iris.setAttribute('transform', 'translate(' + x + ' ' + y + ')'); e.wx = x; e.wy = y; }
      if (sc !== e.ws) { e.pupil.setAttribute('transform', 'translate(100 100) scale(' + sc + ') translate(-100 -100)'); e.ws = sc; }
    });
    if (moving) kick();
  }
  function blink(e) {
    if (RM || !e) return;
    e.root.classList.add('is-blink');
    setTimeout(function () { e.root.classList.remove('is-blink'); }, 150);
  }
  function dilate(e, ms) {
    e.dilate = 1;
    clearTimeout(e.dilT);
    e.dilT = setTimeout(function () { e.dilate = 0; kick(); }, ms || 700);
    kick();
  }
  var blinkT = 0;
  function scheduleBlink() {
    if (blinkT || RM || doc.hidden) return;
    if (!EYES.some(function (e) { return e.visible && e.root.isConnected; })) return;
    blinkT = setTimeout(function () {
      blinkT = 0;
      EYES.forEach(function (e) { if (e.visible && e.root.isConnected) blink(e); });
      scheduleBlink();
    }, 2600 + Math.random() * 4200);
  }
  window.addEventListener('pointermove', function (ev) { ptr = { x: ev.clientX, y: ev.clientY }; rectsDirty = true; kick(); }, { passive: true });
  window.addEventListener('pointerdown', function (ev) { ptr = { x: ev.clientX, y: ev.clientY }; rectsDirty = true; kick(); }, { passive: true });
  window.addEventListener('scroll', function () { rectsDirty = true; kick(); }, { passive: true });
  window.addEventListener('resize', function () { rectsDirty = true; kick(); }, { passive: true });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      clearTimeout(blinkT); blinkT = 0;
    } else {
      rectsDirty = true; kick(); scheduleBlink();
    }
  });

  /* ================= typed answer ================= */
  var typeT = 0;
  function stopType() { if (typeT) { clearInterval(typeT); typeT = 0; } }
  function typeOut(node, text, done) {
    stopType();
    if (RM) { node.textContent = text; if (done) done(); return; }
    var cs = chars(text);
    var i = 0;
    node.textContent = '';
    node.classList.add('is-typing');
    typeT = setInterval(function () {
      i = Math.min(cs.length, i + 2);
      node.textContent = cs.slice(0, i).join('');
      if (i >= cs.length) {
        stopType();
        node.classList.remove('is-typing');
        if (done) done();
      }
    }, 24);
  }

  /* ================= small UI builders ================= */
  function h1(text, extra) { return el('h1', { class: 'view-title', tabindex: '-1' }, extra ? [extra, text] : text); }
  function box(title, kids, opts) {
    opts = opts || {};
    var id = nid('bx');
    var hd = el('div', { class: 'box__hd' }, [el('h2', { class: 'box__t', id: id }, title)].concat(opts.extra ? [opts.extra] : []));
    return el('section', { class: 'box' + (opts.cls ? ' ' + opts.cls : ''), 'aria-labelledby': id }, [hd, el('div', { class: 'box__bd' }, kids)]);
  }
  function crumbs(list) {
    var ol = el('ol');
    list.forEach(function (c, i) {
      var last = i === list.length - 1;
      ol.appendChild(el('li', null, c[1] && !last ? link(c[1], c[0]) : el('span', last ? { 'aria-current': 'page' } : null, c[0])));
    });
    return el('nav', { class: 'crumbs', 'aria-label': 'Você está em' }, ol);
  }
  function avatar(name, size) {
    var ch = chars(String(name || '?').trim())[0] || '?';
    return el('span', { class: 'av av--c' + (hash(name || '?') % 8) + (size ? ' av--' + size : ''), 'aria-hidden': 'true' }, ch.toUpperCase());
  }
  function img(f, w, h, alt, cls, eager) {
    return el('img', { src: A + f, width: w, height: h, alt: alt || '', class: cls || null, loading: eager ? null : 'lazy', decoding: 'async' });
  }
  function commThumb(c, cls) {
    if (c.img) return img(c.img.f, c.img.w, c.img.h, '', 'thumb ' + (cls || ''));
    return el('span', { class: 'thumb thumb--glyph g-' + c.slug + ' ' + (cls || ''), 'aria-hidden': 'true' }, c.glyph);
  }
  function friendThumb(f, cls) {
    if (f.img) return img(f.img, f.w, f.h, '', 'thumb ' + (cls || ''));
    return el('span', { class: 'thumb thumb--glyph g-' + f.id + ' ' + (cls || ''), 'aria-hidden': 'true' }, f.glyph);
  }
  function emptyState(text, kids) { return el('div', { class: 'empty' }, [el('p', null, text)].concat(kids || [])); }
  function msgs(channel) {
    return S.msgs.filter(function (m) { return m.channel === channel && !(channel === 'depoimento' && S.pend[m.id]); });
  }
  function addMsg(m) {
    S.mine[m.id] = 1;
    if (!S.msgs.some(function (x) { return x.id === m.id; })) S.msgs.unshift(m);
    refreshLive();
  }

  /* Recado / depoimento / comentário item. All fan strings as text nodes. */
  function scrapItem(m, opts) {
    opts = opts || {};
    var head = el('p', { class: 'scrap__hd' }, [
      el('strong', { class: 'scrap__name' }, m.name),
      ' ',
      m.pending ? el('span', { class: 'when' }, 'enviando…') : timeEl(m.at)
    ]);
    var bd = el('div', { class: 'scrap__bd' }, [head, el('p', { class: 'scrap__txt' }, opts.text != null ? opts.text : m.text)]);
    if (opts.reply && !m.pending) {
      bd.appendChild(el('p', { class: 'scrap__act' }, el('button', { type: 'button', class: 'linkbtn', on: { click: function () { opts.reply(m.name); } } }, opts.replyLabel || 'responder')));
    }
    return el('li', { class: 'scrap' + (m.pending ? ' is-pending' : '') + (S.mine[m.id] ? ' is-mine' : '') }, [avatar(m.name), bd]);
  }

  /* Generic compose form → Horney.mural.post. */
  function composeForm(o) {
    var nameIn = el('input', { id: o.id + '-name', class: 'in', maxlength: '40', autocomplete: 'nickname', placeholder: 'seu nome no horkut' });
    nameIn.value = myName();
    var ta = el('textarea', { id: o.id + '-text', class: 'in in--ta', rows: '4', placeholder: o.placeholder, 'aria-describedby': o.id + '-count' });
    var max = 500 - (o.prefix ? chars(o.prefix).length : 0);
    var count = el('span', { id: o.id + '-count', class: 'count' }, '0/' + max + ' caracteres');
    var msg = el('p', { class: 'form-msg', role: 'status', 'aria-live': 'polite' });
    var btn = el('button', { type: 'submit', class: 'btn btn--go' }, o.button);
    var form = el('form', { class: 'compose', novalidate: true }, [
      el('div', { class: 'compose__row' }, [el('label', { for: nameIn.id }, 'seu nome'), nameIn]),
      el('div', { class: 'compose__row' }, [el('label', { for: ta.id }, o.label), ta]),
      el('div', { class: 'compose__foot' }, [count, btn]),
      msg
    ]);
    function updCount() {
      var n = chars(ta.value).length;
      count.textContent = n + '/' + max + ' caracteres';
      count.classList.toggle('is-over', n > max);
    }
    ta.addEventListener('input', updCount);
    if (!H) {
      nameIn.disabled = true; ta.disabled = true; btn.disabled = true;
      msg.textContent = MURAL_DOWN;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!H || btn.disabled) return;
      var name = nameIn.value.trim();
      var text = ta.value.trim();
      var pendingNode = null;
      if (text && chars(text).length <= max && o.onPending) pendingNode = o.onPending({ id: 'pending', name: name || 'anônimo', text: text, pending: true });
      btn.disabled = true;
      msg.textContent = '';
      H.mural.post({ name: name, text: text ? (o.prefix || '') + text : '', channel: o.channel }).then(function (m) {
        rememberName(name);
        ta.value = '';
        updCount();
        if (pendingNode && pendingNode.parentNode) pendingNode.parentNode.removeChild(pendingNode);
        addMsg(m);
        if (o.onDone) o.onDone(m);
      }, function (err) {
        if (pendingNode && pendingNode.parentNode) pendingNode.parentNode.removeChild(pendingNode);
        msg.textContent = err && err.message ? err.message : 'deu ruim no envio. tenta de novo.';
        ta.focus();
      }).then(function () { btn.disabled = false; });
    });
    form.fill = function (s) {
      ta.value = s;
      updCount();
      ta.focus();
      try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (err) { /* ok */ }
    };
    return form;
  }

  /* ================= theme ================= */
  var themeMeta = $('meta[name="theme-color"]');
  function currentTheme() { return root.getAttribute('data-theme') === 'horney' ? 'horney' : 'classico'; }
  function paintThemeBtns() {
    var t = currentTheme();
    $$('[data-theme-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-btn') === t)); });
  }
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'horney' ? '#050505' : '#bfd0ea');
    save('theme', t);
    paintThemeBtns();
  }
  doc.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-theme-btn]') : null;
    if (!b) return;
    var t = b.getAttribute('data-theme-btn');
    if (t === currentTheme()) return;
    setTheme(t);
    toast(t === 'horney' ? 'tema HORNEY: preto, amarelo e um raio magenta ⚡' : 'tema clássico: azulzinho de 2006, igual você lembrava');
  });

  /* ================= friend request ================= */
  var FRIEND_DELAY = 2600;
  function friendState() {
    return S.friend ? S.friend.state : 'none';
  }
  function addFriend() {
    if (friendState() !== 'none') return;
    S.friend = { state: 'pending', at: Date.now() };
    save('friend', S.friend);
    toast('solicitação enviada! a HORNEY vai ver se você é gente boa…');
    fillFriendWidgets(true);
    setTimeout(confirmFriend, FRIEND_DELAY);
  }
  function confirmFriend() {
    if (!S.friend || S.friend.state !== 'pending') return;
    S.friend = { state: 'friends', at: Date.now() };
    save('friend', S.friend);
    toast('vocês agora são amigos ♥ a HORNEY aceitou sem nem ler o scrap');
    fillFriendWidgets(false);
    renderFriendsGrid();
    if (cur && (cur.friendLive || cur.live)) (cur.friendLive || cur.live)();
  }
  function friendWidget() {
    var n = el('div', { class: 'js-friend friendw', 'aria-live': 'polite' });
    fillFriend(n, false);
    return n;
  }
  function fillFriend(n, focusStatus) {
    var st = friendState();
    n.replaceChildren();
    if (st === 'none') {
      append(n, [
        el('button', { type: 'button', class: 'btn btn--add', on: { click: addFriend } }, '+ adicionar como amigo'),
        el('span', { class: 'friendw__hint' }, 'só add com scrap 😉')
      ]);
    } else if (st === 'pending') {
      var p = el('p', { class: 'friendw__st', tabindex: '-1' }, '⏳ solicitação enviada — aguardando a HORNEY aceitar…');
      n.appendChild(p);
      if (focusStatus) p.focus();
    } else {
      append(n, el('p', { class: 'friendw__st is-ok' }, '✔ vocês agora são amigos · desde ' + fmtDate(S.friend.at)));
    }
  }
  function fillFriendWidgets(focusStatus) { $$('.js-friend').forEach(function (n) { fillFriend(n, focusStatus); }); }

  /* ================= karma ================= */
  function karmaAvg(t) {
    var mine = S.karma[t.k];
    if (typeof mine !== 'number') return t.base;
    return (t.base * KARMA_N + mine) / (KARMA_N + 1);
  }
  function karmaIcons(t, avg) {
    var on = Math.round(avg);
    var wrap = el('span', { class: 'kicons', 'aria-hidden': 'true' });
    for (var i = 0; i < 3; i++) wrap.appendChild(el('span', { class: 'kicon k-' + t.k + (i < on ? ' is-on' : '') }, t.icon));
    return wrap;
  }
  function fmt1(n) { return n.toFixed(1).replace('.', ','); }
  function fillKarmaMini() {
    var dl = $('#karma-mini');
    if (!dl) return;
    dl.replaceChildren();
    KARMA.forEach(function (t) {
      var avg = karmaAvg(t);
      dl.appendChild(el('div', { class: 'kmini__row' }, [
        el('dt', null, t.label),
        el('dd', null, [karmaIcons(t, avg), el('span', { class: 'kmini__n' }, fmt1(avg))])
      ]));
    });
  }
  function karmaBox() {
    var rows = el('div', { class: 'karma' });
    KARMA.forEach(function (t) {
      var avgN = el('span', { class: 'karma__avg' });
      var icons = el('span', { class: 'karma__icons' });
      function paint() {
        var avg = karmaAvg(t);
        icons.replaceChildren(karmaIcons(t, avg));
        avgN.textContent = 'média ' + fmt1(avg);
      }
      var fs = el('fieldset', { class: 'karma__row' }, el('legend', { class: 'karma__lbl' }, [t.label + ' ', el('span', { 'aria-hidden': 'true' }, t.icon)]));
      var res = el('div', { class: 'karma__res' }, [icons, avgN]);
      var pick = el('div', { class: 'karma__pick' }, el('span', { class: 'karma__your' }, 'sua nota:'));
      [0, 1, 2, 3].forEach(function (v) {
        var input = el('input', { type: 'radio', name: 'karma-' + t.k, value: String(v), class: 'sr-only' });
        if (S.karma[t.k] === v) input.checked = true;
        input.addEventListener('change', function () {
          S.karma[t.k] = v;
          save('karma', S.karma);
          paint();
          fillKarmaMini();
          toast(v === 0 ? 'nota 0 em ' + t.label + '? o olho anotou. e não esquece.' : 'você deu ' + v + ' ' + t.icon + ' em ' + t.label + '. o karma foi atualizado.');
        });
        pick.appendChild(el('label', { class: 'kpick' }, [input, el('span', { class: 'kpick__ui' }, v === 0 ? '0' : new Array(v + 1).join(t.icon)), el('span', { class: 'sr-only' }, v + ' de 3')]));
      });
      append(fs, [res, pick]);
      paint();
      rows.appendChild(fs);
    });
    return box('karma da HORNEY', [rows, el('p', { class: 'fine' }, 'média de mentirinha (37 votos-base) + a sua nota de verdade, guardada neste navegador.')]);
  }

  /* ================= polls (enquetes) ================= */
  function pollView(id) {
    var def = POLLS[id];
    var fid = 'poll-' + id;
    var wrap = el('div', { class: 'poll' });
    var fs = el('fieldset', { class: 'poll__fs' }, el('legend', { class: 'poll__q' }, def.q));
    var sel = null, other = null, otherRow = null, radios = [];
    var lastI = def.opts.length - 1;
    if (def.select) {
      sel = el('select', { id: fid + '-sel', class: 'in' });
      sel.appendChild(el('option', { value: '' }, 'escolhe uma capital…'));
      def.opts.forEach(function (o, i) { sel.appendChild(el('option', { value: String(i) }, def.other && i === lastI ? 'outra cidade…' : o[0])); });
      other = el('input', { id: fid + '-other', class: 'in', maxlength: '40', placeholder: 'ex.: Blumenau', autocomplete: 'address-level2' });
      otherRow = el('div', { class: 'poll__other', hidden: true }, [el('label', { for: other.id }, 'qual cidade?'), other]);
      sel.addEventListener('change', function () { otherRow.hidden = sel.value !== String(lastI); if (!otherRow.hidden) other.focus(); });
      append(fs, [el('label', { for: sel.id, class: 'poll__lbl' }, 'sua cidade'), sel, otherRow]);
    } else {
      def.opts.forEach(function (o, i) {
        var r = el('input', { type: 'radio', name: fid, value: String(i) });
        radios.push(r);
        fs.appendChild(el('label', { class: 'poll__opt' }, [r, ' ', o[0]]));
      });
    }
    var btn = el('button', { type: 'submit', class: 'btn btn--go' }, 'votar');
    var clear = el('button', { type: 'button', class: 'linkbtn', hidden: true }, 'apagar meu voto');
    var msg = el('p', { class: 'form-msg', role: 'status', 'aria-live': 'polite' });
    var form = el('form', { class: 'poll__form', novalidate: true }, [fs, el('div', { class: 'poll__foot' }, [btn, clear]), msg]);
    var res = el('ol', { class: 'poll__res', 'aria-label': 'resultado da enquete' });
    var note = el('p', { class: 'fine' });
    append(wrap, [form, res, note]);

    function paint() {
      var mine = S.polls[id];
      if (sel) {
        sel.value = mine ? String(mine.i) : '';
        otherRow.hidden = !(mine && mine.i === lastI);
        other.value = mine && mine.o ? mine.o : '';
      } else {
        radios.forEach(function (r, i) { r.checked = !!mine && mine.i === i; });
      }
      btn.textContent = mine ? 'mudar meu voto' : 'votar';
      clear.hidden = !mine;
      var counts = def.opts.map(function (o, i) { return o[1] + (mine && mine.i === i ? 1 : 0); });
      var total = counts.reduce(function (a, b) { return a + b; }, 0);
      var max = Math.max.apply(null, counts);
      var order = counts.map(function (c, i) { return i; }).sort(function (a, b) { return counts[b] - counts[a] || a - b; });
      var top = def.top || order.length;
      var shown = order.slice(0, top);
      if (mine && shown.indexOf(mine.i) === -1) shown.push(mine.i);
      res.replaceChildren();
      shown.forEach(function (i) {
        var isMine = !!mine && mine.i === i;
        var label = el('span', { class: 'poll__name' }, def.opts[i][0]);
        if (isMine && mine.o) append(label, [' (o seu: ', el('b', null, mine.o), ')']);
        if (isMine) label.appendChild(el('span', { class: 'poll__you' }, ' ← seu voto'));
        var pct = Math.round(counts[i] / total * 100);
        res.appendChild(el('li', { class: 'poll__row' + (isMine ? ' is-mine' : '') }, [
          el('span', { class: 'poll__line' }, [label, el('span', { class: 'poll__n' }, counts[i] + (counts[i] === 1 ? ' voto' : ' votos') + ' · ' + pct + '%')]),
          el('span', { class: 'bar', 'aria-hidden': 'true' }, el('span', { class: 'bar__fill', style: 'transform:scaleX(' + (counts[i] / max).toFixed(3) + ')' }))
        ]));
      });
      note.textContent = fmtN(total) + ' votos · votos-base de mentirinha + o seu de verdade (1 por navegador, dá pra mudar)' + (def.top && order.length > top ? ' · mostrando as ' + top + ' mais votadas' : '') + '.';
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var choice = null;
      if (sel) {
        if (sel.value === '') { msg.textContent = 'escolhe uma cidade primeiro.'; sel.focus(); return; }
        var i = parseInt(sel.value, 10);
        if (def.other && i === lastI) {
          var txt = chars(other.value.trim()).slice(0, 40).join('');
          if (!txt) { msg.textContent = 'escreve o nome da sua cidade.'; other.focus(); return; }
          var match = -1;
          def.opts.forEach(function (o, j) { if (j !== lastI && norm(o[0]) === norm(txt)) match = j; });
          choice = match >= 0 ? { i: match } : { i: lastI, o: txt };
        } else {
          choice = { i: i };
        }
      } else {
        var r = radios.filter(function (x) { return x.checked; })[0];
        if (!r) { msg.textContent = 'escolhe uma opção antes de votar.'; return; }
        choice = { i: parseInt(r.value, 10) };
      }
      var had = !!S.polls[id];
      S.polls[id] = choice;
      save('polls', S.polls);
      msg.textContent = had ? 'voto trocado. o horkut não julga (o olho julga um pouco).' : 'voto computado! obrigade.';
      paint();
    });
    clear.addEventListener('click', function () {
      delete S.polls[id];
      save('polls', S.polls);
      msg.textContent = 'voto apagado. pode votar de novo quando quiser.';
      paint();
      btn.focus();
    });
    paint();
    return wrap;
  }

  /* ================= facades ================= */
  function videoFacade(v) {
    var btn = el('button', { type: 'button', class: 'facade__btn', 'aria-label': 'Assistir: ' + v.title }, [
      img(v.img, 1280, 720, '', 'facade__img'),
      el('span', { class: 'facade__play', 'aria-hidden': 'true' }, '▶')
    ]);
    var wrap = el('div', { class: 'facade' }, btn);
    btn.addEventListener('click', function () {
      var f = el('iframe', {
        src: 'https://www.youtube-nocookie.com/embed/' + v.id + '?autoplay=1&rel=0&playsinline=1',
        title: v.title,
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allowfullscreen: true
      });
      btn.replaceWith(f);
      f.focus();
    });
    return el('figure', { class: 'vid' }, [wrap, el('figcaption', null, [el('strong', null, v.label), ' — ' + v.meta])]);
  }
  function videosGrid() {
    return el('div', { class: 'vids' }, VIDEOS.map(videoFacade).concat([el('p', { class: 'more' }, link(U.yt, 'mais no canal @bandaHorney ↗'))]));
  }
  function spotifyFacade() {
    var btn = el('button', { type: 'button', class: 'spot__btn' }, [
      el('span', { class: 'spot__ico', 'aria-hidden': 'true' }, '▶'),
      el('span', null, [el('strong', null, 'carregar o player do Spotify'), el('small', null, 'ANTI-RASO · 4 faixas · 13:53 · nada toca sozinho')])
    ]);
    var wrap = el('div', { class: 'spot' }, btn);
    btn.addEventListener('click', function () {
      var f = el('iframe', {
        title: 'Spotify: HORNEY — ANTI-RASO',
        src: 'https://open.spotify.com/embed/album/7EM81z5ydGQq04ZbkIE5aS?utm_source=generator&theme=0',
        width: '100%', height: '420', loading: 'lazy',
        allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture'
      });
      btn.replaceWith(f);
      f.focus();
    });
    return wrap;
  }

  /* ================= shows ================= */
  function nextShowNode(inShowCommunity) {
    var s = nextShow();
    if (!s) {
      return el('div', { class: 'next next--none' }, [
        el('p', { class: 'next__k' }, 'próximo show'),
        el('p', { class: 'next__v' }, 'sem shows marcados — cola no Instagram pra saber primeiro'),
        link(U.ig, '@horney.band no Instagram ↗', 'btn')
      ]);
    }
    var d = showDate(s.date);
    return el('div', { class: 'next' }, [
      el('p', { class: 'next__k' }, showStatus(s) === 'today' ? 'É HOJE!!!' : 'próximo show'),
      el('p', { class: 'next__v' }, d.d + ' ' + d.m + ' ' + d.y + ' · ' + s.title),
      el('p', { class: 'next__w' }, s.where),
      inShowCommunity ? link(U.ig, s.linkLabel, 'btn') : link('#/comunidade/show', 'eu vou! →', 'btn btn--go')
    ]);
  }
  function eventItem(s) {
    var st = showStatus(s);
    var d = showDate(s.date);
    var past = st === 'past';
    var on = function () { return S.rsvp.indexOf(s.date) !== -1; };
    var btn = el('button', { type: 'button', class: 'btn rsvp' });
    var count = el('span', { class: 'rsvp__n' });
    function paint() {
      var yes = on();
      btn.textContent = (yes ? '✔ ' : '') + (past ? 'eu fui!' : 'eu vou!');
      btn.setAttribute('aria-pressed', String(yes));
      var n = RSVP_SEED[s.date] + (yes ? 1 : 0);
      count.textContent = fmtN(n) + (past ? ' foram' : ' vão') + (yes ? ' (contando você)' : '');
    }
    btn.addEventListener('click', function () {
      var yes = on();
      if (yes) S.rsvp = S.rsvp.filter(function (x) { return x !== s.date; });
      else S.rsvp.push(s.date);
      save('rsvp', S.rsvp);
      paint();
      toast(!yes ? (past ? 'anotado: você foi. o olho lembra de você na grade.' : 'anotado! agora SAI DE CASA E COLE!!! ⚡😈') : 'tirado da lista. sem julgamento (só um pouquinho).');
    });
    paint();
    var body = el('div', { class: 'event__bd' }, [
      el('p', { class: 'badge-st st--' + st }, STATUS[st]),
      el('h3', { class: 'event__t' }, s.title),
      el('p', { class: 'event__w' }, s.where),
      el('p', null, s.txt)
    ]);
    if (s.flyer) {
      body.appendChild(el('a', { class: 'event__flyer', href: '#/foto/flyer', 'aria-label': 'Ver o flyer do Rock Night em tamanho grande' }, img('sympla-rock-night.jpg', 1179, 662, 'Flyer do Rock Night na FFFront, São Paulo, com HORNEY e Mastrobiso')));
    }
    body.appendChild(el('p', { class: 'event__act' }, [btn, count, link(U.ig, s.linkLabel, 'event__ig')]));
    body.appendChild(el('p', { class: 'fine' }, 'ingresso: nenhum link oficial por aqui — infos e ingressos sempre saem primeiro no Instagram.'));
    return el('li', { class: 'event event--' + st }, [
      el('p', { class: 'event__date' }, [el('span', { class: 'sr-only' }, s.date.split('-').reverse().join('/')), el('span', { class: 'event__d', 'aria-hidden': 'true' }, d.d), el('span', { class: 'event__m', 'aria-hidden': 'true' }, d.m), el('span', { class: 'event__y', 'aria-hidden': 'true' }, d.y)]),
      body
    ]);
  }
  function eventsList() {
    var t = dayKey(new Date());
    var up = SHOWS.filter(function (s) { return s.date >= t; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var past = SHOWS.filter(function (s) { return s.date < t; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    return el('ol', { class: 'events' }, up.concat(past).map(eventItem));
  }

  /* ================= community bodies ================= */
  function releaseCard(r) {
    return el('li', { class: 'rel' }, [
      img(r.img, 640, 640, r.alt, 'rel__img'),
      el('p', { class: 'rel__t' }, r.t),
      el('p', { class: 'rel__m' }, r.meta),
      link(r.href, 'ouvir no Spotify ↗', 'btn btn--sm')
    ]);
  }
  var BODIES = {
    'anti-raso': function () {
      return box('o EP', [
        el('div', { class: 'release' }, [
          img('cover-anti-raso.jpg', 640, 640, 'Capa do EP ANTI-RASO: uma porta aberta no meio do mar, um olho gigante e raios em magenta e azul.', 'release__cover'),
          el('div', { class: 'release__info' }, [
            el('p', { class: 'release__k' }, 'Novo EP · fora agora'),
            el('p', { class: 'release__t' }, 'ANTI-RASO'),
            el('p', null, 'EP · lançado em 30 de julho de 2026 · 4 faixas · 13:53 · 7.8/10 na Unglued'),
            el('ol', { class: 'tracks' }, TRACKS.map(function (t, i) {
              return el('li', null, link(trackUrl(i), [el('span', { class: 'tracks__n' }, t.n), el('span', { class: 'tracks__t' }, [t.t, t.feat ? el('em', null, ' ' + t.feat) : null]), el('span', { class: 'tracks__d' }, t.d)]));
            })),
            el('p', { class: 'links-row' }, [link(U.antiRaso, 'OUVIR ANTI-RASO ↗', 'btn btn--go'), link(U.presave, 'Todas as plataformas ↗', 'btn'), link(U.unglued, 'Unglued resenhou o ANTI-RASO ↗', 'btn')])
          ])
        ]),
        spotifyFacade()
      ]);
    },
    'show': function () {
      return el('div', null, [
        box('próximo show', nextShowNode(true)),
        box('eventos', [eventsList(), el('p', { class: 'cta' }, ['Não viu sua cidade? Chama a gente — ', link(U.dm, 'DM no Instagram'), '. Datas novas saem primeiro lá. ', link('#/comunidade/cidade', 'vota na enquete das cidades →')])])
      ]);
    },
    'discografia': function () {
      return box('discografia (4)', [
        el('ul', { class: 'rels' }, RELEASES.map(releaseCard)),
        el('p', { class: 'links-row' }, [link(U.spotify, '♫ Artista no Spotify ↗', 'btn'), link(U.presave, 'Todas as plataformas ↗', 'btn')])
      ]);
    },
    'odeio-raso': function () {
      return box('manifesto', [
        el('blockquote', { class: 'quote' }, [el('p', null, '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.”'), el('footer', null, '— Duda Maiolini, voz & letras')]),
        el('p', null, ['Quarteto de alt/indie rock de ', el('strong', null, 'Joinville (SC)'), '. Punk, hardcore e grunge com respiros de MPB — e, desde 2026, cantando em português.']),
        el('blockquote', { class: 'quote quote--alt' }, [el('p', null, '“A Horney não é uma banda que vai tocar só rock pesado, nem uma banda que vai tocar só música melancólica.”'), el('footer', null, '— Duda')]),
        el('p', { class: 'fine' }, 'nem só peso, nem só melancolia.')
      ]);
    },
    'merch': function () {
      return box('merch — EM BREVE', [
        el('p', { class: 'banner' }, [el('b', null, 'EM BREVE'), ' — nada à venda ainda. Quer garantir o teu? Manda DM que a gente avisa primeiro.']),
        el('ul', { class: 'merch' }, MERCH.map(function (m) {
          var art = el('div', { class: 'merch__art ' + m.art, 'aria-hidden': 'true' });
          if (m.img) art.appendChild(el('span', { class: 'merch__shape' }, img(m.img, m.w, m.h, '', 'merch__img')));
          else if (m.art === 'art--buttons') append(art, [el('span', { class: 'btn-pin p1' }, ['MOOD:', el('br'), 'ANTI-', el('br'), 'RASO']), el('span', { class: 'btn-pin p2' }, 'H◎'), el('span', { class: 'btn-pin p3' }, '😈')]);
          else append(art, [el('span', { class: 'stk s1' }, '◎'), el('span', { class: 'stk s2' }, 'ANTI-RASO'), el('span', { class: 'stk s3' }, 'HORNEY')]);
          return el('li', { class: 'merch__item' }, [
            art,
            el('h3', { class: 'merch__t' }, m.t),
            el('p', null, m.d),
            el('p', { class: 'merch__st' }, [el('span', { class: 'sticker' }, 'EM BREVE'), ' sem preço ainda']),
            link(U.dm, 'Quero! manda DM ↗', 'btn btn--sm')
          ]);
        })),
        el('p', { class: 'fine' }, MERCH.length + ' itens · 0 em estoque (ainda!)'),
        el('p', null, link(U.ig, 'ou segue o @horney.band ↗'))
      ]);
    },
    'cidade': function () {
      return box('enquete: HORNEY na sua cidade', [
        pollView('cidade'),
        el('p', { class: 'cta' }, ['Não viu sua cidade? Chama a gente — ', link(U.dm, 'DM no Instagram'), '. Datas novas saem primeiro lá.'])
      ], { cls: 'box--poll' });
    },
    'videos': function () { return box('vídeos', videosGrid()); },
    'geladeira': function () {
      return box('regras da comunidade', el('ol', { class: 'rules' }, [
        el('li', null, 'abriu a geladeira e esqueceu o que ia pegar? o refrão chegou. anota.'),
        el('li', null, 'proibido fechar a porta no meio de ROMÂNTICA. são só 2:28.'),
        el('li', null, ['dúvida existencial? ', link('#/oraculo', 'pergunta pro Olho'), ', ele não tem geladeira mas tem opinião.'])
      ]));
    },
    'grade': function () {
      return box('quem eu gostaria de conhecer', [
        el('p', { class: 'big' }, 'Você. No próximo show. Na grade. Gritando o refrão de OFF!'),
        nextShowNode(),
        el('p', null, [link(trackUrl(0), 'ouvir OFF! pra treinar ↗', 'btn'), ' ', link('#/comunidade/show', 'eventos →', 'btn')])
      ]);
    },
    'olho': function () {
      var e = makeEye('md');
      return box('o olho', [
        el('div', { class: 'olho' }, [
          el('a', { class: 'olho__eye', href: '#/oraculo', 'aria-label': 'Abrir o Oráculo do Olho' }, e.root),
          el('div', null, [
            el('p', null, 'É o olho-sol do logo. Ele mora no O de HORNEY e na foto do perfil. Mexe o mouse: ele acompanha.'),
            el('p', null, link('#/oraculo', 'pergunta alguma coisa pra ele →', 'btn btn--go'))
          ])
        ])
      ]);
    }
  };

  function topicsBox(c) {
    var list = el('ul', { class: 'topics' });
    c.topics.forEach(function (t) {
      var body = el('div', { class: 'topic__bd' });
      var txt = t.body;
      if (t.live === 'next') {
        var s = nextShow();
        if (s) { var d = showDate(s.date); txt = 'Próximo: ' + d.d + ' ' + d.m + ' ' + d.y + ' · ' + s.title + ' — ' + s.where; }
      }
      append(body, [el('p', null, [el('strong', null, t.by + ': '), txt])]);
      if (t.link) body.appendChild(el('p', null, link(t.link[1], t.link[0], 'btn btn--sm')));
      list.appendChild(el('li', null, el('details', { class: 'topic' }, [
        el('summary', null, [el('span', { class: 'topic__t' }, t.t), el('span', { class: 'topic__m' }, t.n + ' respostas · por ' + t.by)]),
        body
      ])));
    });
    return box('fórum (' + c.topics.length + ' tópicos)', [list, el('p', { class: 'fine' }, 'tópicos e apelidos de fãs fictícios, amor 100% real. links 100% oficiais.')]);
  }

  /* ================= router ================= */
  var viewEl = $('#view');
  var cur = null;

  function setCurrentNav(section) {
    var moreSet = ['mais', 'fotos', 'videos', 'amigos', 'depoimentos', 'busca', 'sobre', 'inicio', 'entrar'];
    $$('[data-nav]').forEach(function (a) {
      var on = a.hasAttribute('data-nav-more') ? moreSet.indexOf(section) !== -1 : a.getAttribute('data-nav') === section;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function dec(p) { try { return decodeURIComponent(p); } catch (e) { return p; } }

  function route(initial) {
    var h = location.hash;
    if (h && h.length > 1 && h.charAt(1) !== '/') {
      if (cur) return;
      h = '#/';
    }
    var parts = h.replace(/^#\/?/, '').split('/').map(dec);
    var key = parts[0] || '';
    var fn = has(VIEWS, key) ? VIEWS[key] : null;
    if (cur && cur.destroy) cur.destroy();
    stopType();
    var v = (fn && fn(parts)) || view404();
    viewEl.replaceChildren(v.node);
    cur = v;
    doc.title = v.title + ' · horkut · HORNEY';
    doc.body.setAttribute('data-route', v.section);
    setCurrentNav(v.section);
    rectsDirty = true;
    kick();
    scheduleBlink();
    if (!initial) {
      window.scrollTo(0, 0);
      var t = v.focus || v.node.querySelector('.view-title');
      if (t) {
        t.focus({ preventScroll: !v.focus });
        if (v.focus) v.focus.scrollIntoView({ block: 'center' });
      }
    } else if (v.focus) {
      v.focus.scrollIntoView({ block: 'center' });
    }
    if (v.after) v.after();
  }
  function go(h) { if (location.hash === h) route(false); else location.hash = h; }

  function refreshLive() {
    renderCounts();
    if (cur && cur.live) cur.live();
  }

  /* ================= views ================= */
  function viewEntrar() {
    var node = el('div', { class: 'login' });
    var nameIn = el('input', { id: 'login-name', class: 'in', maxlength: '40', autocomplete: 'nickname', placeholder: 'ex.: xX_mergulhadora_Xx' });
    nameIn.value = myName();
    var rem = el('input', { id: 'login-remember', type: 'checkbox', checked: true });
    var msg = el('p', { class: 'form-msg', role: 'status', 'aria-live': 'polite' });
    var form = el('form', { class: 'login__card box', novalidate: true }, [
      el('div', { class: 'box__hd' }, el('h2', { class: 'box__t' }, 'acesse o horkut com o seu nome')),
      el('div', { class: 'box__bd' }, [
        el('label', { for: 'login-name', class: 'login__lbl' }, 'como você quer ser chamade?'),
        nameIn,
        el('p', { class: 'fine' }, 'sem e-mail, sem senha, sem CPF. vira o autor dos seus recados e depoimentos.'),
        el('label', { class: 'check' }, [rem, ' lembrar de mim neste computador']),
        el('p', { class: 'login__btns' }, [
          el('button', { type: 'submit', class: 'btn btn--go' }, myName() ? 'trocar nome e entrar' : 'entrar'),
          el('button', { type: 'button', class: 'btn', id: 'login-skip', on: { click: function () {
            S.me = { name: '', skipped: true };
            S.meTemp = false;
            saveMe();
            renderMe();
            toast('entrou sem cadastro. o olho te vê do mesmo jeito.');
            go('#/');
          } } }, 'entrar sem cadastro')
        ]),
        msg,
        el('p', { class: 'login__fine' }, ['ainda não é membro? ', el('strong', null, 'não precisa de convite'), ' (em 2004 precisava).'])
      ])
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = chars(nameIn.value.trim()).slice(0, 40).join('');
      if (!name) { msg.textContent = 'escreve um nome (ou entra sem cadastro, ali do lado).'; nameIn.focus(); return; }
      S.me = { name: name, skipped: false };
      S.meTemp = !rem.checked;
      if (S.meTemp) drop('me'); else saveMe();
      renderMe();
      toast('bem-vinde ao horkut, ' + name + '!');
      go('#/');
    });
    var pitch = el('div', { class: 'login__pitch' }, [
      el('p', { class: 'login__logo', 'aria-hidden': 'true' }, ['h', el('img', { src: A + 'eye-sun.png', alt: '', width: '300', height: '300' }), 'rkut']),
      h1('conecte-se à HORNEY e aos amigos dela por meio de uma rede de confiança.'),
      el('p', { class: 'login__line' }, 'horkut — a rede social que não te vende. 100% nacional, sem algoritmo, sem anúncio.'),
      el('ul', { class: 'login__list' }, [
        el('li', null, '✉ deixe recados e depoimentos no perfil da HORNEY'),
        el('li', null, '◎ pergunte qualquer coisa ao Oráculo do Olho'),
        el('li', null, '👥 participe das comunidades (tem enquete que conta voto de verdade)')
      ])
    ]);
    append(node, [pitch, form]);
    return { title: 'entrar', section: 'entrar', node: node, focus: null };
  }

  function feedItem(m) {
    var map = {
      mural: ['deixou um recado', '#/recados'],
      depoimento: ['escreveu um depoimento', '#/depoimentos'],
      oraculo: ['perguntou ao Olho', '#/oraculo'],
      foto: ['comentou uma foto', '#/fotos']
    };
    var v = map[m.channel] || ['passou pelo mural', '#/recados'];
    return el('li', { class: 'feed__it' }, [
      avatar(m.name, 'sm'),
      el('div', null, [
        el('p', { class: 'feed__hd' }, [el('strong', null, m.name), ' ' + v[0] + ' · ', timeEl(m.at)]),
        el('p', { class: 'feed__txt' }, clip(m.text, 140)),
        el('p', null, link(v[1], 'ver →', 'feed__go'))
      ])
    ]);
  }
  function newSince(ch) {
    return S.msgs.filter(function (m) { return (!ch || m.channel === ch) && m.at > S.prevVisit && !S.mine[m.id]; }).length;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function viewInicio() {
    var node = el('div', { class: 'view' });
    var e = makeEye('sm');
    var hello = myName() ? 'Bem-vinde, ' + myName() : 'Bem-vinde ao horkut';
    var notif = el('div', { class: 'notif' });
    var feed = el('ul', { class: 'feed' });
    var sorte = H ? H.oraculo.sorte() : 'sem sorte hoje: o oráculo não carregou.';
    var sugg = el('ul', { class: 'sugg' }, COMMS.filter(function (c) { return S.comms.indexOf(c.slug) === -1; }).slice(0, 3).map(function (c) {
      return el('li', null, el('a', { href: '#/comunidade/' + c.slug, class: 'sugg__a' }, [commThumb(c, 'thumb--sm'), el('span', null, c.name)]));
    }));
    append(node, [
      el('div', { class: 'hello' }, [
        el('div', { class: 'hello__txt' }, [
          h1(hello),
          el('p', { class: 'hello__line' }, 'horkut — a rede social que não te vende. 100% nacional, sem algoritmo, sem anúncio.')
        ])
      ]),
      el('p', { class: 'sorte-strip' }, [el('strong', null, 'sorte do dia: '), sorte]),
      box('notificações', notif, { cls: 'box--notif' }),
      el('div', { class: 'two' }, [
        box('próximo show', nextShowNode()),
        box('aplicativo: Oráculo do Olho', el('div', { class: 'teaser' }, [
          el('a', { class: 'teaser__eye', href: '#/oraculo', 'aria-label': 'Abrir o Oráculo do Olho' }, e.root),
          el('div', null, [el('p', null, 'o olho responde: show, disco, merch, amor, futuro.'), link('#/oraculo', 'pergunte ao olho →', 'btn btn--go')])
        ]))
      ]),
      box('atualizações dos amigos', feed, { extra: link('#/recados', 'ver recados') }),
      sugg.children.length ? box('comunidades que você ainda não participa', sugg) : null
    ]);
    function live() {
      notif.replaceChildren();
      if (!H) { notif.appendChild(el('p', null, MURAL_DOWN)); feed.replaceChildren(el('li', null, MURAL_DOWN)); }
      else if (!S.loaded) { notif.appendChild(el('p', null, 'carregando novidades…')); }
      else {
        var lines = [];
        if (S.prevVisit) {
          var r = newSince('mural'), d = newSince('depoimento'), o = newSince('oraculo'), f = newSince('foto');
          notif.appendChild(el('p', { class: 'notif__since' }, 'desde a sua última visita (' + rel(S.prevVisit) + '):'));
          if (r) lines.push(link('#/recados', plural(r, 'recado novo', 'recados novos') + ' no perfil da HORNEY'));
          if (d) lines.push(link('#/depoimentos', plural(d, 'depoimento novo', 'depoimentos novos')));
          if (o) lines.push(link('#/oraculo', plural(o, 'pergunta nova', 'perguntas novas') + ' ao Oráculo do Olho'));
          if (f) lines.push(link('#/fotos', plural(f, 'comentário novo', 'comentários novos') + ' nas fotos'));
          if (!r) lines.unshift(el('span', { class: 'notif__none' }, 'você não tem novos recados.'));
        } else {
          notif.appendChild(el('p', { class: 'notif__since' }, 'primeira vez no horkut? então tudo é novidade:'));
          lines.push(link('#/recados', plural(msgs('mural').length, 'recado', 'recados') + ' te esperando no perfil da HORNEY'));
          lines.push(link('#/depoimentos', plural(msgs('depoimento').length, 'depoimento', 'depoimentos') + ' aprovados'));
          lines.push(link('#/oraculo', plural(msgs('oraculo').length, 'pergunta', 'perguntas') + ' feitas ao Olho'));
        }
        var pend = Object.keys(S.pend).length;
        if (pend) lines.push(link('#/depoimentos', plural(pend, 'depoimento seu aguarda', 'depoimentos seus aguardam') + ' aprovação de HORNEY'));
        notif.appendChild(el('ul', { class: 'notif__list' }, lines.map(function (x) { return el('li', null, x); })));
        var all = S.msgs.slice(0, 6);
        feed.replaceChildren.apply(feed, all.length ? all.map(feedItem) : [el('li', null, 'ninguém escreveu nada ainda. seja o primeiro.')]);
      }
      var fw = el('div', { class: 'notif__friend' });
      var st = friendState();
      if (st === 'friends') fw.appendChild(el('p', null, '✔ você e HORNEY são amigos desde ' + fmtDate(S.friend.at) + '.'));
      else append(fw, [el('p', null, st === 'pending' ? 'sua solicitação de amizade tá aguardando a HORNEY.' : 'HORNEY ainda não está nos seus amigos.'), st === 'none' ? friendWidget() : null]);
      notif.appendChild(fw);
    }
    live();
    return { title: 'início', section: 'inicio', node: node, live: live };
  }

  function visitors() {
    var seen = Object.create(null), out = [];
    if (myName()) { out.push({ name: myName(), you: true }); seen[myName()] = 1; }
    S.msgs.forEach(function (m) {
      if (out.length >= 6 || seen[m.name]) return;
      seen[m.name] = 1;
      out.push({ name: m.name, at: m.at });
    });
    return out;
  }

  function profileTabs() {
    var dl = function (rows) {
      return el('dl', { class: 'facts' }, rows.map(function (r) { return el('div', { class: 'facts__row' }, [el('dt', null, r[0]), el('dd', null, r[1])]); }));
    };
    var moodI = 0;
    var moodBtn = el('button', { type: 'button', class: 'linkbtn mood', title: 'trocar o humor' }, MOODS[0]);
    moodBtn.addEventListener('click', function () { moodI = (moodI + 1) % MOODS.length; moodBtn.textContent = MOODS[moodI]; });
    var panels = {
      social: dl([
        ['quem sou eu', ['Quarteto de alt/indie rock de ', el('strong', null, 'Joinville (SC)'), '. Punk, hardcore e grunge no sangue, com toques de MPB — e cantando em português desde 2026. Voz e letras: ', el('strong', null, 'Duda Maiolini'), '. Composição com ', el('strong', null, 'Rafa Bello'), '. +2 que fazem o barulho todo acontecer.']],
        ['relacionamento', 'enrolada com o palco (é complicado)'],
        ['humor', [moodBtn, el('span', { class: 'fine' }, ' (clica pra trocar)')]],
        ['cidade natal', 'Joinville, SC, Brasil'],
        ['idiomas', 'português, desde 2026'],
        ['estilo', 'punk, hardcore e grunge — com toques de MPB'],
        ['quem eu gostaria de conhecer', 'Você. No próximo show. Na grade. Gritando o refrão de OFF!']
      ]),
      profissional: dl([
        ['formação', 'quarteto'],
        ['integrantes', ['Duda (Eduarda) Maiolini — voz & letras', el('br'), 'Rafa Bello — composição', el('br'), '+ 2']],
        ['participação especial', 'Dani Buarque — feat. em QUEBRA-CABEÇA'],
        ['área', 'alt/indie rock'],
        ['último lançamento', [link('#/comunidade/anti-raso', 'ANTI-RASO'), ' (EP, 30/07/2026)']],
        ['primeiro EP', 'Four Rooms for Four Fools (2022)'],
        ['imprensa', link(U.unglued, 'Unglued: 7.8/10 ↗')],
        ['números', '7.3K seguidores no IG · 1.8K ouvintes/mês no Spotify'],
        ['contato profissional', [link(U.dm, 'DM no Instagram ↗'), ' — é o único canal. sem e-mail, sem telefone.']]
      ]),
      pessoal: dl([
        ['frase', 'SAI DE CASA E COLE NOS SHOWS!!!'],
        ['palavra da Duda', el('blockquote', { class: 'quote quote--sm' }, el('p', null, '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.”'))],
        ['sobre o som', el('blockquote', { class: 'quote quote--sm' }, el('p', null, '“A Horney não é uma banda que vai tocar só rock pesado, nem uma banda que vai tocar só música melancólica.”'))],
        ['não suporta', ['música rasa (tem até ', link('#/comunidade/odeio-raso', 'comunidade'), ')']],
        ['onde encontrar', [link(U.ig, '@horney.band ↗'), ' · ', link(U.tiktok, 'TikTok ↗'), ' · ', link(U.threads, 'Threads ↗'), ' · ', link(U.yt, '@bandaHorney ↗')]],
        ['assinatura', '⚡😈🖤']
      ])
    };
    var names = [['social', 'social'], ['profissional', 'profissional'], ['pessoal', 'pessoal']];
    var tablist = el('div', { class: 'tabs__list', role: 'tablist', 'aria-label': 'Informações do perfil' });
    var wrap = el('div', { class: 'tabs' }, tablist);
    var tabs = [];
    names.forEach(function (n, i) {
      var tid = 'tab-' + n[0], pid = 'panel-' + n[0];
      var t = el('button', { type: 'button', role: 'tab', id: tid, class: 'tabs__tab', 'aria-controls': pid, 'aria-selected': String(i === 0), tabindex: i === 0 ? '0' : '-1' }, n[1]);
      tabs.push(t);
      tablist.appendChild(t);
      wrap.appendChild(el('div', { role: 'tabpanel', id: pid, class: 'tabs__panel', 'aria-labelledby': tid, tabindex: '0', hidden: i !== 0 }, panels[n[0]]));
    });
    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.setAttribute('tabindex', on ? '0' : '-1');
        $('#' + t.getAttribute('aria-controls'), wrap).hidden = !on;
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, j = -1;
        if (k === 'ArrowRight') j = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = tabs.length - 1;
        if (j >= 0) { e.preventDefault(); select(j, true); }
      });
    });
    return wrap;
  }

  function promote() {
    var url = location.href.split('#')[0] + '#/perfil';
    var data = { title: 'HORNEY no horkut', text: 'horkut — a rede social que não te vende. vem ver o perfil da HORNEY ⚡😈', url: url };
    if (navigator.share) {
      navigator.share(data).then(function () { toast('perfil promovido! ★ a HORNEY agradece.'); }, function () { /* cancelado */ });
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { toast('link do perfil copiado! cola num recado por aí.'); }, function () { toast('copia o endereço: ' + url); });
      return;
    }
    toast('copia o endereço: ' + url);
  }

  function viewPerfil() {
    var node = el('div', { class: 'view' });
    var e = makeEye('lg');
    var updated = el('p', { class: 'fine' });
    var scraps = el('ul', { class: 'scraps scraps--mini' });
    var depos = el('ul', { class: 'scraps scraps--mini' });
    var vis = el('ul', { class: 'visitors' });
    var scrapsN = el('span', { class: 'n' });
    var deposN = el('span', { class: 'n' });
    var head = el('section', { class: 'box prof', 'aria-label': 'HORNEY' }, el('div', { class: 'prof__in' }, [
      el('a', { class: 'prof__eye', href: '#/oraculo', 'aria-label': 'Foto do perfil: o Olho. Abrir o Oráculo do Olho' }, e.root),
      el('div', { class: 'prof__txt' }, [
        h1(['H', el('img', { class: 'o-eye', src: A + 'eye-sun.png', alt: 'O', width: '300', height: '300' }), 'RNEY']),
        el('p', { class: 'prof__where' }, 'alt/indie rock · Joinville, SC, Brasil'),
        el('p', { class: 'prof__status' }, [el('strong', null, 'status: '), 'SAI DE CASA E COLE NOS SHOWS!!!']),
        el('p', { class: 'prof__stats' }, '7.3K seguidores no IG · 1.8K ouvintes/mês · Unglued 7.8/10'),
        updated,
        friendWidget(),
        el('p', { class: 'prof__acts' }, [
          link('#/recados', '✉ deixar recado', 'btn'),
          link('#/depoimentos', '✍ escrever depoimento', 'btn'),
          link('#/oraculo', '◎ perguntar ao olho', 'btn'),
          el('button', { type: 'button', class: 'btn', on: { click: promote } }, '★ promova este perfil')
        ])
      ])
    ]));
    append(node, [
      crumbs([['início', '#/'], ['perfil de HORNEY']]),
      head,
      el('p', { class: 'sorte-strip' }, [el('strong', null, 'sorte do dia: '), H ? H.oraculo.sorte() : 'sem sorte hoje: o oráculo não carregou.']),
      box('perfil', profileTabs()),
      karmaBox(),
      el('div', { class: 'two' }, [
        box(['recados ', scrapsN], [scraps, el('p', { class: 'more' }, link('#/recados', 'ver todos os recados →'))]),
        box(['depoimentos ', deposN], [depos, el('p', { class: 'more' }, link('#/depoimentos', 'ver todos os depoimentos →'))])
      ]),
      box('visitantes recentes', vis),
      box('fotos (12)', el('ul', { class: 'pgrid pgrid--mini' }, ['duda', 'plateia', 'chifrinhos', 'flyer'].map(function (id) {
        var p = PHOTOS[id];
        return el('li', null, el('a', { href: '#/foto/' + id, class: 'pgrid__a' }, img(p.f, p.w, p.h, p.alt, 'pgrid__img')));
      })), { extra: link('#/fotos', 'ver álbuns') })
    ]);
    function live() {
      var all = S.msgs;
      updated.textContent = all.length ? 'atualizado ' + rel(all[0].at) : '';
      if (!H) { scraps.replaceChildren(el('li', null, MURAL_DOWN)); depos.replaceChildren(); vis.replaceChildren(); return; }
      var m = msgs('mural'), d = msgs('depoimento');
      scrapsN.textContent = '(' + m.length + ')';
      deposN.textContent = '(' + d.length + ')';
      scraps.replaceChildren.apply(scraps, m.length ? m.slice(0, 3).map(function (x) { return scrapItem(x); }) : [el('li', null, 'você não tem novos recados.')]);
      depos.replaceChildren.apply(depos, d.length ? d.slice(0, 2).map(function (x) { return scrapItem(x); }) : [el('li', null, 'nenhum depoimento ainda.')]);
      vis.replaceChildren.apply(vis, visitors().map(function (v) {
        return el('li', { class: 'visitors__it' }, [avatar(v.name), el('span', { class: 'visitors__n' }, v.you ? [v.name, el('small', null, ' (você, agora)')] : [v.name, el('small', null, ' · ' + rel(v.at))])]);
      }));
    }
    live();
    return { title: 'perfil de HORNEY', section: 'perfil', node: node, live: live };
  }

  var PER = 6;
  function pager(p, pages, total, base, label) {
    var from = total ? (p - 1) * PER + 1 : 0, to = Math.min(total, p * PER);
    function lk(n, text) {
      if (n === p || n < 1 || n > pages) return el('span', { class: 'pager__off', 'aria-disabled': 'true' }, text);
      return el('a', { href: base + n, class: 'pager__a' }, text);
    }
    return el('nav', { class: 'pager', 'aria-label': label }, [
      lk(1, 'primeira'), lk(p - 1, '< anterior'),
      el('span', { class: 'pager__info' }, 'mostrando ' + from + '-' + to + ' de ' + total),
      lk(p + 1, 'próxima >'), lk(pages, 'última')
    ]);
  }

  function viewRecados(parts) {
    var page = Math.max(1, parseInt(parts[1], 10) || 1);
    var node = el('div', { class: 'view' });
    var e = makeEye('sm');
    var list = el('ul', { class: 'scraps' });
    var pagTop = el('div');
    var pagBot = el('div');
    var countN = el('span', { class: 'n' });
    var form = composeForm({
      id: 'scrap', label: 'escreve um recado pra HORNEY', placeholder: 'thanks for the add!!! ⚡😈', button: 'postar recado', channel: 'mural',
      onPending: function (m) {
        if (page !== 1) return null;
        var li = scrapItem(m);
        list.insertBefore(li, list.firstChild);
        return li;
      },
      onDone: function () {
        toast('recado enviado ✔ ele aparece nos outros conceitos também.');
        if (page !== 1) go('#/recados');
      }
    });
    append(node, [
      crumbs([['início', '#/'], ['perfil', '#/perfil'], ['recados']]),
      el('div', { class: 'vhead' }, [el('a', { class: 'vhead__eye', href: '#/perfil', 'aria-label': 'Perfil da HORNEY' }, e.root), el('div', null, [h1(['recados de HORNEY ', countN]), el('p', { class: 'fine' }, 'o recado vai pro mural compartilhado: aparece aqui e nos outros conceitos do site.')])]),
      box('deixar um recado', form),
      box('recados', [pagTop, el('p', { class: 'fine' }, 'alguns recados vieram de fábrica: fãs de mentirinha, amor 100% real.'), list, pagBot])
    ]);
    function reply(name) { form.fill('@' + name + ' '); }
    function live() {
      if (!H) { list.replaceChildren(el('li', null, MURAL_DOWN)); return; }
      if (!S.loaded) { list.replaceChildren(el('li', null, 'carregando recados…')); return; }
      var all = msgs('mural');
      countN.textContent = '(' + all.length + ')';
      var pages = Math.max(1, Math.ceil(all.length / PER));
      var p = Math.min(page, pages);
      var slice = all.slice((p - 1) * PER, p * PER);
      list.replaceChildren.apply(list, slice.length ? slice.map(function (m) { return scrapItem(m, { reply: reply }); }) : [el('li', { class: 'empty' }, 'você não tem novos recados. seja o primeiro a escrever.')]);
      pagTop.replaceChildren(pager(p, pages, all.length, '#/recados/', 'Páginas de recados (topo)'));
      pagBot.replaceChildren(pager(p, pages, all.length, '#/recados/', 'Páginas de recados (rodapé)'));
    }
    live();
    return { title: page > 1 ? 'recados · página ' + page : 'recados', section: 'recados', node: node, live: live };
  }

  var DEPO_DELAY = 4200;
  function scheduleApprovals() {
    Object.keys(S.pend).forEach(function (id) {
      if (S.timers[id]) return;
      var wait = Math.max(700, S.pend[id] - Date.now());
      S.timers[id] = setTimeout(function () { approve(id); }, wait);
    });
  }
  function approve(id) {
    delete S.pend[id];
    delete S.timers[id];
    save('depo-pending', S.pend);
    toast('HORNEY aceitou seu depoimento ♥');
    refreshLive();
  }

  function viewDepo() {
    var node = el('div', { class: 'view' });
    var list = el('ul', { class: 'scraps scraps--depo' });
    var waiting = el('div', { class: 'waiting', 'aria-live': 'polite' });
    var countN = el('span', { class: 'n' });
    var form = composeForm({
      id: 'depo', label: 'escreve um depoimento sobre a HORNEY', placeholder: 'conheci a HORNEY quando…', button: 'enviar depoimento', channel: 'depoimento',
      onDone: function (m) {
        S.pend[m.id] = Date.now() + DEPO_DELAY;
        save('depo-pending', S.pend);
        scheduleApprovals();
        refreshLive();
      }
    });
    append(node, [
      crumbs([['início', '#/'], ['perfil', '#/perfil'], ['depoimentos']]),
      h1(['depoimentos de HORNEY ', countN]),
      el('p', { class: 'lead' }, 'depoimento é aquele textão que só aparece no perfil depois que o dono aprova. a HORNEY aprova rapidinho (mas aprova).'),
      box('escrever depoimento', [form, waiting]),
      box('depoimentos aprovados', list)
    ]);
    function live() {
      var pendIds = Object.keys(S.pend);
      waiting.replaceChildren();
      pendIds.forEach(function (id) {
        var m = S.msgs.filter(function (x) { return x.id === id; })[0];
        waiting.appendChild(el('div', { class: 'waiting__card' }, [
          el('p', { class: 'waiting__t' }, '⏳ seu depoimento aguarda aprovação de HORNEY'),
          m ? el('p', { class: 'waiting__txt' }, clip(m.text, 160)) : null
        ]));
      });
      if (!H) { list.replaceChildren(el('li', null, MURAL_DOWN)); return; }
      if (!S.loaded) { list.replaceChildren(el('li', null, 'carregando depoimentos…')); return; }
      var all = msgs('depoimento');
      countN.textContent = '(' + all.length + ')';
      list.replaceChildren.apply(list, all.length ? all.map(function (m) { return scrapItem(m); }) : [el('li', { class: 'empty' }, 'nenhum depoimento aprovado ainda.')]);
    }
    live();
    return { title: 'depoimentos', section: 'depoimentos', node: node, live: live };
  }

  function viewComms() {
    var node = el('div', { class: 'view' });
    append(node, [
      crumbs([['início', '#/'], ['comunidades']]),
      h1('comunidades (' + COMMS.length + ')'),
      el('p', { class: 'lead' }, 'cada comunidade é um pedaço do site: o EP, os shows, a discografia, o merch, os vídeos e uma enquete pra levar a HORNEY pra sua cidade.'),
      el('ul', { class: 'clist' }, COMMS.map(function (c) {
        var joined = S.comms.indexOf(c.slug) !== -1;
        return el('li', null, el('a', { class: 'clist__a', href: '#/comunidade/' + c.slug }, [
          commThumb(c, 'thumb--md'),
          el('span', { class: 'clist__txt' }, [
            el('span', { class: 'clist__t' }, c.name),
            el('span', { class: 'clist__m' }, c.cat + ' · ' + fmtN(c.members + (joined ? 1 : 0)) + ' membros'),
            joined ? el('span', { class: 'sticker sticker--ok' }, 'você participa') : null
          ])
        ]));
      })),
      el('p', { class: 'fine' }, 'números de membros de mentirinha (o horkut é uma homenagem). o seu “participar” é de verdade e fica neste navegador.')
    ]);
    return { title: 'comunidades', section: 'comunidades', node: node };
  }

  function viewComm(parts) {
    var c = has(COMM_BY, parts[1]) ? COMM_BY[parts[1]] : null;
    if (!c) return null;
    var node = el('div', { class: 'view' });
    var membersN = el('span');
    var joinBtn = el('button', { type: 'button', class: 'btn btn--go' });
    function joined() { return S.comms.indexOf(c.slug) !== -1; }
    function paint() {
      var j = joined();
      joinBtn.textContent = j ? 'sair da comunidade' : 'participar';
      joinBtn.setAttribute('aria-pressed', String(j));
      membersN.textContent = fmtN(c.members + (j ? 1 : 0)) + ' membros' + (j ? ' (incluindo você)' : '');
    }
    joinBtn.addEventListener('click', function () {
      if (joined()) { S.comms = S.comms.filter(function (s) { return s !== c.slug; }); toast('você saiu de “' + c.name + '”.'); }
      else { S.comms.push(c.slug); toast('agora você participa de “' + c.name + '” ✔'); }
      save('comms', S.comms);
      paint();
      renderCommsGrid();
    });
    paint();
    var descN = el('div', { class: 'cdesc' }, c.desc.map(function (p) { return el('p', null, p); }));
    append(node, [
      crumbs([['início', '#/'], ['comunidades', '#/comunidades'], [c.name]]),
      el('section', { class: 'box chead', 'aria-label': 'Comunidade' }, el('div', { class: 'chead__in' }, [
        commThumb(c, 'thumb--lg'),
        el('div', { class: 'chead__txt' }, [
          h1(c.name),
          el('p', { class: 'chead__m' }, [membersN, ' · ' + c.cat]),
          el('p', { class: 'chead__acts' }, [joinBtn, link('#/recados', 'divulgar no recado', 'btn')])
        ])
      ])),
      box('descrição', [
        descN,
        el('dl', { class: 'facts facts--inline' }, [
          el('div', { class: 'facts__row' }, [el('dt', null, 'dono'), el('dd', null, link('#/perfil', 'HORNEY'))]),
          el('div', { class: 'facts__row' }, [el('dt', null, 'idioma'), el('dd', null, 'Português')]),
          el('div', { class: 'facts__row' }, [el('dt', null, 'tipo'), el('dd', null, 'pública · moderada pelo Olho')]),
          el('div', { class: 'facts__row' }, [el('dt', null, 'local'), el('dd', null, 'Joinville, SC, Brasil')])
        ])
      ]),
      BODIES[c.slug] ? BODIES[c.slug]() : null,
      topicsBox(c),
      c.pollInBody ? null : box('enquete', pollView(c.slug), { cls: 'box--poll' }),
      el('p', { class: 'more' }, link('#/comunidades', '← todas as comunidades'))
    ]);
    return { title: c.name, section: 'comunidades', node: node };
  }

  function viewFotos(parts) {
    var node = el('div', { class: 'view' });
    var al = parts[1] ? ALBUMS.filter(function (a) { return a.id === parts[1]; })[0] : null;
    if (parts[1] && !al) return null;
    function commentsFor(p) { var pre = photoPrefix(p); return msgs('foto').filter(function (m) { return m.text.indexOf(pre) === 0; }).length; }
    if (!al) {
      append(node, [
        crumbs([['início', '#/'], ['perfil', '#/perfil'], ['fotos']]),
        h1('álbuns de HORNEY (' + ALBUMS.length + ')'),
        el('ul', { class: 'albums' }, ALBUMS.map(function (a) {
          var c = PHOTOS[a.photos[0]];
          return el('li', null, el('a', { class: 'albums__a', href: '#/fotos/' + a.id }, [
            el('span', { class: 'albums__stack' }, img(c.f, c.w, c.h, '', 'albums__img')),
            el('span', { class: 'albums__t' }, a.t),
            el('span', { class: 'albums__m' }, plural(a.photos.length, 'foto', 'fotos'))
          ]));
        })),
        el('p', { class: 'more' }, link(U.ig, 'mais no Instagram @horney.band ↗'))
      ]);
      return { title: 'fotos', section: 'fotos', node: node };
    }
    var grid = el('ul', { class: 'pgrid' });
    append(node, [
      crumbs([['início', '#/'], ['fotos', '#/fotos'], [al.t]]),
      h1(al.t),
      grid,
      el('p', { class: 'more' }, link('#/fotos', '← todos os álbuns'))
    ]);
    function live() {
      grid.replaceChildren.apply(grid, al.photos.map(function (id) {
        var p = PHOTOS[id];
        var n = commentsFor(p);
        return el('li', null, el('a', { href: '#/foto/' + id, class: 'pgrid__a' }, [
          img(p.f, p.w, p.h, p.alt, 'pgrid__img'),
          el('span', { class: 'pgrid__cap' }, [p.short, el('small', null, plural(n, 'comentário', 'comentários'))])
        ]));
      }));
    }
    live();
    return { title: al.t + ' · fotos', section: 'fotos', node: node, live: live };
  }

  function viewFoto(parts) {
    var id = parts[1];
    var p = has(PHOTOS, id) ? PHOTOS[id] : null;
    if (!p) return null;
    var al = p.album;
    var idx = al.photos.indexOf(id);
    var prev = al.photos[(idx - 1 + al.photos.length) % al.photos.length];
    var next = al.photos[(idx + 1) % al.photos.length];
    var node = el('div', { class: 'view' });
    var list = el('ul', { class: 'scraps' });
    var pre = photoPrefix(p);
    var form = composeForm({
      id: 'fcom', label: 'comentar esta foto', placeholder: 'que foto!!! ⚡', button: 'comentar', channel: 'foto', prefix: pre,
      onPending: function (m) { var li = scrapItem(m); list.insertBefore(li, list.firstChild); return li; },
      onDone: function () { toast('comentário publicado na foto ✔'); }
    });
    var noteKids = [];
    if (p.note) noteKids.push(p.note + ' ');
    if (p.noteLink) noteKids.push(link(p.noteLink[1], p.noteLink[0]));
    append(node, [
      crumbs([['início', '#/'], ['fotos', '#/fotos'], [al.t, '#/fotos/' + al.id], [p.short]]),
      h1(p.short),
      el('figure', { class: 'photo' }, [
        img(p.f, p.w, p.h, p.alt, 'photo__img', true),
        el('figcaption', null, [el('span', null, p.alt), el('span', { class: 'fine' }, ' · foto ' + (idx + 1) + ' de ' + al.photos.length + ' em “' + al.t + '”')])
      ]),
      noteKids.length ? el('p', { class: 'photo__note' }, noteKids) : null,
      el('nav', { class: 'photo__nav', 'aria-label': 'Navegar no álbum' }, [link('#/foto/' + prev, '< foto anterior', 'btn'), link('#/fotos/' + al.id, 'álbum', 'btn'), link('#/foto/' + next, 'próxima foto >', 'btn')]),
      box('comentários', [list, form])
    ]);
    function live() {
      if (!H) { list.replaceChildren(el('li', null, MURAL_DOWN)); return; }
      var all = msgs('foto').filter(function (m) { return m.text.indexOf(pre) === 0; });
      list.replaceChildren.apply(list, all.length ? all.map(function (m) { return scrapItem(m, { text: m.text.slice(pre.length) }); }) : [el('li', { class: 'empty' }, 'ninguém comentou ainda. comenta aí, primeiro do horkut a comentar.')]);
    }
    live();
    return { title: p.short + ' · fotos', section: 'fotos', node: node, live: live };
  }

  function viewVideos() {
    var node = el('div', { class: 'view' });
    append(node, [
      crumbs([['início', '#/'], ['perfil', '#/perfil'], ['vídeos']]),
      h1('vídeos favoritos (' + VIDEOS.length + ')'),
      el('p', { class: 'lead' }, 'nada toca sozinho: clica no vídeo que ele carrega.'),
      box('vídeos de HORNEY', videosGrid()),
      el('p', { class: 'more' }, link('#/comunidade/videos', 'comunidade: Vídeos que a mãe não deixava ver →'))
    ]);
    return { title: 'vídeos', section: 'videos', node: node };
  }

  function viewAmigos(parts) {
    var node = el('div', { class: 'view' });
    var e = makeEye('sm');
    var listEl = el('ul', { class: 'friends' });
    var target = null;
    var countN = el('span', { class: 'n' });
    append(node, [
      crumbs([['início', '#/'], ['perfil', '#/perfil'], ['amigos']]),
      el('div', { class: 'vhead' }, [el('a', { class: 'vhead__eye', href: '#/perfil', 'aria-label': 'Perfil da HORNEY' }, e.root), el('div', null, [h1(['amigos de HORNEY ', countN]), friendWidget()])]),
      listEl
    ]);
    function card(f) {
      var li = el('li', { class: 'fcard', id: 'amigo-' + f.id, tabindex: '-1' }, [
        friendThumb(f, 'thumb--lg'),
        el('div', { class: 'fcard__bd' }, [
          el('h2', { class: 'fcard__n' }, f.name),
          el('p', { class: 'fcard__r' }, f.role),
          el('p', null, f.txt),
          el('p', { class: 'fcard__l' }, (f.links || []).map(function (l) { return link(l[1], l[0], 'btn btn--sm'); }))
        ])
      ]);
      if (parts[1] === f.id) { li.classList.add('is-target'); target = li; }
      return li;
    }
    function live() {
      var items = FRIENDS.map(card);
      var st = friendState();
      if (st === 'friends') {
        var name = myName() || 'você';
        var you = el('li', { class: 'fcard fcard--you', id: 'amigo-voce', tabindex: '-1' }, [
          avatar(name, 'lg'),
          el('div', { class: 'fcard__bd' }, [
            el('h2', { class: 'fcard__n' }, name),
            el('p', { class: 'fcard__r' }, 'você · amigo desde ' + fmtDate(S.friend.at)),
            el('p', null, 'entrou pros amigos da HORNEY. agora é cobrar presença na grade.'),
            el('p', { class: 'fcard__l' }, link('#/recados', 'deixar um scrap', 'btn btn--sm'))
          ])
        ]);
        if (parts[1] === 'voce') { you.classList.add('is-target'); target = you; }
        items.push(you);
      }
      countN.textContent = '(' + items.length + ')';
      listEl.replaceChildren.apply(listEl, items);
    }
    live();
    return { title: 'amigos', section: 'amigos', node: node, friendLive: live, focus: target };
  }

  function viewOraculo() {
    var node = el('div', { class: 'view' });
    var E = makeEye('xl');
    var qLine = el('p', { class: 'balloon__q' });
    var aLine = el('p', { class: 'balloon__a', 'aria-hidden': 'true' }, H ? 'o olho tá aberto. pergunta qualquer coisa: show, disco, merch, amor, futuro… ele responde.' : 'o olho tá dormindo: o módulo do oráculo não carregou. recarrega a página e tenta de novo.');
    var srA = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    var linksN = el('div', { class: 'balloon__links' });
    var balloon = el('div', { class: 'balloon' }, [qLine, aLine, linksN, srA]);
    var inp = el('input', { id: 'ask-q', class: 'in in--ask', type: 'text', maxlength: '300', autocomplete: 'off', placeholder: 'ex.: quando é o próximo show?' });
    if (S.draft) { inp.value = S.draft; S.draft = ''; }
    var pub = el('input', { id: 'ask-pub', type: 'checkbox' });
    var pubName = el('input', { id: 'ask-name', class: 'in', maxlength: '40', autocomplete: 'nickname', placeholder: 'seu nome no mural' });
    pubName.value = myName();
    var nameRow = el('div', { class: 'ask__name', hidden: true }, [el('label', { for: 'ask-name' }, 'assinar como'), pubName]);
    var btn = el('button', { type: 'submit', class: 'btn btn--go' }, 'perguntar');
    var pubMsg = el('p', { class: 'form-msg', role: 'status', 'aria-live': 'polite' });
    var form = el('form', { class: 'ask', novalidate: true }, [
      el('label', { for: 'ask-q', class: 'ask__label' }, 'pergunte ao olho'),
      el('div', { class: 'ask__row' }, [inp, btn]),
      el('label', { class: 'check' }, [pub, ' publicar minha pergunta no mural']),
      nameRow,
      pubMsg
    ]);
    var CHIPS = ['quando é o próximo show?', 'cadê o merch?', 'quem é a HORNEY?', 'o que eu ouço primeiro?', 'vou ser feliz no amor?', 'como falo com a banda?'];
    var chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Perguntas prontas' }, CHIPS.map(function (c) {
      return el('button', { type: 'button', class: 'chip', on: { click: function () { inp.value = c; doAsk(); } } }, c);
    }));
    var recent = el('ul', { class: 'scraps scraps--ask' });
    if (!H) { inp.disabled = true; btn.disabled = true; pub.disabled = true; chips.hidden = true; }
    pub.addEventListener('change', function () { nameRow.hidden = !pub.checked; });
    inp.addEventListener('input', function () { dilate(E, 650); });
    inp.addEventListener('focus', function () {
      var r = inp.getBoundingClientRect();
      E.lookAt = { x: r.left + Math.min(r.width, 220), y: r.top + r.height / 2 };
      kick();
    });
    inp.addEventListener('blur', function () { E.lookAt = null; kick(); });

    function doAsk() {
      if (!H) return;
      var q = inp.value.trim();
      var ans = H.oraculo.ask(q);
      qLine.textContent = q ? 'você perguntou: “' + q + '”' : '';
      linksN.replaceChildren();
      srA.textContent = 'O olho responde: ' + ans.text;
      blink(E);
      dilate(E, 1400);
      typeOut(aLine, ans.text, function () {
        ans.links.forEach(function (l) { linksN.appendChild(el('a', { href: l.href, class: 'btn btn--sm', ext: true }, l.label + ' ↗')); });
      });
      pubMsg.textContent = '';
      if (pub.checked && q) {
        var name = pubName.value.trim();
        H.mural.post({ name: name, text: q, channel: 'oraculo' }).then(function (m) {
          rememberName(name);
          addMsg(m);
          pubMsg.textContent = 'sua pergunta foi pro mural ◎';
        }, function (err) {
          pubMsg.textContent = err && err.message ? err.message : 'não deu pra publicar agora.';
        });
      }
      inp.value = '';
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); doAsk(); });

    append(node, [
      crumbs([['início', '#/'], ['aplicativos'], ['Oráculo do Olho']]),
      h1('Oráculo do Olho'),
      el('section', { class: 'box app', 'aria-label': 'Aplicativo Oráculo do Olho' }, [
        el('div', { class: 'app__bar' }, [
          el('span', { class: 'app__ico', 'aria-hidden': 'true' }, '◎'),
          el('p', { class: 'app__t' }, 'Aplicativo: Oráculo do Olho'),
          el('p', { class: 'app__by' }, 'por HORNEY · sem Colheita Feliz, sem BuddyPoke: só o olho')
        ]),
        el('div', { class: 'app__stage' }, [el('div', { class: 'app__eye' }, E.root), balloon]),
        el('div', { class: 'app__form' }, [form, chips])
      ]),
      box('sorte do dia', el('p', { class: 'sorte' }, H ? H.oraculo.sorte() : 'sem sorte hoje: o oráculo não carregou.')),
      box('últimas perguntas ao olho', recent)
    ]);
    function live() {
      if (!H) { recent.replaceChildren(el('li', null, MURAL_DOWN)); return; }
      var all = msgs('oraculo').slice(0, 8);
      recent.replaceChildren.apply(recent, all.length ? all.map(function (m) {
        return scrapItem(m, { reply: function () { inp.value = m.text; inp.focus(); }, replyLabel: 'perguntar também' });
      }) : [el('li', { class: 'empty' }, 'ninguém publicou pergunta ainda. o olho tá entediado. marca a caixinha e seja o primeiro.')]);
    }
    live();
    return { title: 'Oráculo do Olho', section: 'oraculo', node: node, live: live, destroy: stopType };
  }

  function searchForm(id) {
    var inp = el('input', { id: id, class: 'in', type: 'search', placeholder: 'shows, merch, mergulhar…', autocomplete: 'off' });
    var f = el('form', { class: 'sform', role: 'search' }, [el('label', { for: id, class: 'sr-only' }, 'pesquisar no horkut'), inp, el('button', { type: 'submit', class: 'btn' }, 'pesquisar')]);
    f.addEventListener('submit', function (e) { e.preventDefault(); var q = inp.value.trim(); if (q) go('#/busca/' + encodeURIComponent(q)); else inp.focus(); });
    return f;
  }

  var PAGES = [
    ['perfil de HORNEY', '#/perfil', 'perfil bio sobre banda quem integrantes duda rafa joinville karma sorte'],
    ['recados', '#/recados', 'recados scrap mural mensagem'],
    ['depoimentos', '#/depoimentos', 'depoimento depoimentos'],
    ['Oráculo do Olho', '#/oraculo', 'oraculo olho pergunta app aplicativo sorte'],
    ['fotos', '#/fotos', 'fotos album foto imagens'],
    ['vídeos', '#/videos', 'videos clipe youtube fools game ao vivo'],
    ['amigos', '#/amigos', 'amigos amigo duda rafa dani buarque mastrobiso unglued fffront joinville'],
    ['comunidades', '#/comunidades', 'comunidades comunidade'],
    ['sobre o horkut', '#/sobre', 'sobre privacidade dados horkut orkut']
  ];

  function viewBusca(parts) {
    var q = parts.slice(1).join('/');
    var n = norm(q);
    var words = n ? n.split(' ') : [];
    function hit(s) { var x = norm(s); return words.length && words.every(function (w) { return x.indexOf(w) !== -1; }); }
    var node = el('div', { class: 'view' });
    append(node, [crumbs([['início', '#/'], ['pesquisa']]), h1(q ? ['resultados para “', el('span', null, q), '”'] : 'pesquisar no horkut'), searchForm('busca-q')]);
    if (!words.length) return { title: 'pesquisa', section: 'busca', node: node };
    var groups = [];
    var pg = PAGES.filter(function (p) { return hit(p[0] + ' ' + p[2]); }).map(function (p) { return link(p[1], p[0]); });
    var cm = COMMS.filter(function (c) { return hit(c.name + ' ' + c.desc.join(' ') + ' ' + c.topics.map(function (t) { return t.t; }).join(' ')); }).map(function (c) { return link('#/comunidade/' + c.slug, c.name); });
    var mu = TRACKS.filter(function (t) { return hit(t.t + ' ' + (t.feat || '') + ' anti-raso faixa'); }).map(function (t) { return link('#/comunidade/anti-raso', t.n + ' · ' + t.t + ' (ANTI-RASO)'); })
      .concat(RELEASES.filter(function (r) { return hit(r.t + ' ' + r.meta); }).map(function (r) { return link('#/comunidade/discografia', r.t + ' — ' + r.meta); }));
    var fr = FRIENDS.filter(function (f) { return hit(f.name + ' ' + f.role + ' ' + f.txt); }).map(function (f) { return link('#/amigos/' + f.id, f.name + ' — ' + f.role); });
    var ph = Object.keys(PHOTOS).filter(function (id) { return hit(PHOTOS[id].short + ' ' + PHOTOS[id].alt); }).map(function (id) { return link('#/foto/' + id, PHOTOS[id].short); });
    var rc = S.msgs.filter(function (m) { return hit(m.name + ' ' + m.text); }).slice(0, 12).map(function (m) { return el('span', null, [el('strong', null, m.name), ': ', clip(m.text, 120)]); });
    if (pg.length) groups.push(['páginas', pg]);
    if (cm.length) groups.push(['comunidades', cm]);
    if (mu.length) groups.push(['música', mu]);
    if (fr.length) groups.push(['amigos', fr]);
    if (ph.length) groups.push(['fotos', ph]);
    if (rc.length) groups.push(['no mural', rc]);
    if (!groups.length) {
      node.appendChild(emptyState('nenhum resultado. o horkut não tem algoritmo, mas tem o Oráculo do Olho:', [
        el('p', null, el('button', { type: 'button', class: 'btn btn--go', on: { click: function () { S.draft = q; go('#/oraculo'); } } }, 'perguntar isso pro olho →'))
      ]));
    } else {
      groups.forEach(function (g) {
        node.appendChild(box(g[0] + ' (' + g[1].length + ')', el('ul', { class: 'results' }, g[1].map(function (x) { return el('li', null, x); }))));
      });
    }
    return { title: 'pesquisa', section: 'busca', node: node };
  }

  function viewMais() {
    var node = el('div', { class: 'view' });
    var me = myName();
    var items = [
      ['🏠', 'início', '#/'], ['👤', 'perfil', '#/perfil'], ['✉', 'recados', '#/recados'], ['✍', 'depoimentos', '#/depoimentos'],
      ['📷', 'fotos', '#/fotos'], ['▶', 'vídeos', '#/videos'], ['☺', 'amigos', '#/amigos'], ['👥', 'comunidades', '#/comunidades'],
      ['◎', 'Oráculo do Olho', '#/oraculo'], ['ℹ', 'sobre o horkut', '#/sobre']
    ];
    append(node, [
      h1('mais'),
      searchForm('mais-q'),
      el('ul', { class: 'mais' }, items.map(function (it) { return el('li', null, el('a', { href: it[2], class: 'mais__a' }, [el('span', { 'aria-hidden': 'true', class: 'mais__i' }, it[0]), it[1]])); })),
      box('tema', el('div', { class: 'theme theme--big', role: 'group', 'aria-label': 'Tema do horkut' }, [
        el('button', { type: 'button', class: 'theme__btn', 'data-theme-btn': 'classico', 'aria-pressed': String(currentTheme() === 'classico') }, 'clássico'),
        el('button', { type: 'button', class: 'theme__btn', 'data-theme-btn': 'horney', 'aria-pressed': String(currentTheme() === 'horney') }, 'HORNEY')
      ])),
      box('sua conta', me ? el('p', null, ['conectade como ', el('strong', null, me), '. ', el('button', { type: 'button', class: 'linkbtn', on: { click: logout } }, 'sair')]) : el('p', null, [link('#/entrar', 'entrar com um nome', 'btn btn--go')])),
      box('HORNEY por aí', el('ul', { class: 'results' }, [
        [U.ig, 'Instagram @horney.band ↗'], [U.dm, 'Mandar DM ↗'], [U.tiktok, 'TikTok @horney.band ↗'], [U.threads, 'Threads @horney.band ↗'],
        [U.yt, 'YouTube @bandaHorney ↗'], [U.spotify, '♫ Artista no Spotify ↗'], [U.presave, '⚡ Todos os links ↗'], ['../index.html', '← todos os conceitos']
      ].map(function (l) { return el('li', null, link(l[0], l[1])); })))
    ]);
    return { title: 'mais', section: 'mais', node: node };
  }

  function viewSobre() {
    var node = el('div', { class: 'view' });
    append(node, [
      crumbs([['início', '#/'], ['sobre o horkut']]),
      h1('sobre o horkut'),
      box('o que é isso', [
        el('p', { class: 'big' }, 'horkut — a rede social que não te vende. 100% nacional, sem algoritmo, sem anúncio.'),
        el('p', null, 'Uma homenagem (não oficial) ao Orkut, a internet brasileira de 2004 a 2014, feita pra HORNEY, de Joinville / SC. Recado, depoimento, comunidade com nome de piada e sorte do dia: tudo funciona.'),
        el('p', null, 'Seus dados não vão pra lugar nenhum: nome, notas de karma, votos, comunidades e confirmações ficam no seu navegador. Os recados vão pro mural compartilhado do site, que também mora no seu navegador.'),
        el('p', null, ['© 2026 horkut · feito em Joinville · nenhum dado seu saiu do Brasil. Contato com a banda? ', link(U.dm, 'DM no Instagram ↗')])
      ])
    ]);
    return { title: 'sobre', section: 'sobre', node: node };
  }

  function view404() {
    var node = el('div', { class: 'view v404' });
    var e = makeEye('md');
    e.lookAt = { x: -9999, y: 99999 };
    append(node, [
      el('div', { class: 'v404__eye' }, e.root),
      h1('bad, bad server. no donut for you.'),
      el('p', { class: 'lead' }, 'essa página não existe no horkut (ou o dono apagou). o olho procurou e só achou superfície.'),
      el('p', { class: 'links-row' }, [link('#/', 'voltar pro início', 'btn btn--go'), link('#/perfil', 'perfil da HORNEY', 'btn'), link('#/oraculo', 'perguntar ao olho', 'btn')])
    ]);
    return { title: 'página não encontrada', section: '404', node: node };
  }

  var VIEWS = {
    '': viewInicio, inicio: viewInicio, entrar: viewEntrar, perfil: viewPerfil, recados: viewRecados,
    depoimentos: viewDepo, comunidades: viewComms, comunidade: viewComm, fotos: viewFotos, foto: viewFoto,
    videos: viewVideos, amigos: viewAmigos, oraculo: viewOraculo, mais: viewMais, busca: viewBusca, sobre: viewSobre
  };

  /* ================= chrome (top bar, side columns) ================= */
  function logout() {
    S.me = null;
    S.meTemp = false;
    drop('me');
    renderMe();
    toast('você saiu. o olho continua te vendo.');
    go('#/entrar');
  }
  function renderMe() {
    var b = $('#me-box');
    if (!b) return;
    b.replaceChildren();
    if (myName()) {
      append(b, [el('span', { class: 'me__hi' }, ['olá, ', el('strong', null, myName())]), ' · ', el('button', { type: 'button', class: 'linkbtn', on: { click: logout } }, 'sair')]);
    } else {
      append(b, [S.me ? el('span', { class: 'me__hi' }, 'visitante · ') : null, link('#/entrar', 'entrar')]);
    }
  }
  function renderCounts() {
    var nr = $('#n-recados'), nd = $('#n-depo'), badge = $('#badge-recados');
    if (H && S.loaded) {
      if (nr) nr.textContent = '(' + msgs('mural').length + ')';
      if (nd) nd.textContent = '(' + msgs('depoimento').length + ')';
      if (badge) {
        var n = S.prevVisit ? newSince('mural') : 0;
        badge.hidden = !n;
        badge.replaceChildren();
        if (n) append(badge, [String(n), el('span', { class: 'sr-only' }, n === 1 ? ' recado novo' : ' recados novos')]);
      }
    }
  }
  function renderFriendsGrid() {
    var g = $('#friends-grid');
    if (!g) return;
    var st = friendState();
    var cells = FRIENDS.map(function (f) {
      return el('li', null, el('a', { class: 'g9', href: '#/amigos/' + f.id }, [friendThumb(f, 'thumb--g9'), el('span', { class: 'g9__n' }, f.name)]));
    });
    if (st === 'friends') {
      var nm = myName() || 'você';
      cells.push(el('li', null, el('a', { class: 'g9 g9--you', href: '#/amigos/voce' }, [avatar(nm, 'g9'), el('span', { class: 'g9__n' }, nm)])));
    } else {
      cells.push(el('li', null, el('a', { class: 'g9 g9--add', href: '#/amigos' }, [el('span', { class: 'thumb thumb--g9 thumb--glyph g-add', 'aria-hidden': 'true' }, '+'), el('span', { class: 'g9__n' }, 'você?')])));
    }
    g.replaceChildren.apply(g, cells);
    var n = FRIENDS.length + (st === 'friends' ? 1 : 0);
    var rn = $('#rt-amigos-n'), ln = $('#n-amigos');
    if (rn) rn.textContent = '(' + n + ')';
    if (ln) ln.textContent = '(' + n + ')';
  }
  function renderCommsGrid() {
    var g = $('#comms-grid');
    if (!g) return;
    g.replaceChildren.apply(g, COMMS.slice(0, 9).map(function (c) {
      var j = S.comms.indexOf(c.slug) !== -1;
      return el('li', null, el('a', { class: 'g9' + (j ? ' is-joined' : ''), href: '#/comunidade/' + c.slug }, [commThumb(c, 'thumb--g9'), el('span', { class: 'g9__n' }, [c.name, j ? el('span', { class: 'sr-only' }, ' (você participa)') : null])]));
    }));
  }

  /* ================= boot ================= */
  function boot() {
    paintThemeBtns();
    var pfp = $('#pfp-eye');
    if (pfp) { var e = makeEye('pfp'); pfp.replaceChildren(e.root); }
    renderMe();
    fillKarmaMini();
    renderFriendsGrid();
    renderCommsGrid();

    var sf = $('#search-form');
    if (sf) sf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var inp = $('#search-q');
      var q = inp ? inp.value.trim() : '';
      if (q) go('#/busca/' + encodeURIComponent(q)); else if (inp) inp.focus();
    });
    var skip = $('#skip-link');
    if (skip) skip.addEventListener('click', function (ev) {
      ev.preventDefault();
      var m = $('#main');
      var t = m && (m.querySelector('.view-title') || m);
      if (t) t.focus();
    });

    if (H) {
      H.mural.list().then(function (all) {
        S.msgs = all;
        S.loaded = true;
        refreshLive();
      }, function () { S.loaded = true; refreshLive(); });
      H.mural.subscribe(function (all) {
        S.msgs = all;
        S.loaded = true;
        refreshLive();
      });
    }
    scheduleApprovals();
    if (S.friend && S.friend.state === 'pending') setTimeout(confirmFriend, Math.max(300, FRIEND_DELAY - (Date.now() - S.friend.at)));

    var h = location.hash;
    if (!S.me && (!h || h === '#' || h === '#/')) {
      try { history.replaceState(null, '', '#/entrar'); } catch (err) { /* file:// sem history */ }
    }
    window.addEventListener('hashchange', function () { route(false); });
    route(true);
    /* keep relative times fresh ("há X minutos") without a loop: once a minute, only when visible */
    setInterval(function () { if (!doc.hidden) $$('time.when').forEach(function (t) { var iso = t.getAttribute('datetime'); if (iso) t.textContent = rel(iso); }); }, 60000);
  }

  boot();
})();
