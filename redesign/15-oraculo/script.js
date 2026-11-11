/* HORNEY — 15 · O ORÁCULO
   Script clássico (carregado depois de ../assets/oraculo.js). Tudo que vem de fã (nome, texto,
   pergunta, localStorage, hash) vai pro DOM com textContent. Nunca innerHTML com dado de fora. */
(function () {
  'use strict';

  /* ============================================================ utilidades */

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const now = () => performance.now();

  const root = document.documentElement;
  const H = window.Horney && window.Horney.oraculo && window.Horney.mural ? window.Horney : null;
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const phoneMQ = matchMedia('(max-width: 719px)');
  let reduced = reduceMQ.matches;

  const PREFIXO = 'horney:15-oraculo:';
  const guarda = {
    ler(k, padrao) {
      try {
        const v = localStorage.getItem(PREFIXO + k);
        return v == null ? padrao : JSON.parse(v);
      } catch (e) { return padrao; }
    },
    gravar(k, v) { try { localStorage.setItem(PREFIXO + k, JSON.stringify(v)); } catch (e) { /* sem storage: fica na sessão */ } },
    apagar(k) { try { localStorage.removeItem(PREFIXO + k); } catch (e) { /* idem */ } }
  };

  function el(tag, cls, txt) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function linkExterno(label, href, cls) {
    const a = el('a', cls || 'botao', label);
    a.href = /^https:\/\//.test(href) ? href : 'https://www.instagram.com/horney.band/';
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  function hashTexto(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function diaChave(d) {
    const m = d.getMonth() + 1;
    const dia = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dia < 10 ? '0' : '') + dia;
  }

  const fmtData = (() => {
    let f = null;
    try {
      f = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { f = null; }
    return (iso) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return f ? f.format(d) : d.toISOString().slice(0, 16).replace('T', ' ');
    };
  })();

  const avisoEl = $('#aviso');
  let avisoT = 0;
  function aviso(msg) {
    if (!avisoEl) return;
    clearTimeout(avisoT);
    avisoEl.textContent = msg;
    avisoEl.classList.add('is-on');
    avisoT = setTimeout(() => {
      avisoEl.classList.remove('is-on');
      avisoT = setTimeout(() => { avisoEl.textContent = ''; }, 400);
    }, 4800);
  }

  /* ============================================================ dados */

  const IG = 'https://www.instagram.com/horney.band/';
  const DM = 'https://ig.me/m/horney.band';
  const ALBUM = 'https://open.spotify.com/album/7EM81z5ydGQq04ZbkIE5aS';

  const ARCANOS = {
    1: { rom: 'I', nome: 'O DISCO' },
    2: { rom: 'II', nome: 'A ESTRADA' },
    3: { rom: 'III', nome: 'A VISÃO' },
    4: { rom: 'IV', nome: 'O BANDO' },
    5: { rom: 'V', nome: 'A OFERENDA' },
    6: { rom: 'VI', nome: 'O MENSAGEIRO' }
  };

  // Uma lista só. Datas novas entram aqui e o status/"próximo show" mudam sozinhos.
  const SHOWS = [
    {
      data: '2026-09-17', dia: 'QUI',
      titulo: 'ROCK NIGHT @ FFFront — São Paulo/SP',
      onde: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso',
      texto: 'HORNEY e Mastrobiso dividindo a noite na FFFront. Joinville invadiu SP.',
      link: { label: 'Fotos no IG ↗', href: IG }
    },
    {
      data: '2026-10-03', dia: 'SÁB',
      titulo: 'HORNEY AO VIVO',
      onde: 'LOCAL NÃO INFORMADO',
      texto: 'Mais uma noite de ANTI-RASO ao vivo. Valeu quem colou 🖤',
      link: { label: 'Fotos no IG ↗', href: IG }
    },
    {
      data: '2026-10-09', dia: 'SEX',
      titulo: 'ÚLTIMO SHOW DO ANO ⚡️😈',
      onde: 'LOCAL EM BREVE — fica de olho no insta',
      texto: 'Último show do ano. SAI DE CASA E COLE NOS SHOWS!!! Local e ingressos saem primeiro nos stories.',
      link: { label: 'Infos no IG ↗', href: IG }
    }
  ];

  function statusShows() {
    const hoje = diaChave(new Date());
    return SHOWS.map((s) => Object.assign({}, s, {
      st: s.data < hoje ? 'passado' : s.data === hoje ? 'hoje' : 'proximo'
    }));
  }
  function proximoShow() {
    return statusShows().filter((s) => s.st !== 'passado').sort((a, b) => (a.data < b.data ? -1 : 1))[0] || null;
  }
  const br = (iso) => iso.split('-').reverse().join('/');

  // Tiragem: 6 arcanos × passado/presente/futuro = 18 leituras, cada uma termina numa chamada real.
  const LEITURAS = {
    1: [
      { t: 'No passado, o disco. Você ouviu OFF! no shuffle e chamou isso de conhecer. Não foi. São 13:53 de EP: volta do começo.',
        cta: { label: 'ouvir ANTI-RASO do começo ↗', href: ALBUM } },
      { t: 'No presente, o disco. ANTI-RASO está fora desde 30.07.2026. Quatro faixas, nenhuma pra pular. O agora tem fone.',
        cta: { label: 'OUVIR ANTI-RASO ↗', href: ALBUM } },
      { t: 'No futuro, o disco toca de novo: no seu fone, de luz apagada, em MERGULHAR. O olho já ouviu. Agora desce você.',
        cta: { label: 'ouvir MERGULHAR ↗', href: 'https://open.spotify.com/track/0aJtgSakI5r87CfAqNdDXP' } }
    ],
    2: [
      { t: 'No passado, a estrada. Teve Rock Night na FFFront em 17/09, teve 03/10, teve o último show do ano em 09/10. Se você não foi, o olho não julga. Só anota.',
        cta: { label: 'ver as fotos no IG ↗', href: IG } },
      { t: () => {
          const p = proximoShow();
          return p
            ? 'No presente, a estrada chama: ' + br(p.data) + ', ' + p.titulo + '. SAI DE CASA E COLE NOS SHOWS!!!'
            : 'No presente, a estrada está vazia: sem shows marcados. Não é fim, é intervalo. Quem segue o Instagram vê a data nova primeiro.';
        },
        cta: { label: 'abrir A ESTRADA', arcano: 2 } },
      { t: () => {
          const p = proximoShow();
          return p
            ? 'No futuro, ' + br(p.data) + ': ' + p.titulo + '. A grade já tem o seu lugar. Local e ingressos saem primeiro nos stories.'
            : 'No futuro, uma grade e um refrão de OFF! preso na garganta. A data o olho ainda não vê: ela sai primeiro nos stories.';
        },
        cta: { label: 'ficar de olho no @horney.band ↗', href: IG } }
    ],
    3: [
      { t: 'No passado, a visão. 2022, Fool\'s Game, dir. Rique Duarte. Antes do português, antes do mar. Todo olho começa em algum lugar.',
        cta: { label: 'assistir Fool\'s Game', arcano: 3 } },
      { t: 'No presente, a visão: 38 segundos de HORNEY ao vivo. Agora imagina inteiro, na tua frente.',
        cta: { label: 'ver HORNEY ao vivo', arcano: 3 } },
      { t: 'No futuro, você manda um clipe pra um amigo e ele finge que já conhecia. Deixa. Raso é quem não manda.',
        cta: { label: 'canal @bandaHorney ↗', href: 'https://www.youtube.com/@bandaHorney' } }
    ],
    4: [
      { t: 'No passado, o bando. Quatro salas, quatro bobos: Four Rooms for Four Fools, 2022. O primeiro EP, quando quase ninguém olhava. Você pode olhar agora.',
        cta: { label: 'ouvir Four Rooms for Four Fools ↗', href: 'https://open.spotify.com/album/3m7dNgjIIiHDuZiNcu8Vhi' } },
      { t: 'No presente, o bando: Duda Maiolini na voz e nas letras, Rafa Bello na composição, +2 fazendo o barulho todo acontecer. Joinville (SC) manda lembranças.',
        cta: { label: 'conhecer O BANDO', arcano: 4 } },
      { t: 'No futuro, o bando aumenta: você entra. Não tem ficha de inscrição, tem um botão de seguir.',
        cta: { label: '♫ Artista no Spotify ↗', href: 'https://open.spotify.com/artist/5zJVmieIGGEeOKbIrXmhZi' } }
    ],
    5: [
      { t: 'No passado, a oferenda. Você já vestiu camiseta de banda que nem conhecia direito. O olho lembra. Dessa vez, conhece primeiro e veste depois.',
        cta: { label: 'ver A OFERENDA (EM BREVE)', arcano: 5 } },
      { t: 'No presente, a oferenda ainda não existe: merch EM BREVE, nada à venda. Quem pede na DM fica sabendo primeiro.',
        cta: { label: 'Quero! manda DM ↗', href: DM } },
      { t: 'No futuro, uma camiseta preta com a porta no mar, o olho e o raio. Vai ser vista de longe na grade. Garante o teu antes.',
        cta: { label: 'me avisa (DM) ↗', href: DM } }
    ],
    6: [
      { t: 'No passado, o mensageiro. Teve uma mensagem que você não mandou. Pra aquela já passou. Pra essa, ainda dá tempo.',
        cta: { label: 'Mandar DM ↗', href: DM } },
      { t: 'No presente, o mensageiro tem arroba: @horney.band. Instagram, TikTok, Threads. Escolhe a tua superfície; a conversa séria é na DM.',
        cta: { label: 'abrir O MENSAGEIRO', arcano: 6 } },
      { t: 'No futuro, uma voz tua desce até o fundo e fica lá, brilhando. O olho guarda. Deixa uma oferenda.',
        cta: { label: 'descer ao fundo ◎', fundo: true } }
    ]
  };

  /* ============================================================ estado do olho */

  const slot = $('#olho-slot');
  const svgAlvos = [slot];
  const E = {
    state: 'dorme',
    pointer: { x: 0, y: 0, at: -1e9, cx: 0, cy: 0 },
    tilt: { x: 0, y: 0, at: -1e9 },
    sacc: { x: 0, y: 0 },
    hover: 0,
    kick: 0,
    blinkAt: -1e9,
    blinkDur: 170,
    contractUntil: 0,
    inputDir: { x: 0, y: -0.6 },
    answerDir: { x: 0, y: -0.5 },
    scan: { x: 0, y: 0 },
    leitura: null
  };
  // valores amortecidos (o olho começa fechado e abre)
  const S = { lx: 0, ly: 0, dil: 0.3, lid: 1, pensa: 0, surf: 0, rot: 0, ripple: 0, time: 8 };
  let surfAlvo = 0;
  let dormindo = false;

  // posição/tamanho do olho no ecrã (px CSS) — vinda do scroll e da subida do ritual
  const M = { vw: innerWidth, vh: innerHeight, sx: innerWidth / 2, sy: innerHeight * 0.35, sd: 300, mTop: 1e5, mH: 1, fTop: 1e5 };
  const P = { cx: 0, cy: 0, d: 300, dive: 0, depth: 0, fade: 1 };
  let scrollY0 = 0;
  let scrollSujo = true;

  function setState(st) {
    if (E.state === st) return;
    E.state = st;
    root.dataset.eye = st;
    if (st === 'vigia') agendarOcioso();
    som.estado(st);
    kick();
  }

  // o olho só vale render quando aparece: fora da tela ou com a pupila engolindo tudo, nada de quadro extra
  function olhoVisivel() {
    if (!gl) return true;
    if (S.surf > 0.02 || surfAlvo > 0) return true;
    if (P.dive > 0.98) return false;
    return P.cy + P.d * 0.65 > 0 && P.cy - P.d * 0.65 < M.vh;
  }

  function piscar(dur) {
    if (reduced || dormindo || !olhoVisivel()) return;
    E.blinkAt = now();
    E.blinkDur = dur || 170;
    som.piscada();
    kick();
  }

  function alvos(t) {
    let tx = 0, ty = 0, dil = 0.3, lid = 0, pensa = 0, rate = 9;
    switch (E.state) {
      case 'vigia': {
        if (reduced) break;
        const usaTilt = E.tilt.at > E.pointer.at;
        const ativo = usaTilt ? E.tilt.at : E.pointer.at;
        if (t - ativo < 2600) {
          if (usaTilt) { tx = E.tilt.x; ty = E.tilt.y; }
          else {
            tx = clamp((E.pointer.cx - P.cx) / (M.vw * 0.5), -1, 1);
            ty = clamp((P.cy - E.pointer.cy) / (M.vh * 0.5), -1, 1);
          }
        } else {
          tx = E.sacc.x; ty = E.sacc.y; rate = 20;
        }
        dil = 0.3 + E.hover * 0.32;
        break;
      }
      case 'escuta':
        tx = E.inputDir.x; ty = E.inputDir.y; dil = 0.34 + E.kick; rate = 7;
        break;
      case 'pensa':
        tx = 0.1 + Math.sin(S.time * 0.9) * 0.14; ty = 0.85; dil = 0.5; lid = 0.5; pensa = 1; rate = 2.6;
        break;
      case 'responde':
        tx = E.answerDir.x; ty = E.answerDir.y; dil = t < E.contractUntil ? 0.0 : 0.28; rate = 8;
        break;
      case 'le':
        tx = E.scan.x; ty = E.scan.y; dil = 0.42; lid = 0.14; rate = 16;
        break;
      case 'dorme':
        lid = 1; dil = 0.3; rate = 3;
        break;
    }
    return { tx, ty, dil, lid, pensa, rate };
  }

  function posicionar() {
    // dive: do topo de #mergulho entrando por baixo até o fim dele
    const y = scrollY0;
    const p = clamp((y + M.vh - M.mTop) / Math.max(1, M.mH));
    const k = smooth(0, 0.42, p);
    const slotY = M.sy - y;
    let cx = lerp(M.sx, M.vw / 2, k);
    let cy = lerp(slotY, M.vh * 0.5, k);
    let d = lerp(M.sd, Math.min(M.vw, M.vh) * 0.66, k);
    let dive = smooth(0.22, 1, p);
    // ritual: o olho sobe do fundo pra ler a oferenda
    const s = S.surf;
    if (s > 0.0005) {
      const sd = Math.min(M.vw * 0.72, M.vh * (phoneMQ.matches ? 0.34 : 0.42));
      cx = lerp(cx, M.vw / 2, s);
      cy = lerp(cy, phoneMQ.matches ? M.vh * 0.2 : M.vh * 0.26, s);
      d = lerp(d, sd, s);
      dive *= 1 - s;
    }
    P.cx = cx; P.cy = cy; P.d = Math.max(40, d);
    P.dive = dive;
    P.depth = dive * 0.4 + Math.max(0, y - M.fTop) / M.vh * 0.3;
    P.fade = 1 - 0.22 * smooth(0.8, 1, p) * (1 - s);
  }

  // um passo da máquina de estados; devolve true enquanto ainda há movimento
  let blinkVal = 0;
  function passo(dt, t) {
    if (scrollSujo) { scrollY0 = scrollY; scrollSujo = false; }
    const A = alvos(t);

    if (E.state === 'le' && E.leitura) avancarLeitura(t);

    if (reduced) {
      S.lx = A.tx; S.ly = A.ty; S.dil = A.dil; S.lid = A.lid; S.pensa = A.pensa; S.surf = surfAlvo;
      S.ripple = 0; E.kick = 0; blinkVal = 0;
      posicionar();
      return false;
    }

    const prev = S.lx + S.ly * 3 + S.dil * 7 + S.lid * 11 + S.pensa * 13 + S.surf * 17;
    S.time += dt;
    S.lx += (A.tx - S.lx) * damp(A.rate, dt);
    S.ly += (A.ty - S.ly) * damp(A.rate, dt);
    const dilRate = E.state === 'responde' && t < E.contractUntil ? 16 : E.state === 'escuta' ? 9 : 4;
    S.dil += (A.dil - S.dil) * damp(dilRate, dt);
    S.lid += (A.lid - S.lid) * damp(E.state === 'dorme' ? 2.4 : 6, dt);
    S.pensa += (A.pensa - S.pensa) * damp(2.6, dt);
    S.surf += (surfAlvo - S.surf) * damp(2.8, dt);
    if (E.state === 'pensa') S.rot += dt * 0.9;
    S.ripple *= Math.exp(-2.4 * dt);
    E.kick *= Math.exp(-1.5 * dt);

    const bt = (t - E.blinkAt) / E.blinkDur;
    blinkVal = bt >= 0 && bt <= 1 ? Math.sin(Math.PI * bt) : 0;

    posicionar();

    const delta = Math.abs(S.lx - A.tx) + Math.abs(S.ly - A.ty) + Math.abs(S.dil - A.dil) +
      Math.abs(S.lid - A.lid) + Math.abs(S.pensa - A.pensa) + Math.abs(S.surf - surfAlvo);
    const mudou = Math.abs(prev - (S.lx + S.ly * 3 + S.dil * 7 + S.lid * 11 + S.pensa * 13 + S.surf * 17)) > 1e-5;
    return delta > 0.002 || mudou && delta > 0.0005 || bt < 1.05 && bt >= 0 ||
      S.ripple > 0.004 || E.kick > 0.004 || E.state === 'pensa' || E.state === 'le';
  }

  /* ============================================================ WebGL: o olho em shader */

  const VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';

  const FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform float uTime;',
    'uniform vec2 uRes;',
    'uniform float uDpr;',
    'uniform float uFit;',
    'uniform vec2 uCenter;',
    'uniform vec2 uLook;',
    'uniform float uDilate;',
    'uniform float uLid;',
    'uniform float uDive;',
    'uniform float uDepth;',
    'uniform float uPensa;',
    'uniform float uRipple;',
    'uniform float uRot;',
    'uniform float uFade;',
    'const vec3 YEL = vec3(0.949, 0.663, 0.0);',
    'const vec3 YEL_HI = vec3(1.0, 0.824, 0.29);',
    'const vec3 ORG = vec3(0.72, 0.30, 0.0);',
    'const vec3 INK = vec3(0.016, 0.013, 0.010);',
    'const vec3 SCL = vec3(0.93, 0.90, 0.83);',
    'const vec3 MAG = vec3(1.0, 0.169, 0.839);',
    'const vec3 BLU = vec3(0.106, 0.231, 1.0);',
    'const float TAU = 6.2831853;',
    'float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
    '  float a=hash(i);float b=hash(i+vec2(1.0,0.0));float c=hash(i+vec2(0.0,1.0));float d=hash(i+vec2(1.0,1.0));',
    '  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}',
    'float fbm(vec2 p){float v=0.0;float a=0.5;mat2 r=mat2(0.8,-0.6,0.6,0.8);',
    '  for(int i=0;i<4;i++){v+=a*noise(p);p=r*p*2.02+17.1;a*=0.5;}return v;}',
    // túnel log-polar dentro da pupila: no fundo vira magenta/azul
    'vec3 tunnel(vec2 q, float sd){',
    '  float lq=log(max(length(q),1e-4));',
    '  float u=lq*1.25-uTime*0.05-uDepth*9.0;',
    '  float id=floor(u);float f=fract(u);',
    '  float ring=smoothstep(0.0,0.5,f)*smoothstep(1.0,0.6,f);',
    '  float ang=uTime*0.015+id*0.4;',
    '  mat2 rot=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));',
    '  vec2 qd=rot*(q/max(length(q),1e-4));',
    '  float fib=fbm(qd*5.0+vec2(id*1.73,id*0.91));',
    '  float streak=pow(fib,2.5)*ring;',
    '  float spark=smoothstep(0.82,0.95,noise(qd*40.0+id*3.1))*ring;',
    '  float tb=smoothstep(-3.0,-0.4,log(max(sd,1e-4)));',
    '  vec3 deep=mix(MAG,BLU,0.5+0.5*sin(id*1.9));',
    '  vec3 tint=mix(YEL,deep,clamp(uDive*1.4,0.0,1.0));',
    '  return (tint*streak*1.25+mix(tint,vec3(1.0),0.5)*spark*0.45)*tb;}',
    'void main(){',
    '  vec2 frag=gl_FragCoord.xy;',
    '  vec2 s=(frag-0.5*uRes)/uRes.y*uFit-uCenter;',
    '  float zoom=exp(4.3*pow(uDive,1.5));',
    '  vec2 c=uLook*vec2(0.115,0.045);',
    '  vec2 p=c+(s-c)/zoom;',
    '  float px=uFit/uRes.y/zoom;',
    '  vec3 col=vec3(0.028,0.024,0.02);',
    '  col+=mix(YEL,BLU,max(uPensa*0.8,uDive))*0.05*(1.0-smoothstep(0.0,1.4,length(s)/uFit*1.6));',
    // disco amarelo com retícula
    '  vec2 pd=p*vec2(0.97,1.03);float rd=length(pd);vec2 ddir=pd/max(rd,1e-5);',
    '  float RD=0.56+(noise(ddir*3.0+uTime*0.3)-0.5)*0.01;',
    '  float discMask=1.0-smoothstep(RD-px*1.5,RD+px*1.5,rd);',
    '  float glow=exp(-max(rd-RD,0.0)*7.0);',
    '  col+=mix(YEL,MAG,uPensa)*glow*0.26*(1.0-discMask);',
    '  float shade=smoothstep(0.30,RD,rd);',
    '  vec2 hp=mat2(0.7071,-0.7071,0.7071,0.7071)*frag/(5.0*uDpr);',
    '  float dotD=length(fract(hp)-0.5);float dotR=shade*0.62-0.07;',
    '  float ht=1.0-smoothstep(dotR-0.06,dotR+0.06,dotD);',
    '  vec3 discCol=mix(YEL_HI,YEL,smoothstep(0.0,0.45,rd));',
    '  discCol=mix(discCol,mix(ORG,MAG*0.7,uPensa*0.6),ht*0.9);',
    '  discCol=mix(discCol,INK,smoothstep(RD-0.014-px,RD-0.014,rd));',
    '  col=mix(col,discCol,discMask);',
    // raios pretos desenhados à mão
    '  vec2 ps=p*vec2(0.95,1.05);float r=length(ps);vec2 dir=ps/max(r,1e-5);',
    '  float a=atan(ps.y,ps.x+1e-6);float N=15.0;float t=a/TAU*N+0.25;',
    '  float rid=mod(floor(t),N);float spike=pow(1.0-abs(fract(t)-0.5)*2.0,2.4);',
    '  float jit=hash(vec2(rid,7.3));float breathe=sin(uTime*1.3+rid*1.7)*0.012;',
    '  float R=0.335+(0.105+0.06*jit+breathe)*spike;',
    '  R+=(noise(dir*7.0+p*4.0+uTime*0.2)-0.5)*0.02;',
    '  float sunMask=1.0-smoothstep(R-px*1.5,R+px*1.5,r);',
    '  col=mix(col,INK,sunMask);',
    // o olho: pálpebra superior desce no "pensa", as duas fecham no "dorme"
    '  float W=0.32;float xn=clamp(p.x/W,-1.0,1.0);float lidc=1.0-xn*xn;',
    '  float up=0.172*lidc*(1.0-uLid);',
    '  float lo=0.128*lidc*(1.0-smoothstep(0.55,1.0,uLid));',
    '  float h=p.y>0.0?up:lo;float e=abs(p.y)-h;',
    '  float xcap=1.0-smoothstep(W,W+px*2.0,abs(p.x));',
    '  float eyeMask=(1.0-smoothstep(-px*1.2,px*1.2,e))*xcap*smoothstep(0.0,0.08,1.0-uLid);',
    '  float closed=smoothstep(0.6,0.95,uLid);',
    '  float lidLine=(1.0-smoothstep(0.007,0.007+px*1.5,abs(p.y+0.02*lidc)))*xcap*closed;',
    '  float lash=(1.0-smoothstep(0.004,0.004+px*1.5,abs(p.y-up)))*step(0.0,p.y)*xcap*smoothstep(0.15,0.4,uLid)*(1.0-closed);',
    '  if(eyeMask>0.0){',
    '    vec2 ip=p-c;float ir=length(ip);float Ri=0.118;float Rp=mix(0.026,0.092,uDilate);',
    '    vec3 inner=SCL*(0.72+0.28*lidc);',
    '    inner=mix(inner,vec3(0.86,0.6,0.55),0.12*xn*xn);',
    '    if(ir>Rp-px*2.0&&ir<Ri+0.01){',
    '      vec2 idir=ip/max(ir,1e-5);',
    '      float ca=cos(uRot);float sa=sin(uRot);idir=mat2(ca,-sa,sa,ca)*idir;',
    '      float rr=clamp((ir-Rp)/(Ri-Rp),0.0,1.0);',
    '      float rip=uRipple*sin(rr*24.0-uTime*16.0)*(1.0-rr*0.6);',
    '      float fib=fbm(idir*(9.0+rr*1.8)+vec2(uTime*0.02+rip*0.35,3.0));',
    '      float fib2=noise(idir*46.0+rr*2.0+rip);',
    '      vec3 iris=mix(ORG*0.5,YEL,smoothstep(0.3,0.75,fib));',
    '      iris=mix(iris,YEL_HI,smoothstep(0.55,0.95,fib2)*0.55*(1.0-rr));',
    '      vec3 irisP=mix(BLU*0.6,MAG,smoothstep(0.3,0.75,fib));',
    '      irisP=mix(irisP,vec3(1.0,0.75,0.97),smoothstep(0.6,0.95,fib2)*0.5*(1.0-rr));',
    '      iris=mix(iris,irisP,uPensa);',
    '      float cr=(rr-0.25)*7.0;',
    '      iris+=mix(YEL_HI,MAG,uPensa)*0.4*exp(-cr*cr)*fib;',
    '      iris*=1.0+rip*0.45;',
    '      iris*=mix(1.0,0.18,smoothstep(0.72,1.0,rr));',
    '      iris*=mix(0.45,1.0,smoothstep(0.0,0.14,rr));',
    '      float irisMask=1.0-smoothstep(Ri-px*1.5,Ri+px*1.5,ir);',
    '      inner=mix(inner,iris,irisMask);',
    '    }',
    '    if(ir<Rp+px*2.0){',
    '      float pupilMask=1.0-smoothstep(Rp-px*1.5,Rp+px*1.5,ir);',
    '      vec3 deep=INK+tunnel(ip/Rp,ir*zoom/uFit)*mix(0.35,1.0,uDive);',
    '      inner=mix(inner,deep,pupilMask);',
    '    }',
    '    inner*=1.0-(p.y>0.0?0.5:0.25)*smoothstep(-0.05,0.0,e)*(1.0-uLid);',
    '    float hl=1.0-smoothstep(0.017-px,0.017+px,length(p-c-vec2(-0.042,0.04)));',
    '    inner=mix(inner,vec3(1.0,0.98,0.94),hl*0.95*(1.0-smoothstep(0.08,0.4,uDive)));',
    '    col=mix(col,inner,eyeMask);',
    '  }',
    '  col=mix(col,YEL*0.95,max(lidLine,lash*0.9));',
    '  col*=uFade;',
    '  col+=(hash(frag+fract(uTime*7.0)*113.0)-0.5)*0.05;',
    '  gl_FragColor=vec4(max(col,0.0),1.0);',
    '}'
  ].join('\n');

  function iniciarGL() {
    if (reduced) return null;
    const canvas = $('#olho-gl');
    if (!canvas) return null;
    let g = null;
    try {
      g = canvas.getContext('webgl', {
        antialias: false, alpha: false, depth: false, stencil: false,
        preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true
      });
    } catch (e) { g = null; }
    if (!g) return null;

    function compilar(tipo, fonte) {
      const sh = g.createShader(tipo);
      if (!sh) return null;
      g.shaderSource(sh, fonte);
      g.compileShader(sh);
      return g.getShaderParameter(sh, g.COMPILE_STATUS) ? sh : null;
    }
    const vs = compilar(g.VERTEX_SHADER, VERT);
    const fs = compilar(g.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = g.createProgram();
    g.attachShader(prog, vs);
    g.attachShader(prog, fs);
    g.linkProgram(prog);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) return null;
    g.useProgram(prog);

    const buf = g.createBuffer();
    g.bindBuffer(g.ARRAY_BUFFER, buf);
    g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
    const aPos = g.getAttribLocation(prog, 'aPos');
    g.enableVertexAttribArray(aPos);
    g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);

    const U = {};
    ['uTime', 'uRes', 'uDpr', 'uFit', 'uCenter', 'uLook', 'uDilate', 'uLid', 'uDive', 'uDepth',
      'uPensa', 'uRipple', 'uRot', 'uFade'].forEach((n) => { U[n] = g.getUniformLocation(prog, n); });

    let qual = 1;
    let lentos = 0;
    let dpr = 1;
    function redimensionar() {
      const w = innerWidth;
      const h = innerHeight;
      // o shader é tela cheia: densidade limitada (≤1.5) e reduzida se o aparelho sofrer
      dpr = Math.min(window.devicePixelRatio || 1, w < 720 ? 1.25 : 1) * qual;
      const bw = Math.max(1, Math.round(w * dpr));
      const bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      g.viewport(0, 0, bw, bh);
    }
    redimensionar();

    function desenhar(dt) {
      if (g.isContextLost()) return;
      if (dt > 0.045) {
        if (++lentos > 24 && qual > 0.6) { qual -= 0.15; lentos = 0; redimensionar(); }
      } else if (lentos > 0) lentos--;
      const bw = canvas.width;
      const bh = canvas.height;
      const fit = 1.12 * M.vh / P.d;
      g.uniform1f(U.uTime, S.time);
      g.uniform2f(U.uRes, bw, bh);
      g.uniform1f(U.uDpr, dpr);
      g.uniform1f(U.uFit, fit);
      g.uniform2f(U.uCenter, (P.cx - M.vw / 2) / M.vh * fit, (M.vh / 2 - P.cy) / M.vh * fit);
      const lookScale = 1 - P.dive * 0.85;
      g.uniform2f(U.uLook, S.lx * lookScale, S.ly * lookScale);
      g.uniform1f(U.uDilate, Math.max(clamp(S.dil), smooth(0, 0.55, P.dive)));
      g.uniform1f(U.uLid, clamp(Math.max(S.lid, blinkVal) * (1 - P.dive)));
      g.uniform1f(U.uDive, P.dive);
      g.uniform1f(U.uDepth, P.depth);
      g.uniform1f(U.uPensa, clamp(S.pensa));
      g.uniform1f(U.uRipple, clamp(S.ripple));
      g.uniform1f(U.uRot, S.rot);
      g.uniform1f(U.uFade, P.fade);
      g.drawArrays(g.TRIANGLES, 0, 3);
    }

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      gl = null;
      root.classList.remove('gl-on');
      medirLogo();
    });

    return { desenhar, redimensionar };
  }

  /* ============================================================ SVG (sem WebGL / movimento reduzido) */

  let ultimoSvg = '';
  function escreverSvg() {
    const v = [S.lx, S.ly, clamp(S.dil), clamp(Math.max(S.lid, blinkVal)), clamp(S.pensa), S.rot % 6.2832]
      .map((n) => n.toFixed(3));
    const chave = v.join(',');
    if (chave === ultimoSvg) return;
    ultimoSvg = chave;
    svgAlvos.forEach((alvo) => {
      const st = alvo.style;
      st.setProperty('--gx', v[0]);
      st.setProperty('--gy', v[1]);
      st.setProperty('--dil', v[2]);
      st.setProperty('--lid', v[3]);
      st.setProperty('--pensa', v[4]);
      st.setProperty('--rot', v[5]);
    });
  }

  /* ============================================================ laço de render (só quando algo muda) */

  let gl = null;
  let raf = 0;
  let ultimoT = 0;

  function kick() {
    if (raf || document.hidden) return;
    ultimoT = now();
    raf = requestAnimationFrame(quadro);
  }

  function quadro(t) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0.001, (t - ultimoT) / 1000));
    ultimoT = t;
    const sujo = scrollSujo;
    const ocupado = passo(dt, t);
    if (gl) gl.desenhar(dt);
    else escreverSvg();
    if (ocupado || sujo) raf = requestAnimationFrame(quadro);
  }

  /* ---------- medidas (lidas uma vez por resize, nunca dentro do scroll) */

  const mergulhoEl = $('#mergulho');
  const fundoEl = $('#fundo');
  let medirAgendado = false;

  function medir() {
    medirAgendado = false;
    M.vw = innerWidth;
    M.vh = innerHeight;
    const y = scrollY;
    const r = slot.getBoundingClientRect();
    M.sx = r.left + r.width / 2;
    M.sy = r.top + y + r.height / 2;
    M.sd = r.width;
    if (mergulhoEl) {
      const mr = mergulhoEl.getBoundingClientRect();
      M.mTop = mr.top + y;
      M.mH = mr.height;
    }
    if (fundoEl) M.fTop = fundoEl.getBoundingClientRect().top + y;
    if (gl) gl.redimensionar();
    scrollSujo = true;
    kick();
  }
  function medirLogo() {
    if (medirAgendado) return;
    medirAgendado = true;
    requestAnimationFrame(medir);
  }

  addEventListener('resize', medirLogo);
  addEventListener('load', medirLogo);
  if ('ResizeObserver' in window) new ResizeObserver(medirLogo).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirLogo);

  addEventListener('scroll', () => {
    scrollSujo = true;
    notarEntrada();
    kick();
  }, { passive: true });

  /* ---------- ocioso: sacadas e piscadas agendadas (sem laço contínuo) */

  let tSacada = 0;
  let tPiscada = 0;
  function limparOcioso() {
    clearTimeout(tSacada);
    clearTimeout(tPiscada);
  }
  function agendarOcioso() {
    limparOcioso();
    if (reduced || dormindo || document.hidden) return;
    tSacada = setTimeout(function sacada() {
      if (E.state === 'vigia') {
        E.sacc.x = (Math.random() * 2 - 1) * 0.8;
        E.sacc.y = (Math.random() * 2 - 1) * 0.55;
        if (olhoVisivel()) kick();
      }
      tSacada = setTimeout(sacada, 900 + Math.random() * 2600);
    }, 1200 + Math.random() * 1500);
    tPiscada = setTimeout(function piscadaOciosa() {
      if (E.state === 'vigia' || E.state === 'escuta') {
        piscar();
        if (Math.random() < 0.15) setTimeout(() => piscar(), 260);
      }
      tPiscada = setTimeout(piscadaOciosa, 2800 + Math.random() * 4500);
    }, 2400 + Math.random() * 2000);
  }

  /* ---------- sono: 40 s sem nada e o olho fecha; qualquer coisa acorda */

  const acordarBtn = $('#acordar');
  let tSono = 0;
  function notarEntrada() {
    if (dormindo) acordar();
    clearTimeout(tSono);
    tSono = setTimeout(dormir, 40000);
  }
  function dormir() {
    if (E.state === 'pensa' || E.state === 'le' || algumDialogo()) {
      tSono = setTimeout(dormir, 15000);
      return;
    }
    dormindo = true;
    limparOcioso();
    setState('dorme');
    root.classList.add('is-asleep');
    if (acordarBtn) acordarBtn.hidden = false;
  }
  function acordar() {
    if (!dormindo) return;
    dormindo = false;
    root.classList.remove('is-asleep');
    if (acordarBtn) acordarBtn.hidden = true;
    E.state = 'dorme';
    setState('vigia');
  }
  if (acordarBtn) {
    acordarBtn.addEventListener('click', () => {
      notarEntrada();
      const campo = $('#pergunta');
      if (campo) campo.focus({ preventScroll: true });
    });
  }
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => {
    addEventListener(ev, notarEntrada, { passive: true });
  });

  /* ---------- olhar: ponteiro, hover, giroscópio */

  addEventListener('pointermove', (e) => {
    E.pointer.cx = e.clientX;
    E.pointer.cy = e.clientY;
    E.pointer.at = now();
    notarEntrada();
    if (E.state === 'vigia' && !reduced && olhoVisivel()) kick();
  }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const h = e.target && e.target.closest && e.target.closest('a, button, input, textarea, label') ? 1 : 0;
    if (h !== E.hover) {
      E.hover = h;
      if (!reduced) kick();
    }
  });

  if (slot) {
    slot.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      piscar(140);
    });
  }

  function aoInclinar(e) {
    if (e.gamma == null || e.beta == null) return;
    const x = clamp(e.gamma / 28, -1, 1);
    const y = clamp((50 - e.beta) / 28, -1, 1);
    if (Math.abs(x - E.tilt.x) < 0.03 && Math.abs(y - E.tilt.y) < 0.03) return;
    E.tilt.x = x;
    E.tilt.y = y;
    E.tilt.at = now();
    if (E.state === 'vigia' && !dormindo && !reduced && olhoVisivel()) kick();
  }
  const tiltBtn = $('#btn-tilt');
  const DOE = window.DeviceOrientationEvent;
  if (tiltBtn && DOE && !reduced && matchMedia('(pointer: coarse)').matches) {
    if (typeof DOE.requestPermission === 'function') {
      // iOS: a permissão só é pedida depois de um toque explícito
      tiltBtn.hidden = false;
      tiltBtn.addEventListener('click', () => {
        DOE.requestPermission()
          .then((st) => {
            if (st === 'granted') {
              addEventListener('deviceorientation', aoInclinar);
              aviso('Pronto: o olho segue o teu celular.');
            } else {
              aviso('Sem permissão do giroscópio. O olho segue o teu dedo mesmo.');
            }
          })
          .catch(() => aviso('O giroscópio não respondeu. O olho segue o teu dedo mesmo.'))
          .finally(() => { tiltBtn.hidden = true; });
      });
    } else {
      addEventListener('deviceorientation', aoInclinar);
    }
  }

  /* ---------- aba oculta: tudo para */

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      root.classList.add('is-hidden');
      limparOcioso();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      som.pausar();
    } else {
      root.classList.remove('is-hidden');
      agendarOcioso();
      som.retomar();
      scrollSujo = true;
      kick();
    }
  });

  /* ============================================================ som (Web Audio, desligado por padrão) */

  const som = (() => {
    let ctx = null;
    let mestre = null;
    let filtro = null;
    let ligado = false;
    let tSusp = 0;

    function montar() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      mestre = ctx.createGain();
      mestre.gain.value = 0;
      mestre.connect(ctx.destination);
      filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 380;
      filtro.Q.value = 5;
      filtro.connect(mestre);
      [[55, 'sawtooth', 0.22], [82.41, 'sine', 0.5], [110.4, 'triangle', 0.14], [164.8, 'sine', 0.06]].forEach((o) => {
        const osc = ctx.createOscillator();
        osc.type = o[1];
        osc.frequency.value = o[0];
        const gn = ctx.createGain();
        gn.gain.value = o[2];
        osc.connect(gn);
        gn.connect(filtro);
        osc.start();
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lg = ctx.createGain();
      lg.gain.value = 150;
      lfo.connect(lg);
      lg.connect(filtro.frequency);
      lfo.start();
      return true;
    }

    function nivel() {
      if (!ctx || !ligado) return;
      const t = ctx.currentTime;
      const st = E.state;
      mestre.gain.setTargetAtTime(st === 'dorme' ? 0.015 : 0.055, t, 0.6);
      filtro.frequency.setTargetAtTime(st === 'pensa' ? 1100 : st === 'le' ? 700 : 380, t, 0.4);
    }

    return {
      alternar() {
        if (!ligado) {
          if (!ctx && !montar()) return false;
          clearTimeout(tSusp);
          ligado = true;
          ctx.resume();
          nivel();
        } else {
          ligado = false;
          mestre.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
          clearTimeout(tSusp);
          tSusp = setTimeout(() => { if (!ligado && ctx) ctx.suspend(); }, 1400);
        }
        return ligado;
      },
      ligado: () => ligado,
      estado() { nivel(); },
      piscada() {
        if (!ctx || !ligado) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(1300, t);
        o.frequency.exponentialRampToValueAtTime(420, t + 0.09);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.14);
      },
      pausar() { if (ctx && ligado) ctx.suspend(); },
      retomar() { if (ctx && ligado) ctx.resume(); }
    };
  })();

  const somBtn = $('#btn-som');
  const somEstado = $('#som-estado');
  if (somBtn) {
    somBtn.addEventListener('click', () => {
      const on = som.alternar();
      somBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (somEstado) somEstado.textContent = on ? 'on' : 'off';
      if (!on && !(window.AudioContext || window.webkitAudioContext)) aviso('Este navegador não tem Web Audio. O olho fica em silêncio.');
    });
  }

  /* ============================================================ vigília: perguntar ao olho */

  const form = $('#pergunta-form');
  const campo = $('#pergunta');
  const publica = $('#publica');
  const enviarBtn = form ? form.querySelector('.pergunta__enviar') : null;
  const respBox = $('#resposta');
  const respPergunta = $('#resposta-pergunta');
  const respTexto = $('#resposta-texto');
  const respLinks = $('#resposta-links');
  const respLive = $('#resposta-live');
  const respArcano = $('#resposta-arcano');
  const respCarta = $('#resposta-carta');
  const respCartaUse = $('#resposta-carta-use');
  const respCartaNome = $('#resposta-carta-nome');
  let perguntando = false;
  let tEscuta = 0;
  let tVolta = 0;

  function direcaoPara(elemento) {
    if (!elemento) return { x: 0, y: -0.5 };
    const r = elemento.getBoundingClientRect();
    return {
      x: clamp((r.left + r.width / 2 - P.cx) / (M.vw * 0.5), -1, 1),
      y: clamp((P.cy - (r.top + r.height / 2)) / (M.vh * 0.5), -1, 1)
    };
  }

  if (campo) {
    campo.addEventListener('focus', () => {
      if (perguntando) return;
      E.inputDir = direcaoPara(campo);
    });
    campo.addEventListener('input', () => {
      if (perguntando) return;
      E.inputDir = direcaoPara(campo);
      if (!reduced) {
        E.kick = Math.min(0.42, E.kick + 0.06);
        S.ripple = 1;
      }
      setState('escuta');
      kick();
      clearTimeout(tEscuta);
      tEscuta = setTimeout(() => { if (E.state === 'escuta') setState('vigia'); }, 2600);
    });
    campo.addEventListener('blur', () => {
      if (E.state === 'escuta') setState('vigia');
    });
  }

  function arcanoDa(resp) {
    switch (resp.intent) {
      case 'shows': return 2;
      case 'ouvir': return (resp.links || []).some((l) => /youtube\.com/.test(l.href)) ? 3 : 1;
      case 'merch': return 5;
      case 'banda': return 4;
      case 'contato': return 6;
      default: return 0;
    }
  }

  function escreverPalavras(alvo, texto) {
    alvo.textContent = '';
    if (reduced) { alvo.textContent = texto; return; }
    texto.split(/\s+/).filter(Boolean).forEach((w, i) => {
      const s = el('span', 'palavra', w);
      s.style.setProperty('--w', String(i));
      alvo.appendChild(s);
      alvo.appendChild(document.createTextNode(' '));
    });
  }

  function anunciar(regiao, texto) {
    if (!regiao) return;
    regiao.textContent = '';
    setTimeout(() => { regiao.textContent = texto; }, 60);
  }

  function mostrarResposta(q, resp) {
    if (!respBox) return;
    respBox.hidden = false;
    root.classList.add('is-respondendo');
    respPergunta.textContent = q || '(silêncio)';
    escreverPalavras(respTexto, resp.text);
    anunciar(respLive, 'O olho responde: ' + resp.text);

    respLinks.textContent = '';
    (resp.links || []).forEach((l) => {
      if (l && typeof l.href === 'string' && typeof l.label === 'string') respLinks.appendChild(linkExterno(l.label + ' ↗', l.href));
    });

    const n = arcanoDa(resp);
    if (n && respArcano) {
      respArcano.hidden = false;
      respArcano.classList.remove('surge');
      void respArcano.offsetWidth;
      respArcano.classList.add('surge');
      respCartaUse.setAttribute('href', '#ilus-' + n);
      respCartaNome.textContent = ARCANOS[n].rom + ' · ' + ARCANOS[n].nome;
      respCarta.dataset.arcano = String(n);
    } else if (respArcano) {
      respArcano.hidden = true;
    }

    medirLogo();
    const r = respBox.getBoundingClientRect();
    const baixo = phoneMQ.matches ? M.vh - 130 : M.vh;
    if (r.top < 60 || r.top > baixo - 80) {
      respBox.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
    E.answerDir = direcaoPara(respTexto);
  }

  if (respCarta) {
    respCarta.addEventListener('click', () => {
      const n = parseInt(respCarta.dataset.arcano || '1', 10);
      abrirArcano(n, respCarta);
    });
  }

  function responder() {
    E.contractUntil = now() + 1700;
    setTimeout(kick, 1720);
    setState('responde');
    piscar(110);
    clearTimeout(tVolta);
    tVolta = setTimeout(() => { if (E.state === 'responde') setState('vigia'); }, 4200);
  }

  function perguntar(textoBruto) {
    if (perguntando) return;
    const q = String(textoBruto || '').trim();
    notarEntrada();
    if (!H) {
      mostrarResposta(q, {
        text: 'O olho está fora do ar agora: o oráculo não carregou. As cartas lá embaixo ainda abrem, e a DM no Instagram nunca fecha.',
        intent: 'indisponivel',
        links: [{ label: 'DM no Instagram', href: DM }]
      });
      return;
    }
    perguntando = true;
    clearTimeout(tEscuta);
    clearTimeout(tVolta);
    if (enviarBtn) enviarBtn.disabled = true;
    if (form) form.setAttribute('aria-busy', 'true');
    anunciar(respLive, 'O olho está pensando…');
    setState('pensa');
    const espera = q ? 700 + Math.random() * 700 : 700;
    setTimeout(() => {
      let resp;
      try {
        resp = H.oraculo.ask(q);
      } catch (e) {
        resp = { text: 'O olho piscou e perdeu o fio. Pergunta de novo.', intent: 'visao', links: [] };
      }
      perguntando = false;
      if (enviarBtn) enviarBtn.disabled = false;
      if (form) form.removeAttribute('aria-busy');
      responder();
      mostrarResposta(q, resp);
      if (q && resp.intent !== 'vazio') {
        guardarConsulta(q, resp);
        if (publica && publica.checked) tornarPublica(q);
      }
    }, espera);
  }

  function tornarPublica(q) {
    const nome = guarda.ler('nome', '');
    H.mural.post({ name: typeof nome === 'string' ? nome : '', text: q, channel: 'oraculo' })
      .then(() => aviso('Tua pergunta desceu pro fundo. Ela brilha lá embaixo agora.'))
      .catch((err) => aviso(err && err.message ? err.message : 'O fundo não aceitou agora. Tenta de novo daqui a pouco.'));
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = campo.value;
      perguntar(q);
      if (q.trim()) campo.value = '';
      if (phoneMQ.matches) campo.blur();
    });
  }
  $$('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q') || chip.textContent;
      if (campo) campo.value = '';
      perguntar(q);
    });
  });

  // visão do dia
  const visaoTexto = $('#visao-texto');
  const visaoData = $('#visao-data');
  if (visaoTexto) {
    if (H) {
      try {
        visaoTexto.textContent = H.oraculo.sorte();
        const d = new Date();
        if (visaoData) visaoData.textContent = ' · ' + diaChave(d).split('-').reverse().join('.');
      } catch (e) {
        visaoTexto.textContent = 'Hoje o olho não quis dizer nada. Amanhã ele tenta.';
      }
    } else {
      visaoTexto.textContent = 'O olho não abriu hoje: o oráculo não carregou. Recarrega a página.';
    }
  }

  /* ============================================================ suas consultas (local) */

  const consultasDlg = $('#consultas');
  const consultasLista = $('#consultas-lista');
  const consultasVazio = $('#consultas-vazio');
  const consultasBadge = $('#consultas-badge');
  const consultasApagar = $('#consultas-apagar');
  let consultas = (() => {
    const v = guarda.ler('consultas', []);
    return Array.isArray(v) ? v.filter((c) => c && typeof c.q === 'string' && typeof c.a === 'string').slice(0, 60) : [];
  })();

  function guardarConsulta(q, resp) {
    consultas.unshift({ q: q.slice(0, 500), a: String(resp.text), intent: String(resp.intent), at: new Date().toISOString() });
    consultas = consultas.slice(0, 60);
    guarda.gravar('consultas', consultas);
    renderConsultas();
  }

  function renderConsultas() {
    if (consultasBadge) {
      consultasBadge.hidden = consultas.length === 0;
      consultasBadge.textContent = String(consultas.length);
    }
    if (!consultasLista) return;
    consultasLista.textContent = '';
    consultas.forEach((c) => {
      const li = el('li');
      li.appendChild(el('p', 'gaveta__q', c.q));
      li.appendChild(el('p', 'gaveta__a', c.a));
      const tm = el('time', 'gaveta__data', fmtData(c.at));
      if (typeof c.at === 'string') tm.dateTime = c.at;
      li.appendChild(tm);
      consultasLista.appendChild(li);
    });
    if (consultasVazio) consultasVazio.hidden = consultas.length > 0;
    if (consultasApagar) consultasApagar.hidden = consultas.length === 0;
  }
  renderConsultas();

  if (consultasApagar) {
    consultasApagar.addEventListener('click', () => {
      consultas = [];
      guarda.apagar('consultas');
      renderConsultas();
      aviso('Consultas apagadas. O olho esqueceu (de verdade).');
      const f = $('#consultas-fechar');
      if (f) f.focus();
    });
  }

  /* ============================================================ diálogos */

  const dialogos = $$('dialog');
  function algumDialogo() { return dialogos.some((d) => d.open); }

  function trocarHash(h) {
    try {
      history.replaceState(null, '', h || location.pathname + location.search);
    } catch (e) { /* file:// ou sandbox: ignora */ }
  }

  // clique no backdrop fecha
  dialogos.forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    });
  });

  function abrirDialogo(d) {
    dialogos.forEach((o) => { if (o !== d && o.open) o.close(); });
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
  }

  const btnConsultas = $('#btn-consultas');
  let consultasOpener = null;
  if (btnConsultas && consultasDlg) {
    btnConsultas.addEventListener('click', () => {
      consultasOpener = btnConsultas;
      renderConsultas();
      abrirDialogo(consultasDlg);
      const f = $('#consultas-fechar');
      if (f) f.focus();
    });
    $('#consultas-fechar').addEventListener('click', () => consultasDlg.close());
    consultasDlg.addEventListener('close', () => {
      if (!algumDialogo() && consultasOpener && consultasOpener.isConnected) consultasOpener.focus();
    });
  }

  /* ============================================================ arcanos: baralho + mesa */

  const baralho = $('#baralho');
  const cartas = $$('#baralho .carta');
  const mesa = $('#mesa');
  const mesaFlip = $('#mesa-flip');
  const leituras = $$('#mesa .leitura');
  let mesaN = 0;
  let mesaOpener = null;

  cartas.forEach((c, i) => { c.tabIndex = i === 0 ? 0 : -1; });
  function focarCarta(i) {
    const j = (i + cartas.length) % cartas.length;
    cartas.forEach((c, k) => { c.tabIndex = k === j ? 0 : -1; });
    cartas[j].focus();
  }
  if (baralho) {
    baralho.addEventListener('keydown', (e) => {
      const i = cartas.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); focarCarta(i + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); focarCarta(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focarCarta(0); }
      else if (e.key === 'End') { e.preventDefault(); focarCarta(cartas.length - 1); }
      else if (e.key === ' ') { e.preventDefault(); cartas[i].click(); }
    });
    cartas.forEach((c, i) => {
      c.addEventListener('click', (e) => {
        e.preventDefault();
        cartas.forEach((o, k) => { o.tabIndex = k === i ? 0 : -1; });
        abrirArcano(parseInt(c.dataset.arcano, 10), c);
      });
    });
  }

  function virar(flip) {
    if (!flip) return;
    flip.classList.remove('is-virada');
    if (reduced) { flip.classList.add('is-virada'); return; }
    void flip.offsetWidth;
    requestAnimationFrame(() => flip.classList.add('is-virada'));
  }

  function mostrarLeitura(n, manterFoco) {
    if (mesaN === 3 && n !== 3) restaurarFacades();
    mesaN = n;
    const a = ARCANOS[n];
    leituras.forEach((art) => { art.hidden = parseInt(art.dataset.arcano, 10) !== n; });
    mesa.setAttribute('aria-labelledby', 'leitura-' + n + '-t');
    $('#mesa-num').textContent = a.rom;
    $('#mesa-carta-num').textContent = a.rom;
    $('#mesa-carta-nome').textContent = a.nome;
    $('#mesa-carta-use').setAttribute('href', '#ilus-' + n);
    virar(mesaFlip);
    if (n === 1) carregarSpotify();
    if (n === 2) renderShows();
    mesa.scrollTop = 0;
    const tit = $('#leitura-' + n + '-t');
    if (tit) {
      tit.tabIndex = -1;
      if (!manterFoco) tit.focus({ preventScroll: true });
    }
    trocarHash('#arcano-' + n);
  }

  function abrirArcano(n, opener) {
    if (!mesa) return;
    n = clamp(n | 0, 1, 6);
    if (!mesa.open) mesaOpener = opener || document.activeElement;
    abrirDialogo(mesa);
    mostrarLeitura(n);
  }

  if (mesa) {
    $('#mesa-fechar').addEventListener('click', () => mesa.close());
    $('#mesa-ant').addEventListener('click', () => mostrarLeitura(mesaN <= 1 ? 6 : mesaN - 1, true));
    $('#mesa-prox').addEventListener('click', () => mostrarLeitura(mesaN >= 6 ? 1 : mesaN + 1, true));
    mesa.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const tg = e.target;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'IFRAME')) return;
      e.preventDefault();
      mostrarLeitura(e.key === 'ArrowLeft' ? (mesaN <= 1 ? 6 : mesaN - 1) : (mesaN >= 6 ? 1 : mesaN + 1));
    });
    mesa.addEventListener('close', () => {
      restaurarFacades();
      if (/^#arcano-/.test(location.hash)) trocarHash('');
      const volta = mesaOpener;
      mesaOpener = null;
      if (!algumDialogo() && volta && volta.isConnected && typeof volta.focus === 'function') volta.focus();
    });
  }

  /* ---------- Spotify (carrega quando O DISCO abre pela primeira vez) */

  let spotifyOk = false;
  function carregarSpotify() {
    if (spotifyOk) return;
    const alvo = $('#spotify-slot');
    if (!alvo) return;
    spotifyOk = true;
    const f = document.createElement('iframe');
    f.className = 'spotify__frame';
    f.title = 'Spotify: HORNEY — ANTI-RASO';
    f.src = 'https://open.spotify.com/embed/album/7EM81z5ydGQq04ZbkIE5aS?utm_source=generator&theme=0';
    f.width = '100%';
    f.height = '420';
    f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    const avisoSp = $('#spotify-aviso');
    if (avisoSp) avisoSp.remove();
    alvo.appendChild(f);
  }

  /* ---------- YouTube: facade → iframe no clique */

  const facadeBotoes = new Map();
  $$('.facade').forEach((fac) => {
    const btn = fac.querySelector('.facade__btn');
    if (!btn) return;
    facadeBotoes.set(fac, btn);
    btn.addEventListener('click', () => {
      const id = fac.getAttribute('data-yt');
      if (!/^[\w-]{11}$/.test(id || '')) return;
      const f = document.createElement('iframe');
      f.className = 'facade__frame';
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      f.title = fac.getAttribute('data-title') || 'HORNEY no YouTube';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      btn.replaceWith(f);
      fac.classList.add('is-on');
      f.focus();
    });
  });
  function restaurarFacades() {
    facadeBotoes.forEach((btn, fac) => {
      if (!fac.classList.contains('is-on')) return;
      const f = fac.querySelector('iframe');
      if (f) f.replaceWith(btn);
      fac.classList.remove('is-on');
    });
  }

  /* ---------- A ESTRADA: status calculado na hora */

  function renderShows() {
    const lista = $('#shows-lista');
    const prox = $('#proximo-show');
    if (!lista || !prox) return;
    const todos = statusShows();
    const futuros = todos.filter((s) => s.st !== 'passado').sort((a, b) => (a.data < b.data ? -1 : 1));
    const passados = todos.filter((s) => s.st === 'passado').sort((a, b) => (a.data < b.data ? 1 : -1));

    prox.textContent = '';
    prox.appendChild(el('p', 'leitura__rotulo', futuros[0] && futuros[0].st === 'hoje' ? 'É HOJE!!!' : 'próximo show'));
    const pt = el('p', 'proximo__txt');
    if (futuros[0]) {
      const s = futuros[0];
      pt.textContent = br(s.data) + ' · ' + s.titulo + ' — ' + s.onde + '. SAI DE CASA E COLE NOS SHOWS!!! ';
    } else {
      pt.textContent = 'sem shows marcados — cola no Instagram pra saber primeiro ';
    }
    pt.appendChild(linkExterno('@horney.band ↗', IG, ''));
    prox.appendChild(pt);

    const ROT = { passado: 'já rolou', hoje: 'HOJE!!!', proximo: 'próximo' };
    lista.textContent = '';
    futuros.concat(passados).forEach((s) => {
      const li = el('li', 'show show--' + s.st);
      const p = s.data.split('-');
      const tm = el('time');
      tm.dateTime = s.data;
      tm.appendChild(el('b', '', p[2] + '.' + p[1]));
      tm.appendChild(el('span', '', p[0] + ' · ' + s.dia));
      li.appendChild(tm);
      const corpo = el('div', 'show__corpo');
      corpo.appendChild(el('p', 'show__status', ROT[s.st]));
      corpo.appendChild(el('h3', 'show__titulo', s.titulo));
      corpo.appendChild(el('p', 'show__onde', s.onde));
      corpo.appendChild(el('p', 'show__blurb', s.texto));
      corpo.appendChild(linkExterno(s.link.label, s.link.href, 'show__link'));
      li.appendChild(corpo);
      lista.appendChild(li);
    });
  }
  renderShows();

  /* ============================================================ tiragem */

  const tiragemDlg = $('#tiragem');
  const tiragemBtn = $('#tiragem-tirar');
  const tiragemLive = $('#tiragem-live');
  const posicoes = $$('#tiragem-mesa .pos');
  const ROTULO_POS = ['passado', 'presente', 'futuro'];
  let tiragemOpener = null;
  let tiragemTimers = [];

  function embaralhar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function ctaPara(cta) {
    if (cta.href) return linkExterno(cta.label, cta.href);
    const b = el('button', 'botao', cta.label);
    b.type = 'button';
    b.addEventListener('click', () => {
      if (cta.arcano) {
        const opener = tiragemOpener;
        tiragemDlg.close();
        abrirArcano(cta.arcano, opener);
      } else if (cta.fundo) {
        tiragemDlg.close();
        irParaOferenda();
      }
    });
    return b;
  }

  function tirar() {
    tiragemTimers.forEach(clearTimeout);
    tiragemTimers = [];
    const mao = embaralhar([1, 2, 3, 4, 5, 6]).slice(0, 3);
    const nomes = [];
    if (!algumDialogo() || tiragemDlg.open) setState('pensa');
    posicoes.forEach((pos, i) => {
      const n = mao[i];
      const a = ARCANOS[n];
      const L = LEITURAS[n][i];
      const texto = typeof L.t === 'function' ? L.t() : L.t;
      nomes.push(ROTULO_POS[i] + ': ' + a.rom + ' · ' + a.nome + '. ' + texto);
      const flip = pos.querySelector('.flip');
      flip.classList.remove('is-virada');
      pos.classList.remove('is-lida', 'is-dando');
      pos.querySelector('.carta__num').textContent = a.rom;
      pos.querySelector('.carta__nome').textContent = a.nome;
      pos.querySelector('.flip__frente use').setAttribute('href', '#ilus-' + n);
      pos.querySelector('.pos__nome').textContent = a.rom + ' · ' + a.nome;
      pos.querySelector('.pos__texto').textContent = texto;
      const cta = pos.querySelector('.pos__cta');
      cta.textContent = '';
      cta.appendChild(ctaPara(L.cta));
      pos.style.setProperty('--k', String(i));
      if (reduced) {
        flip.classList.add('is-virada');
        pos.classList.add('is-lida');
      } else {
        void pos.offsetWidth;
        pos.classList.add('is-dando');
        tiragemTimers.push(setTimeout(() => {
          flip.classList.add('is-virada');
          som.piscada();
        }, 750 + i * 650));
        tiragemTimers.push(setTimeout(() => pos.classList.add('is-lida'), 1150 + i * 650));
      }
    });
    tiragemTimers.push(setTimeout(responder, reduced ? 300 : 900));
    if (tiragemBtn) tiragemBtn.textContent = '✦ embaralhar e tirar de novo';
    anunciar(tiragemLive, 'O olho tirou três cartas. ' + nomes.join(' '));
  }

  function abrirTiragem(opener) {
    if (!tiragemDlg) return;
    tiragemOpener = opener || document.activeElement;
    abrirDialogo(tiragemDlg);
    trocarHash('#tiragem');
    tirar();
    if (tiragemBtn) tiragemBtn.focus({ preventScroll: true });
  }

  if (tiragemDlg) {
    $('#tiragem-fechar').addEventListener('click', () => tiragemDlg.close());
    if (tiragemBtn) tiragemBtn.addEventListener('click', tirar);
    tiragemDlg.addEventListener('close', () => {
      tiragemTimers.forEach(clearTimeout);
      tiragemTimers = [];
      if (location.hash === '#tiragem') trocarHash('');
      if (!mesa || !mesa.open) {
        const v = tiragemOpener;
        if (v && v.isConnected && typeof v.focus === 'function') v.focus();
      }
      tiragemOpener = null;
    });
    ['#btn-tiragem', '#abrir-tiragem'].forEach((s) => {
      const b = $(s);
      if (b) b.addEventListener('click', () => abrirTiragem(b));
    });
  }

  /* ---------- deep links */

  function lerHash() {
    const m = /^#arcano-([1-6])$/.exec(location.hash);
    if (m) { abrirArcano(parseInt(m[1], 10), null); return; }
    if (location.hash === '#tiragem') abrirTiragem(null);
  }
  addEventListener('hashchange', lerHash);

  /* ---------- mergulhar */

  const mergulharBtn = $('#mergulhar');
  if (mergulharBtn) {
    mergulharBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (fundoEl) fundoEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      trocarHash('#fundo');
    });
  }

  function irParaOferenda() {
    const of = $('#oferenda');
    const tx = $('#oferenda-texto');
    if (of) of.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    if (tx && !tx.disabled) setTimeout(() => tx.focus({ preventScroll: true }), reduced ? 0 : 700);
  }

  /* ============================================================ O FUNDO: o mural das vozes */

  const CANAL = { oraculo: 'oferenda ao olho', mural: 'recado no mural', depoimento: 'depoimento' };
  const campoEl = $('#campo');
  const luzesUl = $('#luzes');
  const vozCard = $('#voz-card');
  const vozNome = $('#voz-card-nome');
  const vozCanal = $('#voz-card-canal');
  const vozData = $('#voz-card-data');
  const vozTexto = $('#voz-card-texto');
  const campoStatus = $('#campo-status');
  const contagem = $('#fundo-contagem');
  const listaWrap = $('#vozes-lista');
  const listaOl = $('#lista-vozes');
  const btnLista = $('#btn-lista');
  const luzes = new Map();
  let vozesPorId = new Map();
  let conhecidas = null;
  let fixada = null;

  function canalDe(m) { return Object.prototype.hasOwnProperty.call(CANAL, m.channel) ? m.channel : 'outro'; }
  function rotuloCanal(m) { return CANAL[m.channel] || 'recado'; }

  function criarLuz(m, novo) {
    const h = hashTexto(m.id);
    const li = el('li', 'luz-item' + (novo ? ' nova' : ''));
    li.dataset.canal = canalDe(m);
    li.dataset.id = String(h);
    const x = 7 + (h % 997) / 997 * 84;
    const y = 8 + ((h >>> 10) % 991) / 991 * 82;
    li.style.setProperty('--x', x.toFixed(2));
    li.style.setProperty('--y', y.toFixed(2));
    li.style.setProperty('--dx', (((h >>> 4) % 29) - 14) + 'px');
    li.style.setProperty('--dy', (((h >>> 9) % 25) - 12) + 'px');
    li.style.setProperty('--dur', (9 + (h >>> 14) % 9) + 's');
    li.style.setProperty('--del', '-' + ((h >>> 18) % 9) + 's');
    li.style.setProperty('--s', (m.seed ? 9 : 13) + 'px');
    const b = el('button', 'luz');
    b.type = 'button';
    b.tabIndex = -1;
    b.setAttribute('aria-pressed', 'false');
    b.appendChild(el('span', 'luz__ponto'));
    b.appendChild(el('span', 'sr-only', m.name + ', ' + rotuloCanal(m) + ', ' + fmtData(m.at) + ': ' + m.text));
    li.appendChild(b);
    li._x = x;
    li._y = y;
    return li;
  }

  function mostrarVoz(li) {
    if (!li || !vozCard) return;
    const m = vozesPorId.get(li._mid);
    if (!m) return;
    vozNome.textContent = m.name;
    vozCanal.textContent = '· ' + rotuloCanal(m) + ' ·';
    vozData.textContent = fmtData(m.at);
    vozData.dateTime = m.at;
    vozTexto.textContent = m.text;
    vozCard.style.left = li._x.toFixed(2) + '%';
    vozCard.style.top = li._y.toFixed(2) + '%';
    vozCard.classList.toggle('is-esq', li._x > 52);
    vozCard.classList.toggle('is-cima', li._y > 66);
    vozCard.classList.toggle('is-baixo', li._y < 26);
    vozCard.hidden = false;
  }
  function esconderVoz(forcar) {
    if (fixada && !forcar) return;
    if (forcar && fixada) {
      const b = fixada.querySelector('.luz');
      if (b) b.setAttribute('aria-pressed', 'false');
      fixada = null;
    }
    if (vozCard) vozCard.hidden = true;
  }

  function botoesLuz() { return luzesUl ? $$('.luz', luzesUl) : []; }
  function focarLuz(i) {
    const bs = botoesLuz();
    if (!bs.length) return;
    const j = (i + bs.length) % bs.length;
    bs.forEach((b, k) => { b.tabIndex = k === j ? 0 : -1; });
    bs[j].focus();
  }

  if (luzesUl) {
    luzesUl.addEventListener('pointerover', (e) => {
      const b = e.target.closest('.luz');
      if (b) mostrarVoz(b.parentElement);
    });
    luzesUl.addEventListener('pointerout', (e) => {
      const b = e.target.closest('.luz');
      if (b && !b.contains(e.relatedTarget)) esconderVoz(false);
    });
    luzesUl.addEventListener('focusin', (e) => {
      const b = e.target.closest('.luz');
      if (!b) return;
      botoesLuz().forEach((o) => { o.tabIndex = o === b ? 0 : -1; });
      mostrarVoz(b.parentElement);
    });
    luzesUl.addEventListener('focusout', (e) => {
      if (!luzesUl.contains(e.relatedTarget)) esconderVoz(false);
    });
    luzesUl.addEventListener('click', (e) => {
      const b = e.target.closest('.luz');
      if (!b) return;
      const li = b.parentElement;
      if (fixada === li) { esconderVoz(true); return; }
      if (fixada) {
        const ob = fixada.querySelector('.luz');
        if (ob) ob.setAttribute('aria-pressed', 'false');
      }
      fixada = li;
      b.setAttribute('aria-pressed', 'true');
      mostrarVoz(li);
    });
    luzesUl.addEventListener('keydown', (e) => {
      const bs = botoesLuz();
      const i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); focarLuz(i + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); focarLuz(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focarLuz(0); }
      else if (e.key === 'End') { e.preventDefault(); focarLuz(bs.length - 1); }
      else if (e.key === 'Escape') { esconderVoz(true); }
    });
  }

  function renderLista(todas) {
    if (!listaOl) return;
    listaOl.textContent = '';
    todas.forEach((m) => {
      const li = el('li');
      li.dataset.canal = canalDe(m);
      const meta = el('p', 'vozes-lista__meta');
      meta.appendChild(el('b', '', m.name));
      meta.appendChild(document.createTextNode(' · ' + rotuloCanal(m) + ' · '));
      const tm = el('time', '', fmtData(m.at));
      tm.dateTime = m.at;
      meta.appendChild(tm);
      li.appendChild(meta);
      li.appendChild(el('p', 'vozes-lista__texto', m.text));
      listaOl.appendChild(li);
    });
  }

  function renderMural(todas) {
    if (!Array.isArray(todas)) return;
    vozesPorId = new Map(todas.map((m) => [m.id, m]));
    if (contagem) contagem.textContent = todas.length + (todas.length === 1 ? ' voz no fundo' : ' vozes no fundo');
    renderLista(todas);
    if (!luzesUl) return;

    const max = phoneMQ.matches ? 26 : 44;
    const mostrar = todas.slice(0, max);
    const manter = new Set(mostrar.map((m) => m.id));
    luzes.forEach((li, id) => {
      if (!manter.has(id)) {
        if (fixada === li) esconderVoz(true);
        li.remove();
        luzes.delete(id);
      }
    });
    mostrar.forEach((m, i) => {
      let li = luzes.get(m.id);
      if (!li) {
        const novo = conhecidas !== null && !conhecidas.has(m.id);
        li = criarLuz(m, novo && !reduced);
        li._mid = m.id;
        luzes.set(m.id, li);
      }
      const atual = luzesUl.children[i];
      if (atual !== li) luzesUl.insertBefore(li, atual || null);
    });
    conhecidas = new Set(todas.map((m) => m.id));
    const bs = botoesLuz();
    if (bs.length && !bs.some((b) => b.tabIndex === 0)) bs[0].tabIndex = 0;
    if (campoStatus) {
      campoStatus.hidden = todas.length > 0;
      if (!todas.length) campoStatus.textContent = 'Ninguém desceu até aqui ainda. Seja a primeira voz.';
    }
  }

  if (btnLista && listaWrap && campoEl) {
    btnLista.addEventListener('click', () => {
      const lista = listaWrap.hidden;
      listaWrap.hidden = !lista;
      campoEl.hidden = lista;
      btnLista.setAttribute('aria-pressed', lista ? 'true' : 'false');
      btnLista.textContent = lista ? 'ver como luzes' : 'ver todas em lista';
      esconderVoz(true);
    });
  }

  // luzes à deriva só animam com o campo na tela
  if (campoEl && 'IntersectionObserver' in window) {
    new IntersectionObserver((ents) => {
      ents.forEach((en) => campoEl.classList.toggle('is-live', en.isIntersecting));
    }, { rootMargin: '80px 0px' }).observe(campoEl);
  } else if (campoEl) {
    campoEl.classList.add('is-live');
  }

  /* ---------- oferenda + ritual de leitura */

  const ofForm = $('#oferenda');
  const ofNome = $('#oferenda-nome');
  const ofTexto = $('#oferenda-texto');
  const ofN = $('#oferenda-n');
  const ofConta = $('#oferenda-conta');
  const ofStatus = $('#oferenda-status');
  const ofEnviar = $('#oferenda-enviar');
  const ritualDlg = $('#ritual');
  const ritualDe = $('#ritual-de');
  const ritualTexto = $('#ritual-texto');
  const ritualResp = $('#ritual-resposta');
  const ritualLive = $('#ritual-live');
  const ritualFechar = $('#ritual-fechar');
  const ritualOlho = $('#ritual-olho');
  let ritualMsgId = null;

  // o olho do ritual (fallback SVG): clone do olho da vigília, sem IDs
  if (ritualOlho && slot) {
    const svg = slot.querySelector('.olho-svg');
    if (svg) {
      ritualOlho.appendChild(svg.cloneNode(true));
      svgAlvos.push(ritualOlho);
    }
  }

  if (ofNome) {
    const salvo = guarda.ler('nome', '');
    if (typeof salvo === 'string') ofNome.value = salvo.slice(0, 40);
  }
  function contar() {
    if (!ofTexto || !ofN) return;
    const n = Array.from(ofTexto.value).length;
    ofN.textContent = String(n);
    if (ofConta) ofConta.classList.toggle('is-quase', n > 450);
  }
  if (ofTexto) {
    ofTexto.addEventListener('input', () => {
      contar();
      if (!reduced) { S.ripple = 0.7; E.kick = Math.min(0.3, E.kick + 0.04); }
      kick();
    });
    contar();
  }

  function quebrarLinhas(texto, max) {
    const linhas = [];
    String(texto).split(/\n+/).forEach((par) => {
      let atual = '';
      par.split(/\s+/).filter(Boolean).forEach((w) => {
        while (Array.from(w).length > max) {
          if (atual) { linhas.push(atual); atual = ''; }
          const cs = Array.from(w);
          linhas.push(cs.slice(0, max).join(''));
          w = cs.slice(max).join('');
        }
        if (!atual) atual = w;
        else if (Array.from(atual).length + 1 + Array.from(w).length <= max) atual += ' ' + w;
        else { linhas.push(atual); atual = w; }
      });
      if (atual) linhas.push(atual);
    });
    return linhas.length ? linhas : [''];
  }

  function avancarLeitura(t) {
    const L = E.leitura;
    if (t < L.inicio) { E.scan.x = -0.85; E.scan.y = L.ys[0]; return; }
    const prog = (t - L.inicio) / L.por;
    const i = Math.floor(prog);
    if (i >= L.els.length) {
      L.els.forEach((x) => { x.classList.remove('is-agora'); x.classList.add('is-lida'); });
      E.leitura = null;
      setTimeout(() => terminarLeitura(L.msg), 0);
      return;
    }
    const f = prog - i;
    E.scan.x = lerp(-0.85, 0.85, f);
    E.scan.y = L.ys[i];
    if (i !== L.atual) {
      if (L.atual >= 0) { L.els[L.atual].classList.remove('is-agora'); L.els[L.atual].classList.add('is-lida'); }
      L.els[i].classList.add('is-agora');
      L.atual = i;
    }
  }

  function terminarLeitura(msg) {
    let resp;
    try {
      resp = H.oraculo.ask(msg.text);
    } catch (e) {
      resp = { text: 'O olho leu tudo. Ficou sem palavras, o que é raro.', intent: 'visao', links: [] };
    }
    responder();
    escreverPalavras(ritualResp, resp.text);
    anunciar(ritualLive, 'O olho leu e respondeu: ' + resp.text);
  }

  function ritual(msg) {
    if (!ritualDlg) return;
    ritualMsgId = msg.id;
    ritualDe.textContent = msg.name + ' ofereceu:';
    ritualTexto.textContent = '';
    ritualResp.textContent = '';
    ritualLive.textContent = '';
    abrirDialogo(ritualDlg);
    root.classList.add('ritual-on');
    surfAlvo = 1;
    const max = phoneMQ.matches ? 24 : 40;
    const els = quebrarLinhas(msg.text, max).map((txt) => {
      const p = el('p', 'linha', txt);
      ritualTexto.appendChild(p);
      return p;
    });
    if (ritualFechar) ritualFechar.focus({ preventScroll: true });
    anunciar(ritualLive, 'O olho subiu do fundo e está lendo a tua oferenda.');
    const n = els.length;
    const ys = els.map((_, i) => (n === 1 ? -0.15 : lerp(0.1, -0.5, i / (n - 1))));
    if (reduced) {
      els.forEach((x) => x.classList.add('is-lida'));
      setState('le');
      E.scan.x = 0; E.scan.y = -0.3;
      kick();
      setTimeout(() => terminarLeitura(msg), 600);
      return;
    }
    let por = 420 + (Array.from(msg.text).length / n) * 22;
    por = clamp(por, 450, 1200);
    if (por * n > 5200) por = 5200 / n;
    E.leitura = { msg, els, ys, por, inicio: now() + 900, atual: -1 };
    setState('le');
    kick();
  }

  function fecharRitual() {
    surfAlvo = 0;
    root.classList.remove('ritual-on');
    E.leitura = null;
    if (E.state === 'le' || E.state === 'responde') setState('vigia');
    kick();
    const li = ritualMsgId ? luzes.get(ritualMsgId) : null;
    ritualMsgId = null;
    const b = li ? li.querySelector('.luz') : null;
    if (b && campoEl && !campoEl.hidden) {
      botoesLuz().forEach((o) => { o.tabIndex = o === b ? 0 : -1; });
      b.focus({ preventScroll: true });
      li.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    } else if (ofTexto) {
      ofTexto.focus({ preventScroll: true });
    }
  }
  if (ritualDlg) {
    ritualFechar.addEventListener('click', () => ritualDlg.close());
    ritualDlg.addEventListener('close', fecharRitual);
  }

  if (ofForm) {
    if (!H) {
      $$('input, textarea, button', ofForm).forEach((x) => { x.disabled = true; });
      if (ofStatus) ofStatus.textContent = 'O fundo está fechado agora: o mural não carregou. Recarrega a página pra tentar de novo.';
    }
    ofForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!H) return;
      const nome = ofNome ? ofNome.value.trim().slice(0, 40) : '';
      guarda.gravar('nome', nome);
      ofEnviar.disabled = true;
      ofStatus.textContent = 'descendo…';
      H.mural.post({ name: nome, text: ofTexto.value, channel: 'oraculo' })
        .then((msg) => {
          ofTexto.value = '';
          contar();
          ofStatus.textContent = 'Oferenda aceita. Tua voz agora brilha no fundo.';
          ritual(msg);
        })
        .catch((err) => {
          ofStatus.textContent = err && err.message ? err.message : 'O fundo não aceitou agora. Tenta de novo.';
          if (ofTexto) ofTexto.focus();
        })
        .then(() => { ofEnviar.disabled = false; });
    });
  }

  if (H) {
    H.mural.list()
      .then(renderMural)
      .catch(() => {
        if (campoStatus) { campoStatus.hidden = false; campoStatus.textContent = 'O fundo ficou turvo: não deu pra ler as vozes agora.'; }
      });
    H.mural.subscribe(renderMural);
  } else {
    if (campoStatus) {
      campoStatus.hidden = false;
      campoStatus.textContent = 'O fundo está inacessível agora: o mural não carregou.';
    }
    if (contagem) contagem.textContent = 'mural indisponível';
    if (btnLista) btnLista.hidden = true;
  }

  /* ============================================================ mergulho: frases aparecem */

  const linhasMergulho = $$('.mergulho__linha');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('visivel'); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    linhasMergulho.forEach((l) => io.observe(l));
  } else {
    linhasMergulho.forEach((l) => l.classList.add('visivel'));
  }

  /* ============================================================ celular: pergunta encostada no teclado */

  const dockFim = $('#dock-fim');
  let dockAbaixo = true;
  function aplicarDock() { root.classList.toggle('dock', phoneMQ.matches && dockAbaixo); }
  if (dockFim && 'IntersectionObserver' in window) {
    new IntersectionObserver((ents) => {
      const en = ents[ents.length - 1];
      dockAbaixo = !en.isIntersecting && en.boundingClientRect.top > 0;
      aplicarDock();
    }).observe(dockFim);
  }
  if (phoneMQ.addEventListener) phoneMQ.addEventListener('change', () => { aplicarDock(); medirLogo(); });
  if (window.visualViewport) {
    const vv = window.visualViewport;
    let kb = 0;
    const ajustar = () => {
      const off = Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop));
      if (off !== kb) {
        kb = off;
        root.style.setProperty('--kb', off + 'px');
      }
    };
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
  }

  /* ============================================================ grão (gerado uma vez) */

  (function grao() {
    const alvo = $('.grao');
    if (!alvo) return;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const x = c.getContext('2d');
      if (!x) return;
      const img = x.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      alvo.style.backgroundImage = 'url(' + c.toDataURL('image/png') + ')';
    } catch (e) { /* sem grão, sem drama */ }
  })();

  /* ============================================================ movimento reduzido ao vivo */

  function aplicarReduzido() {
    reduced = reduceMQ.matches;
    if (reduced) {
      limparOcioso();
      if (gl) { gl = null; root.classList.remove('gl-on'); }
      S.ripple = 0; E.kick = 0;
    } else if (!gl) {
      gl = iniciarGL();
      if (gl) root.classList.add('gl-on');
      agendarOcioso();
    }
    medirLogo();
  }
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', aplicarReduzido);

  /* ============================================================ partida */

  gl = iniciarGL();
  if (gl) root.classList.add('gl-on');
  medir();
  agendarOcioso();
  notarEntrada();
  // o olho abre devagar na chegada
  setTimeout(() => setState('vigia'), reduced ? 0 : 350);
  lerHash();
})();
