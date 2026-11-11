/**
 * HORNEY — oraculo.js · serviços compartilhados entre os conceitos do redesign.
 *
 * Uso (script clássico, sem módulos, sem build):
 *   <script src="../assets/oraculo.js"></script>
 *
 *   Horney.mural.list({ channel })            -> Promise<Message[]>  mais novas primeiro; sem channel = todos
 *   Horney.mural.post({ name, text, channel }) -> Promise<Message>   rejeita com Error (mensagem em PT-BR)
 *   Horney.mural.subscribe(fn)                -> unsubscribe()       fn(messages) após post local ou mudança em outra aba
 *   Horney.oraculo.ask(question)              -> Answer             síncrono
 *   Horney.oraculo.sorte(date?)               -> string             sorte do dia, fixa por dia do calendário
 *   Horney.oraculo.intents                    -> string[]
 *
 * Persistência: localStorage "horney:mural:v1" (array JSON, no máximo 200 mensagens, mais novas primeiro),
 * compartilhada por todos os conceitos; sem localStorage, cai para memória durante a sessão.
 * Mensagens-semente (seed: true) são mescladas na leitura e nunca gravadas.
 *
 * SEGURANÇA: name e text são guardados crus. Quem chama DEVE renderizar name/text com textContent,
 * NUNCA com innerHTML.
 *
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} name
 * @property {string} text
 * @property {string} channel  "mural" | "oraculo" | "depoimento" | qualquer string
 * @property {string} at       ISO-8601
 * @property {boolean} seed
 *
 * @typedef {Object} AnswerLink
 * @property {string} label
 * @property {string} href
 *
 * @typedef {Object} Answer
 * @property {string} text
 * @property {string} intent
 * @property {AnswerLink[]} links
 */
(function (root) {
  'use strict';

  if (root.Horney && root.Horney.mural && root.Horney.oraculo) return;

  var KEY = 'horney:mural:v1';
  var CAP = 200;
  var COOLDOWN_MS = 5000;
  var NAME_MAX = 40;
  var TEXT_MAX = 500;

  function seed(id, at, channel, name, text) {
    return { id: id, name: name, text: text, channel: channel, at: at, seed: true };
  }

  var SEEDS = [
    seed('seed-01', '2026-01-08T22:14:00.000Z', 'mural', 'Lari · Joinville', 'ainda nao superei OFF! ta no repeat desde novembro e minha vizinha ja sabe o refrão de cor kkkkk'),
    seed('seed-02', '2026-02-14T03:41:00.000Z', 'depoimento', 'Caio · Curitiba', 'HORNEY é aquela banda que vc mostra pros amigos e eles fingem que já conheciam. ouço desde Four Rooms for Four Fools (2022) e ninguém me tira esse título'),
    seed('seed-03', '2026-04-30T19:05:00.000Z', 'mural', 'Gabi · Blumenau', 'QUANDO SAI COISA NOVA??? to vivendo de Fool\'s Game e OFF! faz meses, socorro'),
    seed('seed-04', '2026-06-12T23:58:00.000Z', 'depoimento', 'Tati · Jaraguá do Sul', 'a HORNEY me ensinou que dá pra ser pesado e melancólico na mesma música. orgulho do norte de SC. quem não conhece, conheça!!'),
    seed('seed-05', '2026-07-30T15:02:00.000Z', 'mural', 'Pedro · Joinville', 'ANTI-RASO SAIU!!! 4 faixas e nenhuma pra pular. ROMÂNTICA acabou comigo em 2 minutos e meio'),
    seed('seed-06', '2026-07-31T01:17:00.000Z', 'mural', 'Mari · São Paulo', 'QUEBRA-CABEÇA com a Dani Buarque é covardia. ouvi 11 vezes seguidas no busão e desci no ponto errado'),
    seed('seed-07', '2026-08-01T21:33:00.000Z', 'mural', 'Gui · Balneário Camboriú', 'HORNEY CANTANDO EM PORTUGUÊS FICOU ABSURDO. NÃO VOLTEM PRO INGLÊS NUNCA MAIS (mas Fool\'s Game pode ficar)'),
    seed('seed-08', '2026-08-05T02:26:00.000Z', 'depoimento', 'Julia · Itajaí', '"mergulhar fundo nas coisas, se recusar a viver apenas na superfície" — a Duda escreveu o que eu tento explicar pra minha terapeuta faz 2 anos. obrigada HORNEY <3'),
    seed('seed-09', '2026-08-19T13:40:00.000Z', 'mural', 'Rodrigo · Porto Alegre', 'a Unglued deu 7.8 pro ANTI-RASO. eu daria 10 mas respeito a imprensa'),
    seed('seed-10', '2026-08-27T05:12:00.000Z', 'mural', 'Bia · Joinville', 'MERGULHAR no fone às 2 da manhã é uma experiência que eu não recomendo pra quem tem coração fraco. eu tenho. ouvi 3x'),
    seed('seed-11', '2026-09-18T14:10:00.000Z', 'mural', 'Lucas · São Paulo', 'ONTEM NA FFFRONT FOI SURREAL. HORNEY e Mastrobiso na mesma noite, Joinville invadiu a Vila Madalena mesmo'),
    seed('seed-12', '2026-09-18T20:45:00.000Z', 'depoimento', 'Fer · Santo André', 'fui no Rock Night só pela Mastrobiso e saí fã da HORNEY. a Duda canta como se o microfone devesse dinheiro pra ela. banda gigante ao vivo'),
    seed('seed-13', '2026-10-04T12:20:00.000Z', 'mural', 'Ana · Joinville', 'show de ontem foi lindo demais. fiquei na grade gritando o refrão de OFF! igual o perfil pediu, perdi a voz e não me arrependo'),
    seed('seed-14', '2026-10-06T18:03:00.000Z', 'mural', 'Vini · Joinville', 'alguém sabe o local do dia 09?? o insta disse LOCAL EM BREVE e eu to aqui atualizando que nem doido'),
    seed('seed-15', '2026-10-10T03:12:00.000Z', 'depoimento', 'Carol · Joinville', 'último show do ano e eu chorei em ROMÂNTICA. HORNEY não é banda de fundo de festa, é banda de ouvir de olho fechado. obrigada por 2026'),
    seed('seed-16', '2026-10-21T16:47:00.000Z', 'mural', 'Rafa (não o Bello) · Curitiba', 'cadê a camiseta do olho?? já mandei DM, me avisa primeiro pfvvv'),
    seed('seed-17', '2026-11-02T22:30:00.000Z', 'mural', 'Leo · Florianópolis', 'SAI DE CASA E COLE NOS SHOWS!!! foi o que eu fiz em 2026 e foi a melhor decisão do ano. volta logo HORNEY')
  ];

  function chars(s) {
    return Array.from(s);
  }

  function copy(m) {
    return { id: m.id, name: m.name, text: m.text, channel: m.channel, at: m.at, seed: m.seed };
  }

  function newestFirst(a, b) {
    if (a.at !== b.at) return a.at < b.at ? 1 : -1;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  }

  function clean(m) {
    if (!m || typeof m.id !== 'string' || typeof m.text !== 'string') return null;
    var t = Date.parse(m.at);
    if (isNaN(t)) return null;
    return {
      id: m.id,
      name: typeof m.name === 'string' && m.name ? m.name : 'anônimo',
      text: m.text,
      channel: typeof m.channel === 'string' && m.channel ? m.channel : 'mural',
      at: new Date(t).toISOString(),
      seed: false
    };
  }

  var memory = [];
  var store;

  function storage() {
    if (store !== undefined) return store;
    store = null;
    try {
      var s = root.localStorage;
      var probe = KEY + ':probe';
      s.setItem(probe, '1');
      s.removeItem(probe);
      store = s;
    } catch (e) {
      store = null;
    }
    return store;
  }

  var driver = {
    read: function () {
      var s = storage();
      if (!s) return Promise.resolve(memory.slice());
      try {
        var raw = s.getItem(KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        var list = Array.isArray(parsed) ? parsed.map(clean).filter(Boolean).sort(newestFirst) : [];
        return Promise.resolve(list);
      } catch (e) {
        return Promise.resolve(memory.slice());
      }
    },
    write: function (list) {
      memory = list.slice().sort(newestFirst).slice(0, CAP);
      var s = storage();
      if (s) {
        try {
          s.setItem(KEY, JSON.stringify(memory));
        } catch (e) {
          store = null;
        }
      }
      return Promise.resolve();
    }
  };

  function snapshot() {
    return driver.read().then(function (stored) {
      var seen = Object.create(null);
      var out = [];
      SEEDS.concat(stored).forEach(function (m) {
        if (seen[m.id]) return;
        seen[m.id] = true;
        out.push(m);
      });
      return out.sort(newestFirst);
    });
  }

  function list(opts) {
    var channel = opts && opts.channel != null ? String(opts.channel).trim() : '';
    return snapshot().then(function (all) {
      return all.filter(function (m) { return !channel || m.channel === channel; }).map(copy);
    });
  }

  var listeners = [];
  var listening = false;

  function notify() {
    if (!listeners.length) return;
    list().then(function (all) {
      listeners.slice().forEach(function (fn) {
        try {
          fn(all);
        } catch (e) {
          setTimeout(function () { throw e; });
        }
      });
    });
  }

  function onStorage(e) {
    if (e.key === KEY || e.key === null) notify();
  }

  var lastPostAt = 0;

  function newId() {
    return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function seconds(n) {
    return n + (n === 1 ? ' segundo' : ' segundos');
  }

  var mural = Object.freeze({
    list: list,

    post: function (input) {
      input = input || {};
      var text = input.text == null ? '' : String(input.text).trim();
      if (!text) {
        return Promise.reject(new Error('Escreve alguma coisa antes de mandar: mensagem vazia não chega a lugar nenhum.'));
      }
      var size = chars(text).length;
      if (size > TEXT_MAX) {
        return Promise.reject(new Error('Sua mensagem tem ' + size + ' caracteres e o limite é ' + TEXT_MAX + '. Corta um pouco e manda de novo.'));
      }
      var wait = lastPostAt + COOLDOWN_MS - Date.now();
      if (wait > 0) {
        return Promise.reject(new Error('Calma: espera mais ' + seconds(Math.ceil(wait / 1000)) + ' antes de mandar outra mensagem.'));
      }
      lastPostAt = Date.now();
      var name = input.name == null ? '' : chars(String(input.name).trim()).slice(0, NAME_MAX).join('').trim();
      var channel = input.channel == null ? '' : String(input.channel).trim();
      var msg = {
        id: newId(),
        name: name || 'anônimo',
        text: text,
        channel: channel || 'mural',
        at: new Date(lastPostAt).toISOString(),
        seed: false
      };
      return driver.read()
        .then(function (stored) { return driver.write([msg].concat(stored)); })
        .then(function () {
          notify();
          return copy(msg);
        });
    },

    subscribe: function (fn) {
      if (typeof fn !== 'function') throw new TypeError('Horney.mural.subscribe precisa de uma função.');
      listeners.push(fn);
      if (!listening && typeof root.addEventListener === 'function') {
        root.addEventListener('storage', onStorage);
        listening = true;
      }
      return function unsubscribe() {
        var i = listeners.indexOf(fn);
        if (i !== -1) listeners.splice(i, 1);
      };
    }
  });

  var L = {
    ig: { label: 'Instagram @horney.band', href: 'https://www.instagram.com/horney.band/' },
    dm: { label: 'DM no Instagram', href: 'https://ig.me/m/horney.band' },
    tiktok: { label: 'TikTok @horney.band', href: 'https://www.tiktok.com/@horney.band' },
    threads: { label: 'Threads @horney.band', href: 'https://www.threads.com/@horney.band' },
    youtube: { label: 'YouTube @bandaHorney', href: 'https://www.youtube.com/@bandaHorney' },
    spotify: { label: 'HORNEY no Spotify', href: 'https://open.spotify.com/artist/5zJVmieIGGEeOKbIrXmhZi' },
    plataformas: { label: 'Todas as plataformas', href: 'https://ps.algohits.com/horney-anti-raso' },
    antiRaso: { label: 'Ouvir ANTI-RASO no Spotify', href: 'https://open.spotify.com/album/7EM81z5ydGQq04ZbkIE5aS' },
    mergulhar: { label: 'Ouvir MERGULHAR no Spotify', href: 'https://open.spotify.com/album/5jJ1py37M3i7qaZgkOOf4V' },
    off: { label: 'Ouvir OFF! no Spotify', href: 'https://open.spotify.com/album/6Cg0ULHHKTsJo7GlEfPKrF' },
    fourRooms: { label: 'Ouvir FOUR ROOMS FOR FOUR FOOLS no Spotify', href: 'https://open.spotify.com/album/3m7dNgjIIiHDuZiNcu8Vhi' },
    unglued: { label: 'Review da Unglued', href: 'https://www.unglued.com.br/reviews/anti-raso' }
  };

  var SHOWS = [
    { date: '2026-09-17', title: 'ROCK NIGHT @ FFFRONT', where: 'FFFront · Rua Purpurina, 199 — Vila Madalena, São Paulo · qui, 20h · w/ Mastrobiso' },
    { date: '2026-10-03', title: 'HORNEY AO VIVO', where: 'LOCAL NÃO INFORMADO' },
    { date: '2026-10-09', title: 'ÚLTIMO SHOW DO ANO', where: 'LOCAL EM BREVE' }
  ];

  var RELEASES = [
    { re: /(?:^| )(?:unglued|resenha|review|critica|nota)(?= |$)/, links: [L.unglued, L.antiRaso],
      fact: 'A Unglued resenhou o ANTI-RASO e deu 7.8/10.' },
    { re: /(?:^| )(?:fools game|fool s game|clipe|clipes|video|videos|youtube)(?= |$)/, links: [L.youtube],
      fact: 'Fool\'s Game: videoclipe oficial, 2022, dir. Rique Duarte. Tá no YouTube, junto com 38 segundos de suor ao vivo.' },
    { re: /(?:^| )(?:four rooms|primeiro ep|2022)(?= |$)/, links: [L.fourRooms, L.spotify],
      fact: 'FOUR ROOMS FOR FOUR FOOLS, EP de 2022. O primeiro, quando quase ninguém olhava.' },
    { re: /(?:^| )off(?= |$)/, links: [L.off, L.antiRaso],
      fact: 'OFF! saiu como single em 13.11.2025 e abre o ANTI-RASO. 3:19 de refrão feito pra grade.' },
    { re: /(?:^| )mergulhar(?= |$)/, links: [L.mergulhar, L.antiRaso],
      fact: 'MERGULHAR: single de 2026 e faixa 03 do ANTI-RASO. 3:45 de profundidade.' },
    { re: /(?:^| )(?:quebra cabeca|dani buarque)(?= |$)/, links: [L.antiRaso, L.plataformas],
      fact: 'QUEBRA-CABEÇA feat. Dani Buarque é a faixa 02 do ANTI-RASO. 4:20.' },
    { re: /(?:^| )romantica(?= |$)/, links: [L.antiRaso, L.plataformas],
      fact: 'ROMÂNTICA fecha o ANTI-RASO em 2:28. Curta. Não rasa.' },
    { re: null, links: [L.antiRaso, L.plataformas, L.spotify],
      fact: 'ANTI-RASO, EP de 4 faixas, saiu em 30.07.2026: OFF!, QUEBRA-CABEÇA feat. Dani Buarque, MERGULHAR, ROMÂNTICA.' }
  ];

  var MERCH_FACT = 'Merch EM BREVE: camiseta ANTI-RASO, tee do olho, moletom OFF!, ecobag, pôster OFF! A3 e kit de bottons. Reserva na DM.';

  var POOLS = {
    vazio: [
      'O olho está aberto. Falta a pergunta.',
      'Silêncio também é pergunta, mas é rasa. Escreve alguma coisa.',
      'Pergunta. O olho não lê mente, lê texto.',
      'Nada perguntado, nada revelado. Digita.',
      'Você me acordou pra isso? Faz uma pergunta.',
      'Campo vazio, alma vazia. Preenche pelo menos um dos dois.'
    ],
    showsNext: [
      function (f) { return f + ' Sai de casa e cole. O olho vai estar contando quem foi.'; },
      function (f) { return 'O olho já viu o palco montado. ' + f; },
      function (f) { return f + ' Local e ingressos saem primeiro nos stories.'; },
      function (f) { return f + ' Ver pelo story é raso. Vai pra grade.'; },
      function (f) { return 'Anota antes que o feed te afogue no raso: ' + f; },
      function (f) { return f + ' SAI DE CASA E COLE NOS SHOWS!!!'; }
    ],
    showsNone: [
      function (f) { return f + ' Depois disso o olho só vê palco vazio. Data nova sai primeiro no Instagram.'; },
      function (f) { return 'O olho procurou na agenda e achou silêncio. ' + f + ' Fica de olho no Instagram.'; },
      function (f) { return f + ' Ingresso pra show que ainda não existe, nem o olho vende. Local e ingressos saem primeiro nos stories.'; },
      function (f) { return 'Não viu sua cidade? Chama a gente na DM. ' + f; },
      function (f) { return f + ' O próximo ainda está no fundo. Quem segue o Instagram vê subir primeiro.'; },
      function (f) { return 'Você chegou depois do barulho. ' + f + ' Datas novas saem primeiro no Instagram.'; }
    ],
    ouvir: [
      function (f) { return f + ' O olho já ouviu. Agora desce você.'; },
      function (f) { return f + ' Fone, luz apagada, sem pular faixa. Raso é quem ouve no 1.5x.'; },
      function (f) { return f + ' Ouve inteiro. A capa é só a superfície.'; },
      function (f) { return 'Ouvir uma vez é molhar o pé. ' + f; },
      function (f) { return 'O algoritmo não vai te avisar. O olho avisa: ' + f; },
      function (f) { return f + ' Aumenta. O vizinho também merece profundidade.'; }
    ],
    merch: [
      function (f) { return f + ' O olho também quer uma.'; },
      function (f) { return 'Ainda não está à venda. ' + f; },
      function (f) { return f + ' Nada de carrinho, nada de checkout.'; },
      function (f) { return f + ' Comprar roupa é raso. Vestir o olho é outra coisa.'; },
      function (f) { return 'Paciência é tecido raro. ' + f; },
      function (f) { return f + ' Quem manda DM fica sabendo primeiro.'; }
    ],
    banda: [
      'Quarteto de alt/indie rock de Joinville (SC). Voz e letras: Duda Maiolini. Composição: Rafa Bello. +2. O olho conhece todos pelo nome.',
      'Punk, hardcore e grunge com respiros de MPB, cantando em português desde 2026. De Joinville (SC). Rótulo é coisa de quem não ouviu até o fim.',
      'Duda Maiolini canta e escreve, Rafa Bello compõe, e mais dois fazem o barulho todo acontecer. Joinville (SC) manda lembranças.',
      'O primeiro EP foi Four Rooms for Four Fools (2022). O mais recente, ANTI-RASO (30/07/2026). O olho viu as quatro salas e o mar inteiro.',
      'Nas palavras da Duda: “A Horney não é uma banda que vai tocar só rock pesado, nem uma banda que vai tocar só música melancólica.” Sem resumo raso.',
      '“ANTI-RASO significa mergulhar fundo nas coisas. É se recusar a viver apenas na superfície.” Duda Maiolini, voz e letras da HORNEY, de Joinville (SC).'
    ],
    contato: [
      'O caminho é a DM no Instagram: @horney.band. Email, o olho não encontrou em lugar nenhum.',
      'Booking, show na sua cidade, proposta indecente: DM no Instagram @horney.band. Não viu sua cidade? Chama a gente.',
      '@horney.band no Instagram, no TikTok e no Threads. Escolhe sua superfície. A conversa séria é na DM.',
      'Quer contratar? Manda DM no @horney.band. O olho não atende telefone.',
      'O Instagram @horney.band é onde tudo sai primeiro. A DM fica aberta. Seja breve, seja fundo.',
      'Não existe formulário, existe coragem. DM no Instagram @horney.band.'
    ],
    amor: [
      'O amor que você procura também está procurando. Os dois estão olhando pro celular. Larga o celular.',
      'Paixão de superfície evapora no primeiro sol. Se for fundo, aguenta a maré.',
      'Sim, essa pessoa pensa em você. Não tanto quanto você pensa nela. Ajusta a profundidade.',
      'O olho vê dois corações. Um deles está no modo avião.',
      'Amor raso é o que só curte story. Você merece quem mergulha.',
      'Manda a mensagem. O pior que pode acontecer é descobrir que era raso.',
      'Quem te ama de verdade te empresta o fone na parte boa da música.'
    ],
    futuro: [
      'O futuro é fundo e escuro. Leva lanterna e fôlego.',
      'Vejo uma porta aberta no meio do mar. Você vai ter que nadar até ela.',
      'Vai dar certo, mas não do jeito que você ensaiou. Nunca é.',
      'O olho viu seu amanhã. Ele também está atrasado.',
      'Tem mudança vindo. Quem fica na superfície vê a onda. Quem desce vê a corrente.',
      'Seu futuro depende de uma decisão que você está adiando desde terça.',
      'Daqui a um ano você vai rir dessa pergunta. Com razão.'
    ],
    sim_nao: [
      'Sim. Mas você já sabia, só queria plateia.',
      'Não. E no fundo você também acha que não.',
      'Sim, se você parar de perguntar e fizer.',
      'Talvez. O olho enxerga fundo, não enxerga indecisão.',
      'Não agora. Pergunta de novo quando a maré baixar.',
      'Sem dúvida. Raso seria duvidar.',
      'As águas dizem que sim. As águas também já mentiram.',
      'Não. Próxima pergunta, de preferência mais funda.'
    ],
    visao: [
      'Vejo um raio, uma porta e você com medo da água. Entra.',
      'O olho vê muito e comenta pouco. Hoje comenta: cuidado com quem só fala de superfície.',
      'Tem um refrão preso na sua garganta. Solta na grade.',
      'Sua pergunta é rasa demais pra eu molhar o pé. Tenta de novo, mais fundo.',
      'Vejo neblina. Não é o futuro, é Joinville de manhã.',
      'Algo que você perdeu vai voltar. Provavelmente o fone.',
      'O olho piscou. Isso foi a resposta.'
    ]
  };

  var SORTES = [
    'Hoje é um bom dia para ouvir um disco inteiro sem pular faixa.',
    'Um amigo antigo vai te mandar uma música. Ouça até o fim.',
    'Sua coragem será testada na grade. Você vai passar.',
    'Alguém pensa em você enquanto ouve uma música triste.',
    'Evite conversas rasas antes do almoço.',
    'A resposta que você procura está no refrão, não no verso.',
    'Hoje você vai descobrir que mergulhar dá menos medo do que parece.',
    'Uma porta vai se abrir num lugar improvável. Talvez no meio do mar.',
    'Seus amigos estão orgulhosos de você, mas não vão admitir.',
    'Não deixe para amanhã o show que você pode ver hoje.',
    'A sorte sorri para quem sai de casa.',
    'Você será lembrado por alguém que estava no fundo da sala.',
    'Bom dia para mandar aquela mensagem. Ou para apagar o rascunho.',
    'Quem ouve com atenção hoje fala com sabedoria amanhã.',
    'Seu fone vai durar mais um dia. Aproveite.',
    'Um raio cai duas vezes no mesmo lugar quando o lugar é você.',
    'Hoje a superfície vai parecer tentadora. Desconfie.',
    'Você terá uma ideia brilhante no banho. Anote antes de secar.',
    'A paciência será recompensada com um refrão grudento.',
    'Cuidado com quem só conhece a capa do disco.',
    'Uma surpresa boa chega por mensagem. Não deixe no visto.',
    'O dia favorece quem canta alto e desafinado.',
    'Hoje você vai ter vontade de mudar o cabelo. O olho apoia.',
    'Um amor de verão pode virar amor de inverno em Joinville.',
    'Seus problemas parecem fundos, mas dá pé.',
    'Aceite o convite. A noite vai valer a ressaca.',
    'Você vai encontrar uma música nova e chamar de sua.',
    'Não responda no impulso. Responda no refrão.',
    'Quem planta playlist colhe amizade.',
    'Seu signo não importa hoje. O olho manda mais.',
    'A chuva de hoje é a desculpa perfeita para ouvir um EP inteiro.',
    'Alguém vai te adicionar como amigo e você vai aceitar sem pensar duas vezes.',
    'O dia é seu. Só não gasta tudo no feed.'
  ];

  function matcher(words) {
    if (!words.length) return null;
    return new RegExp('(?:^| )(?:' + words.map(function (w) {
      return w.charAt(w.length - 1) === '*' ? w.slice(0, -1) : w + '(?= |$)';
    }).join('|') + ')', 'g');
  }

  function rule(name, strong, weak) {
    return { name: name, strong: matcher(strong), weak: matcher(weak) };
  }

  var RULES = [
    rule('contato',
      ['contato*', 'contatar', 'booking', 'contrat*', 'email*', 'e mail', 'gmail', 'instagram', 'insta', 'ig', 'dm', 'direct', 'tiktok', 'threads', 'whats*', 'zap', 'telefone', 'falar com', 'chamar', 'parceria*', 'assessoria', 'produtor*'],
      ['rede*', 'social', 'mensagem', 'seguir', 'perfil']),
    rule('merch',
      ['merch*', 'camiset*', 'camisa*', 'moletom*', 'ecobag*', 'bag', 'botton*', 'bottom*', 'poster*', 'tee', 'loja*', 'roupa*', 'bone*', 'produto*'],
      ['compr*', 'vend*', 'preco*', 'custa', 'valor']),
    rule('ouvir',
      ['musica*', 'ouvir', 'ouco', 'escut*', 'spotify', 'disco*', 'album*', 'ep', 'eps', 'single*', 'clipe*', 'video*', 'youtube', 'faixa*', 'cancao', 'cancoes', 'letra*', 'lancamento*', 'playlist*', 'streaming', 'deezer', 'apple music', 'anti raso', 'antiraso', 'off', 'mergulhar', 'quebra cabeca', 'romantica', 'fools game', 'fool s game', 'four rooms', 'unglued', 'resenha', 'review'],
      ['som', 'sai', 'saiu', 'novo', 'nova', 'lanca*']),
    rule('shows',
      ['show*', 'turne*', 'tour', 'ingress*', 'agenda', 'data', 'datas', 'palco', 'ao vivo', 'rock night', 'fffront', 'festival*', 'gig', 'toca*'],
      ['quando', 'onde', 'cidade', 'sao paulo', 'sp', 'curitiba', 'floripa', 'florianopolis', 'blumenau', 'porto alegre', 'rio', 'rio de janeiro', 'itajai', 'jaragua', 'balneario', 'belo horizonte', 'bh', 'chapeco', 'criciuma', 'lages']),
    rule('banda',
      ['integrante*', 'membro*', 'historia', 'origem', 'formacao', 'vocalista', 'duda', 'eduarda', 'maiolini', 'rafa', 'bello', 'guitarrista*', 'baterista*', 'baixista*', 'genero', 'estilo', 'quarteto', 'quem sao', 'quem e', 'o que e a horney', 'o que e horney'],
      ['quem', 'banda', 'nome', 'joinville', 'comecou', 'sobre']),
    rule('amor',
      ['amor*', 'amar', 'amo', 'crush', 'namor*', 'paixao', 'apaixon*', 'coracao', 'beij*', 'casar', 'casamento', 'ficar com', 'relacionamento*', 'solteir*', 'saudade*', 'ciume*', 'ex', 'gosta de mim', 'me ama', 'alma gemea', 'romance'],
      []),
    rule('futuro',
      ['futuro', 'amanha', 'ano que vem', 'proximo ano', '2027', 'destino', 'sorte', 'carreira', 'emprego', 'trabalho', 'faculdade', 'vestibular', 'enem', 'prova*', 'sucesso', 'rico', 'rica', 'dinheiro', 'viag*', 'dar certo', 'um dia'],
      ['vida', 'mudar'])
  ];

  var YES_NO = ['vou', 'vai', 'vamos', 'devo', 'deveria', 'sera', 'e', 'eh', 'tem', 'tenho', 'posso', 'pode', 'consigo', 'preciso', 'ha', 'existe', 'da', 'rola', 'vale', 'sou', 'estou', 'to', 'eu', 'ele', 'ela', 'voce', 'vc', 'isso', 'ja', 'quer', 'foi'];

  var INTENTS = Object.freeze(['shows', 'ouvir', 'merch', 'banda', 'contato', 'amor', 'futuro', 'sim_nao', 'visao', 'vazio']);

  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function hits(re, s) {
    if (!re) return 0;
    var m = s.match(re);
    return m ? m.length : 0;
  }

  function detect(q) {
    var best = null;
    var bestScore = 0;
    RULES.forEach(function (r) {
      var score = hits(r.strong, q) * 2 + hits(r.weak, q);
      if (score > bestScore) {
        best = r.name;
        bestScore = score;
      }
    });
    if (best) return best;
    if (YES_NO.indexOf(q.split(' ')[0]) !== -1) return 'sim_nao';
    return 'visao';
  }

  var lastPick = {};

  function pick(key, pool) {
    var i = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && i === lastPick[key]) {
      i = (i + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    }
    lastPick[key] = i;
    return pool[i];
  }

  function links(list) {
    return list.map(function (l) { return { label: l.label, href: l.href }; });
  }

  function dayKey(d) {
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function br(iso) {
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function answerShows() {
    var today = dayKey(new Date());
    var upcoming = SHOWS.filter(function (s) { return s.date >= today; });
    var fact;
    var variant;
    if (upcoming.length) {
      var next = upcoming[0];
      var more = upcoming.length - 1;
      fact = (next.date === today ? 'É HOJE: ' : 'Próximo show: ') + br(next.date) + ', ' + next.title + ' (' + next.where + ').' +
        (more ? ' Mais ' + more + (more === 1 ? ' data' : ' datas') + ' na agenda.' : '');
      variant = pick('shows:next', POOLS.showsNext);
    } else {
      var last = SHOWS[SHOWS.length - 1];
      fact = 'Último show na agenda: ' + br(last.date) + ', ' + last.title + '.';
      variant = pick('shows:none', POOLS.showsNone);
    }
    return { text: variant(fact), intent: 'shows', links: links([L.ig, L.dm]) };
  }

  function answerOuvir(q) {
    var rel = RELEASES.filter(function (r) { return !r.re || r.re.test(q); })[0];
    return { text: pick('ouvir', POOLS.ouvir)(rel.fact), intent: 'ouvir', links: links(rel.links) };
  }

  function ask(question) {
    var q = norm(question);
    if (!q) return { text: pick('vazio', POOLS.vazio), intent: 'vazio', links: [] };
    var intent = detect(q);
    switch (intent) {
      case 'shows':
        return answerShows();
      case 'ouvir':
        return answerOuvir(q);
      case 'merch':
        return { text: pick('merch', POOLS.merch)(MERCH_FACT), intent: 'merch', links: links([L.dm, L.ig]) };
      case 'banda':
        return { text: pick('banda', POOLS.banda), intent: 'banda', links: links([L.ig, L.spotify]) };
      case 'contato':
        return { text: pick('contato', POOLS.contato), intent: 'contato', links: links([L.dm, L.ig, L.tiktok, L.threads]) };
      default:
        return { text: pick(intent, POOLS[intent]), intent: intent, links: [] };
    }
  }

  function sorte(date) {
    var d = date == null ? new Date() : new Date(date);
    if (isNaN(d.getTime())) d = new Date();
    var day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    return SORTES[(Math.imul(day, 2654435761) >>> 0) % SORTES.length];
  }

  var oraculo = Object.freeze({
    ask: ask,
    sorte: sorte,
    intents: INTENTS
  });

  var H = root.Horney || {};
  H.mural = mural;
  H.oraculo = oraculo;
  root.Horney = H;
})(typeof window !== 'undefined' ? window : this);
