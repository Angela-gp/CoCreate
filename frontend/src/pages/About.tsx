import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Coins,
  Database,
  Gauge,
  Gift,
  Layers,
  Lock,
  MessageSquare,
  Package,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react'
import { TIERS, TIER_ORDER } from '../lib/tiers'
import { usd } from '../lib/format'
import { PLATFORM_FEE_BPS } from '../store/ledger'
import { Badge, Button, Card } from '../components/ui/primitives'
import { Logo, ProjectArt, SolanaMark } from '../components/ui/art'
import { TierIcon } from '../components/project/pass'

export default function About() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
      {/* ================= Концепция ================= */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-glow-radial opacity-80" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <div className="text-[26px] font-black uppercase leading-none tracking-tight">
                <div className="grad-text">CoCreate</div>
              </div>
            </div>
            <h1 className="mt-6 text-xl font-black leading-tight">
              Не просто смотреть контент.
              <br />
              Стать частью его создания.
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-txt-mid">
              CoCreate — платформа на Solana, где блогеры собирают финансирование на свои контент-проекты у
              аудитории. Все платежи и донаты проходят через Solana. Участники получают цифровое подтверждение
              своего участия и эксклюзивные привилегии.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                { icon: <SolanaMark size={13} />, label: '100% на Solana' },
                { icon: <Zap className="size-3.5 text-sol-cyan" />, label: 'Быстрые транзакции' },
                { icon: <Scale className="size-3.5 text-sol-violet" />, label: 'Низкие комиссии' },
                { icon: <ShieldCheck className="size-3.5 text-sol-teal" />, label: 'Прозрачность и доверие' },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-2.5 py-2.5"
                >
                  {b.icon}
                  <span className="text-[11.5px] font-medium leading-tight">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="eyebrow text-sol-violet">Концепция</div>
          <p className="mt-3 text-[13px] leading-relaxed text-txt-mid">
            Блогер создаёт проект и устанавливает цель по сбору средств. Аудитория поддерживает проект донатами.
            Деньги блокируются в смарт-контракте Solana и автоматически переводятся блогеру, если цель достигнута.
            Если цель не достигнута — средства автоматически возвращаются участникам.
          </p>

          <div className="mt-5 grid items-stretch gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <FlowBox icon={<Users className="size-4" />} title="Блогер" body="Создаёт проект и устанавливает цель по сбору" />
            <FlowBox icon={<Gift className="size-4" />} title="Аудитория" body="Поддерживает проект донатами через Solana (USDC / SOL)" />
            <FlowBox
              icon={<SolanaMark size={16} />}
              title="Смарт-контракт Solana"
              body="Блокирует средства и отслеживает достижение цели"
              accent
            />
            <div className="grid gap-3">
              <div className="rounded-xl border border-good/25 bg-good/[0.07] p-3">
                <div className="flex items-center gap-2 text-[12px] font-bold text-good">
                  <CheckCircle2 className="size-4" />
                  Цель достигнута
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-txt-mid">
                  Средства автоматически переводятся блогеру
                </p>
              </div>
              <div className="rounded-xl border border-bad/25 bg-bad/[0.07] p-3">
                <div className="flex items-center gap-2 text-[12px] font-bold text-bad">
                  <XCircle className="size-4" />
                  Цель не достигнута
                </div>
                <p className="mt-1.5 text-[11.5px] leading-snug text-txt-mid">
                  Средства автоматически возвращаются участникам
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <div className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-txt-lo">
              Все оплаты через Solana
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { icon: <Coins className="size-3.5" />, label: 'Поддержка проектов' },
                { icon: <Gift className="size-3.5" />, label: 'Донаты' },
                { icon: <BadgeCheck className="size-3.5" />, label: 'Покупка уровней (Pass)' },
                { icon: <MessageSquare className="size-3.5" />, label: 'Платные сообщения' },
                { icon: <Package className="size-3.5" />, label: 'Мерч и цифровые товары' },
                { icon: <Users className="size-3.5" />, label: 'Выплаты командам' },
              ].map((p) => (
                <div key={p.label} className="flex items-center gap-1.5 text-[11px] text-txt-mid">
                  <span className="text-sol-violet">{p.icon}</span>
                  <span className="leading-tight">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* ================= Как это работает ================= */}
      <section className="mt-8">
        <h2 className="text-lg font-bold uppercase tracking-tight text-sol-cyan sm:text-xl">Как это работает</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StepCard n={1} title="Создание проекта" body="Блогер публикует проект, описание, цель по сбору и награды для поддержавших.">
            <div className="overflow-hidden rounded-lg border border-white/[0.08]">
              <div className="relative aspect-[16/10]">
                <ProjectArt scene="mountains" id="about-step1" />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-7 place-items-center rounded-full border border-white/30 bg-ink-950/50">
                    <Play className="size-3 fill-white text-white" />
                  </span>
                </span>
              </div>
              <div className="p-2">
                <div className="num text-[10.5px] text-txt-lo">Цель: $20 000 · Срок: 30 дней</div>
                <div className="mt-1.5 rounded-md bg-sol-purple py-1 text-center text-[10.5px] font-semibold text-white">
                  Создать проект
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard n={2} title="Поддержка проекта" body="Пользователь подключает кошелёк и отправляет донат (USDC / SOL).">
            <div className="rounded-lg border border-white/[0.08] p-3 text-center">
              <div className="num text-2xl font-black">$5</div>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 rounded-md border border-white/10 py-1 text-[10.5px]">
                <SolanaMark size={10} /> USDC
              </div>
              <div className="mt-2 rounded-md bg-sol-purple py-1.5 text-[10.5px] font-semibold text-white">
                Поддержать через Solana
              </div>
            </div>
          </StepCard>

          <StepCard n={3} title="Средства в смарт-контракте" body="Средства блокируются в смарт-контракте Solana до достижения цели.">
            <div className="rounded-lg border border-white/[0.08] p-3">
              <div className="text-[10.5px] text-txt-lo">Прогресс сбора</div>
              <div className="num mt-1 text-xl font-black">$7 450</div>
              <div className="num text-[10.5px] text-txt-lo">из $20 000</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[37%] rounded-full bg-sol-grad" />
              </div>
            </div>
          </StepCard>

          <StepCard n={4} title="Цель достигнута" body="Смарт-контракт автоматически переводит средства блогеру и команде.">
            <div className="rounded-lg border border-good/25 bg-good/[0.06] p-3 text-center">
              <CheckCircle2 className="mx-auto size-6 text-good" />
              <div className="mt-1.5 text-[11px] font-semibold text-good">Цель достигнута!</div>
              <div className="num mt-1 text-lg font-black">$20 000</div>
              <div className="text-[10px] text-txt-lo">успешно собрано</div>
            </div>
          </StepCard>

          <StepCard n={5} title="Получение Pass" body="Участник получает цифровой Pass с уровнем и доступом к эксклюзивным привилегиям.">
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: TIERS.executive.ring, background: `${TIERS.executive.color}12` }}
            >
              <div className="flex items-center gap-1.5">
                <TierIcon tier="executive" />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: TIERS.executive.color }}>
                  Executive supporter
                </span>
              </div>
              <div className="num mt-2 text-[10.5px] text-txt-lo">Уровень: Executive</div>
              <div className="num text-[10.5px] text-txt-lo">Вклад: $100</div>
            </div>
          </StepCard>

          <StepCard n={6} title="Участие в проекте" body="Участники влияют на проект: голосования, закрытый контент, backstage и многое другое.">
            <div className="rounded-lg border border-white/[0.08] p-3">
              <div className="text-[10.5px] text-txt-lo">Выберите локацию</div>
              <div className="mt-1.5 space-y-1">
                {['Самарканд', 'Бухара', 'Ташкент'].map((o, i) => (
                  <div key={o} className="flex items-center gap-1.5 text-[10.5px]">
                    <span
                      className={`grid size-3 place-items-center rounded-full border ${i === 0 ? 'border-sol-violet' : 'border-white/20'}`}
                    >
                      {i === 0 && <span className="size-1.5 rounded-full bg-sol-violet" />}
                    </span>
                    {o}
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded-md bg-sol-purple py-1 text-center text-[10px] font-semibold text-white">
                Голосовать
              </div>
            </div>
          </StepCard>
        </div>
      </section>

      {/* ================= Уровни + телефон ================= */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-[15px] font-bold uppercase tracking-tight text-sol-violet">
            Уровни поддержки (Creator Pass)
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08]">
            <div className="grid grid-cols-[auto_auto_1fr] gap-3 border-b border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-txt-lo">
              <span>Уровень</span>
              <span>Вклад</span>
              <span>Что получает участник</span>
            </div>
            {TIER_ORDER.map((key) => {
              const t = TIERS[key]
              return (
                <div
                  key={key}
                  className="grid grid-cols-[auto_auto_1fr] items-center gap-3 border-b border-white/[0.05] px-3.5 py-3 last:border-0"
                >
                  <span className="flex w-24 items-center gap-1.5 text-[12.5px] font-bold" style={{ color: t.color }}>
                    <TierIcon tier={key} />
                    {t.name}
                  </span>
                  <span className="num w-12 text-[12.5px] font-bold">{usd(t.priceUsd)}</span>
                  <span className="text-[12px] leading-snug text-txt-mid">{t.short}</span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-txt-lo">
            Уровень определяется суммарным вкладом кошелька в проект: доплата поднимает Pass до следующего уровня
            автоматически.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/">
              <Button variant="solana" size="md" icon={<ArrowRight className="size-4" />}>
                Выбрать проект
              </Button>
            </Link>
            <Link to="/create">
              <Button variant="ghost" size="md">
                Создать свой
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center">
          <h2 className="self-start text-[15px] font-bold uppercase tracking-tight text-sol-teal">
            Почему именно Solana?
          </h2>
          <div className="mt-4 grid w-full gap-3 sm:grid-cols-[1fr_auto]">
            <ul className="space-y-2.5">
              {[
                { t: 'Мгновенные транзакции', d: 'Платежи подтверждаются за секунды' },
                { t: 'Низкие комиссии', d: 'Поддержка микроплатежей и донатов от $0.01' },
                { t: 'Масштабируемость', d: 'Платформа растёт без ограничений' },
                { t: 'Программируемые смарт-контракты', d: 'Сложные сценарии без посредников' },
                { t: 'Прозрачность и доверие', d: 'Все правила видны в блокчейне' },
              ].map((r) => (
                <li key={r.t} className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-good" />
                  <div>
                    <div className="text-[12.5px] font-semibold leading-tight">{r.t}</div>
                    <div className="text-[11px] leading-snug text-txt-lo">{r.d}</div>
                  </div>
                </li>
              ))}
            </ul>
            <PhoneMockup />
          </div>
        </Card>
      </section>

      {/* ================= Технология / Для кого ================= */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-[15px] font-bold uppercase tracking-tight text-sol-cyan">Технология</h2>
          <div className="mt-4 space-y-2.5">
            {[
              { icon: <SolanaMark size={15} />, t: 'Solana Blockchain', d: 'Все транзакции и смарт-контракты' },
              { icon: <Coins className="size-4 text-sol-cyan" />, t: 'USDC / SPL Tokens', d: 'Основной способ оплаты' },
              {
                icon: <Layers className="size-4 text-sol-violet" />,
                t: 'Metaplex / Token Extensions',
                d: 'Для создания и управления Creator Pass',
              },
              { icon: <Wallet className="size-4 text-sol-teal" />, t: 'Wallet Adapter', d: 'Подключение кошельков (Phantom, Backpack и др.)' },
              { icon: <Database className="size-4 text-txt-mid" />, t: 'On-chain Storage', d: 'Данные и права доступа хранятся on-chain' },
            ].map((r) => (
              <div key={r.t} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                  {r.icon}
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold">{r.t}</div>
                  <div className="text-[11.5px] leading-snug text-txt-lo">{r.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-[15px] font-bold uppercase tracking-tight text-sol-violet">Для кого?</h2>
          <div className="mt-4 space-y-2.5">
            {[
              { icon: <Sparkles className="size-4" />, t: 'Блогеры и авторы', d: 'Финансируйте свои идеи без посредников' },
              { icon: <Users className="size-4" />, t: 'Аудитория', d: 'Станьте частью создания контента, который любите' },
              { icon: <Gauge className="size-4" />, t: 'Команды и продакшены', d: 'Прозрачные выплаты и автоматизация' },
              { icon: <Building2 className="size-4" />, t: 'Бренды и партнёры', d: 'Поддерживайте проекты и получайте видимость' },
            ].map((r) => (
              <div key={r.t} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sol-purple/12 text-sol-violet">
                  {r.icon}
                </span>
                <div>
                  <div className="text-[12.5px] font-semibold">{r.t}</div>
                  <div className="text-[11.5px] leading-snug text-txt-lo">{r.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <div className="eyebrow">Модель дохода</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-3xl font-black sol-text">{PLATFORM_FEE_BPS / 100}%</span>
              <span className="text-[12px] text-txt-mid">комиссия с успешных кампаний</span>
            </div>
            <Link to="/transparency" className="mt-2 inline-flex items-center gap-1 text-[12px] text-sol-cyan hover:underline">
              Смотреть поток средств и он-чейн журнал
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </Card>
      </section>

      {/* ================= Продуктовая модель ================= */}
      <section className="mt-8">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold uppercase tracking-tight text-txt-hi">
              Продуктовая модель CoCreate
            </h2>
            <Badge tone="purple">Категория: SocialFi</Badge>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <WsBlock
              n="1"
              title="Пользователь и проблема"
              rows={[
                ['Кто сталкивается', 'Блогеры и авторы контента, которые хотят финансировать новые проекты за счёт своей аудитории.'],
                ['Когда возникает', 'Когда автор запускает фильм, серию контента или мерч и ему нужно собрать деньги до начала работы.'],
                ['Как решают сейчас', 'Донаты, переводы и сторонние краудфандинг-сервисы; сбор и контроль цели — вручную.'],
                ['Что не устраивает', 'Нет гарантии возврата при недостижении цели, есть посредники и комиссии, аудитории сложно проверить движение средств.'],
              ]}
            />
            <WsBlock
              n="2"
              title="Идея продукта"
              rows={[
                ['Главное действие', 'Создать проект с финансовой целью и поддержать его фиксированной суммой в SOL или USDC через Solana.'],
                ['Результат', 'Средства блокируются в смарт-контракте: цель достигнута — перевод автору, не достигнута — возврат участникам.'],
                ['Кто и за что платит', 'Аудитория платит за поддержку проекта; платформа получает 5% с успешно собранной суммы.'],
              ]}
            />
            <WsBlock
              n="3"
              title="Главное предположение"
              rows={[
                ['Риск', 'Аудитория готова не просто донатить, а финансировать проекты кампаниями с целью, где средства блокируются до её достижения.'],
                ['Как проверить', 'Тестовый лендинг с реальными концепциями: заявки и предварительная поддержка, конверсия, средний вклад, готовность платить в SOL/USDC.'],
              ]}
            />
          </div>

          <div className="mt-4 rounded-xl border border-sol-purple/25 bg-sol-purple/[0.06] p-4">
            <div className="eyebrow text-sol-violet">Короткое представление</div>
            <p className="mt-2 text-[13px] leading-relaxed text-txt-hi">
              Мы рассматриваем <span className="font-semibold">CoCreate</span> для блогеров и авторов контента,
              у которых есть проблема прозрачного финансирования проектов от аудитории. Solana может быть полезна
              благодаря быстрым и недорогим платежам и программируемым смарт-контрактам. В первую очередь нам
              необходимо проверить готовность аудитории финансировать проекты через такую модель.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ['Блокчейн полезен, когда', 'нужны прозрачные платежи, автоматические выплаты и возвраты по заданным правилам'],
              ['Программа Solana нужна для', 'приёма и программируемого управления платежами аудитории через смарт-контракт'],
              ['В идее нужно проверить', 'готовность аудитории финансировать проекты и платить в SOL / USDC'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <div className="text-[11.5px] font-semibold text-txt-hi">{t}</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-txt-mid">{d}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-8 overflow-hidden rounded-4xl border border-white/[0.08] bg-ink-850/60 p-7 text-center">
        <div className="text-2xl font-black tracking-tight sm:text-3xl">
          From followers to <span className="grad-text">co-creators.</span>
        </div>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-txt-mid">
          Продукт целиком проходится в демо-режиме: поддержка проекта, выпуск Pass, голосования, выплата
          команде и возврат средств.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button variant="solana" size="lg" icon={<Sparkles className="size-4" />}>
              Открыть проекты
            </Button>
          </Link>
          <Link to="/transparency">
            <Button variant="ghost" size="lg" icon={<Lock className="size-4" />}>
              Прозрачность и эскроу
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

function FlowBox({
  icon,
  title,
  body,
  accent,
}: {
  icon: React.ReactNode
  title: string
  body: string
  accent?: boolean
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-xl border border-sol-teal/25 bg-sol-teal/[0.06] p-3.5'
          : 'rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5'
      }
    >
      <span className="grid size-8 place-items-center rounded-lg border border-white/[0.09] bg-white/[0.04] text-sol-violet">
        {icon}
      </span>
      <div className="mt-2.5 text-[11px] font-bold uppercase tracking-wider text-txt-hi">{title}</div>
      <p className="mt-1.5 text-[11.5px] leading-snug text-txt-mid">{body}</p>
    </div>
  )
}

function StepCard({
  n,
  title,
  body,
  children,
}: {
  n: number
  title: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col rounded-xl2 border border-white/[0.07] bg-ink-850/60 p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full border border-sol-purple/40 bg-sol-purple/15 text-[10px] font-bold text-sol-violet">
          {n}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="mt-3">{children}</div>
      <p className="mt-3 text-[11px] leading-relaxed text-txt-mid">{body}</p>
    </div>
  )
}

function WsBlock({ n, title, rows }: { n: string; title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid size-5 place-items-center rounded-full bg-sol-grad text-[10px] font-black text-ink-950">
          {n}
        </span>
        <span className="text-[12.5px] font-semibold">{title}</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-txt-lo">{label}</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-txt-mid">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Мокап мобильного экрана проекта — как на карточке ТЗ. */
function PhoneMockup() {
  return (
    <div className="mx-auto w-[170px] shrink-0 rounded-[24px] border border-white/15 bg-ink-950 p-1.5 shadow-2xl">
      <div className="overflow-hidden rounded-[19px] bg-ink-900">
        <div className="flex items-center justify-between px-2.5 py-1 text-[7px] text-txt-lo">
          <span>9:41</span>
          <span>◉ ▮</span>
        </div>
        <div className="px-2 pb-2">
          <div className="text-[8px] font-semibold text-txt-mid">Проект</div>
          <div className="mt-1 overflow-hidden rounded-lg">
            <div className="relative aspect-[16/10]">
              <ProjectArt scene="mountains" id="phone-art" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-5 place-items-center rounded-full border border-white/30 bg-ink-950/50">
                  <Play className="size-2 fill-white text-white" />
                </span>
              </span>
            </div>
          </div>
          <div className="mt-1.5 text-[8px] font-semibold leading-tight">Узбекистан без фильтров</div>
          <div className="num mt-1 text-[11px] font-black">
            $7 450 <span className="text-[7px] font-medium text-txt-lo">из $20 000</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[37%] rounded-full bg-sol-grad" />
          </div>
          <div className="mt-1.5 rounded-md bg-sol-purple py-1 text-center text-[8px] font-semibold text-white">
            Поддержать
          </div>
          <div className="mt-1.5 text-[7px] text-txt-lo">Ваш Pass</div>
          <div
            className="mt-1 flex items-center gap-1 rounded-md border px-1.5 py-1"
            style={{ borderColor: TIERS.executive.ring, background: `${TIERS.executive.color}12` }}
          >
            <TierIcon tier="executive" className="size-2.5" />
            <span className="text-[7px] font-black uppercase" style={{ color: TIERS.executive.color }}>
              Executive supporter
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
