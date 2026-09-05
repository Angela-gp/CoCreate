import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Coins,
  Gift,
  Landmark,
  Lock,
  MessageSquare,
  Package,
  Percent,
  Receipt,
  Users,
} from 'lucide-react'
import type { TxKind } from '../lib/types'
import { PLATFORM_FEE_BPS, PLATFORM_TREASURY, txKindLabel, useLedger } from '../store/ledger'
import { platformVolume, raisedFor } from '../store/selectors'
import { usd, usdCompact } from '../lib/format'
import { cn } from '../lib/utils'
import { AddressChip, Badge, Card, SectionTitle, Segmented, Stat } from '../components/ui/primitives'
import { TxList } from '../components/project/escrow'
import { DemoTools } from '../components/layout/DemoTools'
import { SolanaMark } from '../components/ui/art'

const FILTERS: { value: TxKind | 'all'; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'contribute', label: 'Вклады' },
  { value: 'payout', label: 'Выплаты' },
  { value: 'refund', label: 'Возвраты' },
  { value: 'platform_fee', label: 'Комиссия' },
  { value: 'vote', label: 'Голоса' },
]

export default function Transparency() {
  const projects = useLedger((s) => s.projects)
  const contributions = useLedger((s) => s.contributions)
  const txs = useLedger((s) => s.txs)
  const treasuryUsd = useLedger((s) => s.treasuryUsd)
  const cluster = useLedger((s) => s.cluster)
  const [filter, setFilter] = useState<TxKind | 'all'>('all')

  const vol = useMemo(() => platformVolume(txs), [txs])
  const locked = useMemo(
    () =>
      projects
        .filter((p) => p.state === 'live' || p.state === 'successful')
        .reduce((a, p) => a + raisedFor(p, contributions), 0),
    [projects, contributions],
  )
  const paidOut = useMemo(
    () => txs.filter((t) => t.kind === 'payout').reduce((a, t) => a + (t.amountUsd ?? 0), 0),
    [txs],
  )
  const filtered = useMemo(
    () => (filter === 'all' ? txs : txs.filter((t) => t.kind === filter)),
    [txs, filter],
  )

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
      <SectionTitle
        eyebrow="Прозрачность"
        title="Все платежи проходят через Solana"
        hint="Движение средств, выплаты и комиссия платформы видны в блокчейне — без скрытых операций"
        right={
          <Badge tone="cyan" icon={<SolanaMark size={11} />}>
            кластер {cluster === 'devnet' ? 'devnet' : 'simnet'}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        <Stat label="Оборот платежей" value={usdCompact(vol.gross)} tone="cyan" sub="вклады, донаты, товары" />
        <Stat label="В эскроу сейчас" value={usdCompact(locked)} tone="purple" sub="ожидают исполнения условий" />
        <Stat label="Выплачено" value={usdCompact(paidOut)} tone="good" sub="авторам, командам, партнёрам" />
        <Stat label="Возвращено" value={usdCompact(vol.refunded)} sub="по несостоявшимся кампаниям" />
        <Stat label="Доход платформы" value={usdCompact(Math.max(treasuryUsd, vol.fees))} sub="5% с успешных сборов" />
      </div>

      {/* --- Поток средств ---------------------------------------------------- */}
      <Card className="mt-6">
        <SectionTitle
          title="Поток средств"
          hint="Любой платёж входит в смарт-контракт и выходит по зашитым правилам"
        />
        <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-2">
            {[
              { icon: <Coins className="size-3.5" />, label: 'Поддержка проекта', hint: 'USDC / SOL' },
              { icon: <Gift className="size-3.5" />, label: 'Донаты во время стримов', hint: 'мгновенно' },
              { icon: <Package className="size-3.5" />, label: 'Покупки: мерч и цифровые товары', hint: 'оплата on-chain' },
              { icon: <MessageSquare className="size-3.5" />, label: 'Платные сообщения', hint: 'от $1' },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-2.5 rounded-xl border border-sol-cyan/20 bg-sol-cyan/[0.045] px-3.5 py-2.5"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sol-cyan/12 text-sol-cyan">
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{r.label}</span>
                <span className="hidden shrink-0 text-[10.5px] text-txt-lo sm:inline">{r.hint}</span>
                <ArrowRight className="hidden size-3.5 shrink-0 text-txt-lo lg:block" />
              </div>
            ))}
          </div>

          <div className="mx-auto w-full max-w-[220px] rounded-2xl border border-white/[0.1] bg-ink-800/80 p-4 text-center">
            <SolanaMark size={34} className="mx-auto" />
            <div className="mt-2.5 text-[13px] font-bold">Solana</div>
            <div className="text-[11px] uppercase tracking-wider text-txt-lo">смарт-контракты</div>
            <div className="mt-3 space-y-1 text-[10.5px] text-txt-mid">
              <div>эскроу и условия</div>
              <div>автоматическое распределение</div>
              <div>проверяемая история</div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { icon: <Users className="size-3.5" />, label: 'Блогер', hint: 'основная доля' },
              { icon: <Users className="size-3.5" />, label: 'Команда проекта', hint: 'по долям' },
              { icon: <Landmark className="size-3.5" />, label: 'Партнёры', hint: 'по договорённости' },
              { icon: <Percent className="size-3.5" />, label: 'Платформа', hint: `${PLATFORM_FEE_BPS / 100}%` },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-center gap-2.5 rounded-xl border border-sol-teal/20 bg-sol-teal/[0.045] px-3.5 py-2.5"
              >
                <ArrowRight className="hidden size-3.5 shrink-0 text-txt-lo lg:block" />
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sol-teal/12 text-sol-teal">
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{r.label}</span>
                <span className="hidden shrink-0 text-[10.5px] text-txt-lo sm:inline">{r.hint}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-3.5 text-[11.5px] text-txt-lo">
          <span>Прозрачно</span>
          <span>•</span>
          <span>Автоматически</span>
          <span>•</span>
          <span>Без посредников</span>
          <span className="ml-auto flex items-center gap-1.5">
            Treasury платформы: <AddressChip address={PLATFORM_TREASURY} cluster={cluster} size={5} />
          </span>
        </div>
      </Card>

      {/* --- Модель дохода ---------------------------------------------------- */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-glow-radial opacity-60" />
          <div className="relative">
            <div className="eyebrow">Модель дохода платформы</div>
            <div className="mt-3 rounded-2xl border border-white/[0.08] bg-ink-900/60 p-5 text-center">
              <div className="text-[12.5px] text-txt-mid">Комиссия с успешных кампаний</div>
              <div className="num mt-1.5 text-5xl font-black sol-text">{PLATFORM_FEE_BPS / 100}%</div>
              <div className="mt-1.5 text-[12px] text-txt-lo">от собранной суммы</div>
            </div>
            <ul className="mt-4 space-y-2 text-[12.5px] text-txt-mid">
              {['Без скрытых платежей', 'Честная и прозрачная модель', 'Рост вместе с создателями'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-4 place-items-center rounded-full bg-good/15 text-[9px] font-bold text-good">
                    ✓
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-txt-lo">
              Если кампания не достигла цели, комиссия не берётся: участники получают вклад полностью.
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle title="Что происходит on-chain, а что off-chain" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-sol-purple/25 bg-sol-purple/[0.05] p-3.5">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-sol-violet">
                <Lock className="size-3.5" />
                On-chain
              </div>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-txt-mid">
                <li>• Создание кампании, цель и дедлайн</li>
                <li>• Приём платежей в SOL / USDC</li>
                <li>• Блокировка средств в PDA-хранилище</li>
                <li>• Проверка достижения цели</li>
                <li>• Автоматическая выплата или возврат</li>
                <li>• Выпуск Creator Pass и запись голосов</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <div className="flex items-center gap-2 text-[12.5px] font-semibold text-txt-hi">
                <Receipt className="size-3.5" />
                Off-chain
              </div>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-txt-mid">
                <li>• Страницы проектов, описания и видео</li>
                <li>• Модерация и поддержка</li>
                <li>• Аналитика и рекомендации</li>
                <li>• Коммуникация с аудиторией</li>
                <li>• Контент и его хранение</li>
                <li>• Управление командой проекта</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-txt-lo">
            В блокчейне — только то, что требует гарантий и проверяемости. Всё остальное быстрее и дешевле
            держать вне сети.
          </p>
        </Card>
      </div>

      <div className="mt-6">
        <DemoTools />
      </div>

      {/* --- Журнал ----------------------------------------------------------- */}
      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="eyebrow">Он-чейн журнал</div>
            <h2 className="mt-1 text-lg font-semibold">История транзакций платформы</h2>
          </div>
          <div className="hide-scroll max-w-full overflow-x-auto">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </div>
        </div>
        <TxList txs={filtered} projects={projects} limit={80} showProject emptyHint="Транзакций такого типа пока нет" />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-txt-lo">
          {(Object.keys(txKindLabel) as TxKind[]).map((k) => {
            const count = txs.filter((t) => t.kind === k).length
            if (!count) return null
            return (
              <span key={k} className={cn('num', filter === k && 'text-txt-mid')}>
                {txKindLabel[k]}: {count}
              </span>
            )
          })}
        </div>
      </Card>

      <p className="mt-5 text-center text-[11.5px] text-txt-lo">
        Суммы отображаются в долларовом эквиваленте. Реальные переводы идут в{' '}
        <span className="num">USDC</span> или <span className="num">SOL</span> — валюту выбирает автор кампании.
      </p>
    </div>
  )
}
