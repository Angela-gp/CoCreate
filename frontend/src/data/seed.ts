import type {
  Contribution,
  CreatorPass,
  OnchainTx,
  PaidMessage,
  Project,
  Vote,
} from '../lib/types'
import { derivePda, fakeSignature, uid } from '../lib/utils'

const DAY = 86_400_000
const now = Date.now()
const inDays = (d: number) => new Date(now + d * DAY).toISOString()
const agoDays = (d: number) => new Date(now - d * DAY).toISOString()
const agoHours = (h: number) => new Date(now - h * 3_600_000).toISOString()

const w = (seed: string) => derivePda('wallet', seed)

/** Кошельки демо-аудитории — детерминированы, чтобы история выглядела стабильно. */
export const DEMO_BACKERS = [
  { handle: '@aisha.sol', wallet: w('aisha') },
  { handle: '@dias', wallet: w('dias') },
  { handle: '@nomad_kz', wallet: w('nomad') },
  { handle: '@zhanna', wallet: w('zhanna') },
  { handle: '@marat', wallet: w('marat') },
  { handle: '@lena.dev', wallet: w('lena') },
  { handle: '@timur', wallet: w('timur') },
  { handle: '@sabina', wallet: w('sabina') },
  { handle: '@erik', wallet: w('erik') },
  { handle: '@dana', wallet: w('dana') },
]

const project = (p: Project): Project => p

export const SEED_PROJECTS: Project[] = [
  project({
    id: 'uzb-unfiltered',
    slug: 'uzbekistan-bez-filtrov',
    title: 'Узбекистан без фильтров',
    tagline: 'Документальный фильм о людях и городах, которых не показывают в путеводителях',
    description:
      'Полнометражный документальный фильм: три месяца съёмок в Самарканде, Бухаре и Ташкенте. ' +
      'Без постановочных кадров и туристических клише — только живые истории мастеров, торговцев и ' +
      'молодых музыкантов. Собранные средства идут на съёмочную группу, логистику, оборудование ' +
      'и постпродакшн. Участники кампании получают Creator Pass, выбирают локацию следующей серии ' +
      'и видят весь backstage до релиза.',
    category: 'film',
    art: 'mountains',
    creator: {
      handle: '@rustem.films',
      name: 'Рустем Мязов',
      wallet: w('rustem'),
      avatarHue: 268,
      followers: 184_000,
      verified: true,
      bio: 'Документалист. 6 лет снимаю Центральную Азию. Ранее: короткометражка «Тени Арала».',
    },
    goalUsd: 20_000,
    seedRaisedUsd: 7_450,
    seedBackers: 214,
    currency: 'USDC',
    createdAt: agoDays(7),
    deadline: inDays(23),
    state: 'live',
    vault: derivePda('vault', 'uzb-unfiltered'),
    campaignPda: derivePda('campaign', 'uzb-unfiltered'),
    team: [
      { name: 'Алина Ким', role: 'Оператор', shareBps: 1500, wallet: w('alina') },
      { name: 'Дамир С.', role: 'Звук и монтаж', shareBps: 1000, wallet: w('damir') },
    ],
    partners: [{ name: 'Silk Road Studio', shareBps: 500, wallet: w('silkroad') }],
    polls: [
      {
        id: 'poll-location',
        question: 'Выберите локацию для следующей серии',
        options: [
          { id: 'samarkand', label: 'Самарканд', hint: 'Ремесленные мастерские Регистана' },
          { id: 'bukhara', label: 'Бухара', hint: 'Ночной рынок и караван-сараи' },
          { id: 'tashkent', label: 'Ташкент', hint: 'Молодая музыкальная сцена' },
        ],
        minTier: 'insider',
        closesAt: inDays(6),
      },
    ],
    backstage: [
      {
        id: 'bs-1',
        title: 'Первый съёмочный день: сырые кадры Самарканда',
        body: '18 минут необработанного материала с рынка Сиаб — то, что почти наверняка не войдёт в финальный монтаж, но объясняет, почему мы делаем этот фильм.',
        minTier: 'supporter',
        publishedAt: agoDays(3),
        kind: 'video',
      },
      {
        id: 'bs-2',
        title: 'Черновой сценарий второй главы (PDF)',
        body: 'Структура главы про мастеров-керамистов. Комментарии участников уровня Producer учитываем при финальной сборке.',
        minTier: 'producer',
        publishedAt: agoDays(1),
        kind: 'update',
      },
      {
        id: 'bs-3',
        title: 'Закрытый созвон с командой · 12 сентября',
        body: 'Обсуждаем монтаж и отвечаем на вопросы. Ссылка приходит в кошелёк держателям Executive Pass.',
        minTier: 'executive',
        publishedAt: agoHours(10),
        kind: 'call',
      },
    ],
    merch: [
      { id: 'm-1', title: 'Цифровой фотоальбом со съёмок', priceUsd: 12, kind: 'digital', emoji: '📸' },
      { id: 'm-2', title: 'Постер «Регистан 04:40»', priceUsd: 28, kind: 'physical', emoji: '🖼️', stock: 120 },
      {
        id: 'm-3',
        title: 'Саундтрек фильма (lossless)',
        priceUsd: 9,
        kind: 'digital',
        emoji: '🎧',
        minTier: 'supporter',
      },
    ],
    milestones: [
      { label: 'Съёмки Самарканда', pct: 25 },
      { label: 'Бухара и Ташкент', pct: 55 },
      { label: 'Постпродакшн', pct: 85 },
      { label: 'Премьера', pct: 100 },
    ],
    featured: true,
  }),

  project({
    id: 'almaty-streets',
    slug: 'almaty-streets-s2',
    title: 'Улицы Алматы · сезон 2',
    tagline: 'Веб-сериал о городской культуре: 8 эпизодов, съёмки с ноября',
    description:
      'Второй сезон сериала, который в первом собрал 4,2 млн просмотров. Восемь эпизодов по 22 минуты: ' +
      'скейт-сцена, уличная еда, ночные автобусы и люди, которые держат город. Средства — на аренду техники, ' +
      'гонорары актёрам и цветокоррекцию.',
    category: 'series',
    art: 'city',
    creator: {
      handle: '@kuanysh',
      name: 'Куаныш Айтбаев',
      wallet: w('kuanysh'),
      avatarHue: 196,
      followers: 96_400,
      verified: true,
      bio: 'Режиссёр веб-сериалов. Сезон 1 — 4,2M просмотров.',
    },
    goalUsd: 12_000,
    seedRaisedUsd: 9_820,
    seedBackers: 341,
    currency: 'USDC',
    createdAt: agoDays(18),
    deadline: inDays(9),
    state: 'live',
    vault: derivePda('vault', 'almaty-streets'),
    campaignPda: derivePda('campaign', 'almaty-streets'),
    team: [{ name: 'Ольга П.', role: 'Продюсер', shareBps: 1200, wallet: w('olga') }],
    partners: [],
    polls: [
      {
        id: 'poll-episode',
        question: 'Какой эпизод снимаем первым?',
        options: [
          { id: 'skate', label: 'Скейт-парк на Абая' },
          { id: 'bazaar', label: 'Зелёный базар в 5 утра' },
          { id: 'bus', label: 'Ночной 32-й автобус' },
        ],
        minTier: 'insider',
        closesAt: inDays(4),
      },
    ],
    backstage: [
      {
        id: 'bs-a1',
        title: 'Кастинг: 3 финалиста на главную роль',
        body: 'Видео проб и наши сомнения. Голосование среди Insider откроем на следующей неделе.',
        minTier: 'supporter',
        publishedAt: agoDays(2),
        kind: 'video',
      },
    ],
    merch: [
      { id: 'm-a1', title: 'Стикерпак сезона', priceUsd: 6, kind: 'digital', emoji: '🧷' },
      { id: 'm-a2', title: 'Худи «S2 CREW»', priceUsd: 65, kind: 'physical', emoji: '🧥', stock: 40 },
    ],
    milestones: [
      { label: 'Препродакшн', pct: 30 },
      { label: 'Съёмки 8 эпизодов', pct: 75 },
      { label: 'Релиз', pct: 100 },
    ],
  }),

  project({
    id: 'nomad-album',
    slug: 'nomad-album',
    title: 'Кочевой альбом',
    tagline: 'Альбом на стыке домбры и электроники — 11 треков',
    description:
      'Записываем альбом с живыми народными инструментами и модульным синтезатором. ' +
      'Цель достигнута — смарт-контракт разблокировал средства, идёт выплата команде и партнёрам.',
    category: 'music',
    art: 'studio',
    creator: {
      handle: '@aigul.sound',
      name: 'Айгуль Сериккызы',
      wallet: w('aigul'),
      avatarHue: 320,
      followers: 51_200,
      verified: false,
      bio: 'Композитор, продюсер. Играю на домбре 14 лет.',
    },
    goalUsd: 8_000,
    seedRaisedUsd: 8_140,
    seedBackers: 268,
    currency: 'SOL',
    createdAt: agoDays(34),
    deadline: inDays(2),
    state: 'successful',
    vault: derivePda('vault', 'nomad-album'),
    campaignPda: derivePda('campaign', 'nomad-album'),
    team: [
      { name: 'Ержан Т.', role: 'Микс и мастеринг', shareBps: 2000, wallet: w('erzhan') },
      { name: 'Мади К.', role: 'Сессионный барабанщик', shareBps: 800, wallet: w('madi') },
    ],
    partners: [{ name: 'Tengri Records', shareBps: 700, wallet: w('tengri') }],
    polls: [
      {
        id: 'poll-single',
        question: 'Какой трек выпускаем первым синглом?',
        options: [
          { id: 'zhel', label: '«Жел» — ветер' },
          { id: 'kok', label: '«Көк» — небо' },
          { id: 'tas', label: '«Тас» — камень' },
        ],
        minTier: 'insider',
        closesAt: inDays(1),
      },
    ],
    backstage: [
      {
        id: 'bs-n1',
        title: 'Демо трека №4 до аранжировки',
        body: 'Голос и домбра, один дубль, без обработки.',
        minTier: 'supporter',
        publishedAt: agoDays(6),
        kind: 'video',
      },
      {
        id: 'bs-n2',
        title: 'Разбор сессии: как строился бит «Тас»',
        body: 'Проект в Ableton, скриншоты цепочек и объяснение каждого слоя.',
        minTier: 'producer',
        publishedAt: agoDays(4),
        kind: 'update',
      },
    ],
    merch: [
      { id: 'm-n1', title: 'Альбом в lossless до релиза', priceUsd: 14, kind: 'digital', emoji: '💽' },
      { id: 'm-n2', title: 'Винил, лимит 200', priceUsd: 45, kind: 'physical', emoji: '🎶', stock: 200 },
    ],
    milestones: [
      { label: 'Запись', pct: 40 },
      { label: 'Микс', pct: 70 },
      { label: 'Релиз и клип', pct: 100 },
    ],
  }),

  project({
    id: 'steppe-riders',
    slug: 'steppe-riders',
    title: 'Steppe Riders',
    tagline: 'Инди-игра про кочевников: пиксель-арт, конные бои, открытая степь',
    description:
      'Команда из трёх человек делает игру про степных всадников. Уже готов вертикальный срез: ' +
      'боевая система, седло-физика и первая локация. Средства — на художника, композитора и год разработки.',
    category: 'game',
    art: 'desert',
    creator: {
      handle: '@steppe.dev',
      name: 'Ильяс Ж.',
      wallet: w('ilyas'),
      avatarHue: 32,
      followers: 22_800,
      verified: false,
      bio: 'Геймдев. Unity, 7 лет. Раньше делал мобильные раннеры.',
    },
    goalUsd: 30_000,
    seedRaisedUsd: 4_260,
    seedBackers: 97,
    currency: 'USDC',
    createdAt: agoDays(5),
    deadline: inDays(41),
    state: 'live',
    vault: derivePda('vault', 'steppe-riders'),
    campaignPda: derivePda('campaign', 'steppe-riders'),
    team: [{ name: 'Ая Н.', role: 'Пиксель-арт', shareBps: 1800, wallet: w('aya') }],
    partners: [],
    polls: [
      {
        id: 'poll-hero',
        question: 'Кто станет вторым играбельным героем?',
        options: [
          { id: 'archer', label: 'Лучница на коне' },
          { id: 'falconer', label: 'Охотник с орлом' },
          { id: 'shaman', label: 'Шаман-барабанщик' },
        ],
        minTier: 'insider',
        closesAt: inDays(12),
      },
    ],
    backstage: [
      {
        id: 'bs-s1',
        title: 'Сборка вертикального среза (Windows)',
        body: 'Играбельная демо-сборка на 15 минут. Ждём баг-репорты в закрытом чате.',
        minTier: 'supporter',
        publishedAt: agoDays(2),
        kind: 'update',
      },
    ],
    merch: [
      { id: 'm-s1', title: 'Ключ Steam при релизе', priceUsd: 22, kind: 'digital', emoji: '🎮' },
      { id: 'm-s2', title: 'Артбук PDF', priceUsd: 15, kind: 'digital', emoji: '📕' },
    ],
    milestones: [
      { label: 'Вертикальный срез', pct: 20 },
      { label: 'Альфа', pct: 60 },
      { label: 'Ранний доступ', pct: 100 },
    ],
  }),

  project({
    id: 'first-million',
    slug: 'podcast-first-million',
    title: 'Подкаст «Первый миллион»',
    tagline: '12 выпусков с основателями из Центральной Азии',
    description:
      'Сезон интервью с людьми, которые построили бизнес с нуля. Кампания закрыта успешно, ' +
      'средства выплачены — вся история выплат видна в блокчейне.',
    category: 'podcast',
    art: 'code',
    creator: {
      handle: '@dulat',
      name: 'Дулат А.',
      wallet: w('dulat'),
      avatarHue: 150,
      followers: 38_500,
      verified: true,
      bio: 'Журналист, ведущий. 200+ интервью.',
    },
    goalUsd: 5_000,
    seedRaisedUsd: 5_310,
    seedBackers: 152,
    currency: 'USDC',
    createdAt: agoDays(62),
    deadline: agoDays(11),
    state: 'claimed',
    vault: derivePda('vault', 'first-million'),
    campaignPda: derivePda('campaign', 'first-million'),
    team: [{ name: 'Асель Б.', role: 'Редактор', shareBps: 1500, wallet: w('asel') }],
    partners: [],
    polls: [],
    backstage: [
      {
        id: 'bs-f1',
        title: 'Полная версия интервью без монтажа',
        body: '2 часа 40 минут разговора, из которых в выпуск вошло 48 минут.',
        minTier: 'supporter',
        publishedAt: agoDays(20),
        kind: 'video',
      },
    ],
    merch: [{ id: 'm-f1', title: 'Транскрипты сезона', priceUsd: 8, kind: 'digital', emoji: '📄' }],
    milestones: [
      { label: 'Запись 12 выпусков', pct: 60 },
      { label: 'Публикация сезона', pct: 100 },
    ],
  }),

  project({
    id: 'tengri-wear',
    slug: 'tengri-wear-drop',
    title: 'Мерч-дроп Tengri Wear',
    tagline: 'Капсульная коллекция из органического хлопка — 6 предметов',
    description:
      'Кампания не набрала цель в срок. Смарт-контракт открыл возврат: каждый участник может ' +
      'забрать свои средства сам, без обращения к автору или платформе.',
    category: 'merch',
    art: 'stage',
    creator: {
      handle: '@tengri.wear',
      name: 'Tengri Wear',
      wallet: w('tengriwear'),
      avatarHue: 12,
      followers: 14_300,
      verified: false,
      bio: 'Локальный бренд одежды.',
    },
    goalUsd: 10_000,
    seedRaisedUsd: 3_120,
    seedBackers: 74,
    currency: 'USDC',
    createdAt: agoDays(45),
    deadline: agoDays(3),
    state: 'failed',
    vault: derivePda('vault', 'tengri-wear'),
    campaignPda: derivePda('campaign', 'tengri-wear'),
    team: [],
    partners: [],
    polls: [],
    backstage: [],
    merch: [],
    milestones: [
      { label: 'Производство', pct: 60 },
      { label: 'Доставка', pct: 100 },
    ],
  }),
]

/** История, которая уже «была в блокчейне» до входа пользователя. */
function buildSeedLedger() {
  const contributions: Contribution[] = []
  const txs: OnchainTx[] = []
  const votes: Vote[] = []
  const messages: PaidMessage[] = []
  let slot = 298_400_000

  const pushTx = (tx: Omit<OnchainTx, 'slot' | 'cluster'>) => {
    slot += 3 + ((tx.signature.charCodeAt(0) + tx.signature.charCodeAt(3)) % 9)
    txs.push({ ...tx, slot, cluster: 'simnet' })
  }

  for (const p of SEED_PROJECTS) {
    pushTx({
      signature: fakeSignature(),
      kind: 'create_campaign',
      projectId: p.id,
      wallet: p.creator.wallet,
      ts: p.createdAt,
      memo: 'Кампания создана · цель $' + p.goalUsd.toLocaleString('en-US'),
    })
  }

  const recent: { pid: string; amount: number; who: number; hoursAgo: number }[] = [
    { pid: 'uzb-unfiltered', amount: 100, who: 0, hoursAgo: 1.2 },
    { pid: 'uzb-unfiltered', amount: 20, who: 1, hoursAgo: 2.6 },
    { pid: 'uzb-unfiltered', amount: 50, who: 2, hoursAgo: 5 },
    { pid: 'uzb-unfiltered', amount: 5, who: 3, hoursAgo: 8 },
    { pid: 'uzb-unfiltered', amount: 20, who: 4, hoursAgo: 14 },
    { pid: 'almaty-streets', amount: 50, who: 5, hoursAgo: 3 },
    { pid: 'almaty-streets', amount: 100, who: 6, hoursAgo: 7 },
    { pid: 'almaty-streets', amount: 20, who: 7, hoursAgo: 26 },
    { pid: 'nomad-album', amount: 100, who: 8, hoursAgo: 30 },
    { pid: 'nomad-album', amount: 20, who: 9, hoursAgo: 44 },
    { pid: 'steppe-riders', amount: 50, who: 1, hoursAgo: 4 },
    { pid: 'steppe-riders', amount: 5, who: 2, hoursAgo: 20 },
    { pid: 'tengri-wear', amount: 20, who: 3, hoursAgo: 96 },
  ]

  for (const r of recent) {
    const backer = DEMO_BACKERS[r.who]
    const p = SEED_PROJECTS.find((x) => x.id === r.pid)!
    const signature = fakeSignature()
    const ts = agoHours(r.hoursAgo)
    // Вклады демо-аудитории уже включены в seedRaisedUsd, поэтому в ledger они живут
    // только как история транзакций: список поддержавших строится из txs kind=contribute.
    pushTx({
      signature,
      kind: 'contribute',
      projectId: r.pid,
      wallet: backer.wallet,
      amountUsd: r.amount,
      currency: p.currency,
      ts,
      memo: 'Вклад аудитории',
    })
  }

  const seedVotes: [string, string, string, number, number][] = [
    ['poll-location', 'uzb-unfiltered', 'samarkand', 0, 3],
    ['poll-location', 'uzb-unfiltered', 'bukhara', 1, 1],
    ['poll-location', 'uzb-unfiltered', 'samarkand', 2, 6],
    ['poll-location', 'uzb-unfiltered', 'tashkent', 3, 1],
    ['poll-location', 'uzb-unfiltered', 'bukhara', 4, 3],
    ['poll-episode', 'almaty-streets', 'bazaar', 5, 6],
    ['poll-episode', 'almaty-streets', 'skate', 6, 3],
    ['poll-episode', 'almaty-streets', 'bazaar', 7, 1],
    ['poll-single', 'nomad-album', 'zhel', 8, 3],
    ['poll-single', 'nomad-album', 'kok', 9, 6],
  ]
  for (const [pollId, projectId, optionId, who, weight] of seedVotes) {
    const backer = DEMO_BACKERS[who]
    votes.push({
      id: uid('v_'),
      pollId,
      projectId,
      wallet: backer.wallet,
      optionId,
      weight,
      createdAt: agoHours(6 + who * 3),
      signature: fakeSignature(),
    })
  }

  const seedMessages: [string, number, string, number, number][] = [
    ['uzb-unfiltered', 0, 'Снимите ремесленников в Бухаре — там мой дед работал с керамикой.', 25, 2],
    ['uzb-unfiltered', 4, 'Держите фильм честным, без глянца. Верю в вас.', 10, 9],
    ['almaty-streets', 6, 'Первый сезон пересматривал трижды. Жду второй.', 15, 5],
    ['nomad-album', 8, 'Домбра + модуляр — то, чего не хватало. Возьмите на тур в Астану.', 40, 27],
  ]
  for (const [projectId, who, text, amountUsd, hoursAgo] of seedMessages) {
    const backer = DEMO_BACKERS[who]
    messages.push({
      id: uid('msg_'),
      projectId,
      wallet: backer.wallet,
      handle: backer.handle,
      text,
      amountUsd,
      createdAt: agoHours(hoursAgo),
      signature: fakeSignature(),
      tier: amountUsd >= 100 ? 'executive' : amountUsd >= 50 ? 'producer' : amountUsd >= 20 ? 'insider' : 'supporter',
    })
  }

  // Кампания «Первый миллион» уже выплачена — история выплат и комиссии
  const claimed = SEED_PROJECTS.find((p) => p.id === 'first-million')!
  const raised = claimed.seedRaisedUsd
  const fee = raised * 0.05
  pushTx({
    signature: fakeSignature(),
    kind: 'finalize',
    projectId: claimed.id,
    wallet: claimed.creator.wallet,
    ts: agoDays(11),
    memo: 'Цель достигнута — средства разблокированы',
  })
  pushTx({
    signature: fakeSignature(),
    kind: 'claim_funds',
    projectId: claimed.id,
    wallet: claimed.creator.wallet,
    amountUsd: raised,
    currency: 'USDC',
    ts: agoDays(11),
    memo: 'Смарт-контракт исполнил выплату кампании',
  })
  pushTx({
    signature: fakeSignature(),
    kind: 'payout',
    projectId: claimed.id,
    wallet: claimed.creator.wallet,
    amountUsd: (raised - fee) * 0.85,
    currency: 'USDC',
    ts: agoDays(11),
    memo: 'Блогер · ' + claimed.creator.name,
  })
  pushTx({
    signature: fakeSignature(),
    kind: 'payout',
    projectId: claimed.id,
    wallet: claimed.team[0].wallet,
    amountUsd: (raised - fee) * 0.15,
    currency: 'USDC',
    ts: agoDays(11),
    memo: 'Асель Б. · Редактор',
  })
  pushTx({
    signature: fakeSignature(),
    kind: 'platform_fee',
    projectId: claimed.id,
    wallet: derivePda('creator-fund', 'treasury'),
    amountUsd: fee,
    currency: 'USDC',
    ts: agoDays(11),
    memo: 'Комиссия платформы 5%',
  })

  txs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  const passes: CreatorPass[] = []
  return { contributions, txs, votes, messages, passes, treasuryUsd: fee }
}

export const SEED_LEDGER = buildSeedLedger()

/** Витрина уровней в ленте: сколько Pass каждого уровня уже выпущено (демо-числа). */
export const SEED_PASS_STATS: Record<string, number> = {
  supporter: 612,
  insider: 388,
  producer: 141,
  executive: 63,
}
