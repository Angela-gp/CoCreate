import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Filter, Lock, Search, Sparkles, TrendingUp, Users } from 'lucide-react'
import type { ProjectCategory } from '../lib/types'
import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABEL } from '../lib/categories'
import { compactNum, relTime, usd, usdCompact } from '../lib/format'
import { cn, short } from '../lib/utils'
import { useLedger } from '../store/ledger'
import { raisedFor, backersFor, statsFor } from '../store/selectors'
import { ProjectCard } from '../components/project/ProjectCard'
import { Badge, Button, Segmented } from '../components/ui/primitives'
import { SolanaMark } from '../components/ui/art'
import { TIERS, TIER_ORDER } from '../lib/tiers'
import { SEED_PASS_STATS } from '../data/seed'

type StateFilter = 'all' | 'live' | 'successful' | 'closed'
type Sort = 'trending' | 'new' | 'ending' | 'goal'

export default function Feed() {
  const projects = useLedger((s) => s.projects)
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const txs = useLedger((s) => s.txs)

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<ProjectCategory | 'all'>('all')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')
  const [sort, setSort] = useState<Sort>('trending')

  const totals = useMemo(() => {
    const live = projects.filter((p) => p.state === 'live')
    const locked = live.reduce((a, p) => a + raisedFor(p, contributions), 0)
    const allRaised = projects.reduce((a, p) => a + raisedFor(p, contributions), 0)
    const backers = projects.reduce((a, p) => a + backersFor(p, contributions), 0)
    const issued = Object.values(SEED_PASS_STATS).reduce((a, b) => a + b, 0) + passes.length
    return { live: live.length, locked, allRaised, backers, issued }
  }, [projects, contributions, passes])

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false
      if (stateFilter === 'live' && p.state !== 'live') return false
      if (stateFilter === 'successful' && !(p.state === 'successful' || p.state === 'claimed')) return false
      if (stateFilter === 'closed' && !(p.state === 'failed' || p.state === 'refunded')) return false
      if (q.trim()) {
        const needle = q.trim().toLowerCase()
        const haystack = `${p.title} ${p.tagline} ${p.creator.name} ${p.creator.handle}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'new') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'ending') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      if (sort === 'goal') return b.goalUsd - a.goalUsd
      const pa = statsFor(a, contributions, passes, null).pctFunded
      const pb = statsFor(b, contributions, passes, null).pctFunded
      return pb - pa
    })
    return list
  }, [projects, cat, stateFilter, q, sort, contributions, passes])

  const featured = projects.find((p) => p.featured) ?? projects[0]
  const recent = txs.filter((t) => t.kind === 'contribute' && (t.amountUsd ?? 0) > 0).slice(0, 8)

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
      {/* --- Шапка приложения ------------------------------------------------ */}
      <section className="relative overflow-hidden rounded-4xl border border-white/[0.07] bg-ink-850/60 p-5 sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-glow-radial opacity-70" />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-[0.35]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="purple" icon={<SolanaMark size={11} />}>
              100% на Solana
            </Badge>
            <Badge tone="cyan">Быстрые транзакции</Badge>
            <Badge tone="live">Низкие комиссии</Badge>
            <Badge tone="neutral">Прозрачность и доверие</Badge>
          </div>

          <h1 className="mt-4 max-w-2xl text-2xl font-black leading-[1.12] tracking-tight sm:text-[34px]">
            Не просто смотреть контент.
            <br />
            <span className="grad-text">Стать частью его создания.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-txt-mid">
            Блогер ставит цель по сбору, аудитория поддерживает проект донатами. Средства блокируются в
            смарт-контракте Solana: цель достигнута — автоматический перевод автору, не достигнута — возврат
            участникам.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <HeroStat
              icon={<Lock className="size-3.5" />}
              label="Заблокировано в эскроу"
              value={usdCompact(totals.locked)}
              tone="cyan"
            />
            <HeroStat
              icon={<TrendingUp className="size-3.5" />}
              label="Собрано всего"
              value={usdCompact(totals.allRaised)}
              tone="good"
            />
            <HeroStat
              icon={<Users className="size-3.5" />}
              label="Со-создателей"
              value={compactNum(totals.backers)}
            />
            <HeroStat
              icon={<Sparkles className="size-3.5" />}
              label="Creator Pass выпущено"
              value={compactNum(totals.issued)}
              tone="purple"
            />
          </div>
        </div>
      </section>

      {/* --- Лента активности ------------------------------------------------ */}
      {recent.length > 0 && (
        <section className="mt-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850/40">
          <div className="hide-scroll flex items-center gap-3 overflow-x-auto px-4 py-2.5">
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sol-teal">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-sol-teal opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-sol-teal" />
              </span>
              Live
            </span>
            {recent.map((t) => {
              const p = projects.find((x) => x.id === t.projectId)
              return (
                <Link
                  key={t.signature}
                  to={p ? `/p/${p.slug}` : '/'}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11.5px] text-txt-mid transition hover:border-white/15 hover:text-txt-hi"
                >
                  <span className="num font-semibold text-txt-hi">{usd(t.amountUsd ?? 0)}</span>
                  <span className="text-txt-lo">→</span>
                  <span className="max-w-[150px] truncate">{p?.title ?? 'проект'}</span>
                  <span className="num text-txt-lo">{short(t.wallet, 3)}</span>
                  <span className="text-txt-lo">· {relTime(t.ts)}</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* --- Витрина ---------------------------------------------------------- */}
      {featured && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Sparkles className="size-4 text-sol-violet" />
              Проект недели
            </h2>
            <Link to={`/p/${featured.slug}`} className="text-[12.5px] text-txt-mid hover:text-txt-hi">
              Подробнее <ArrowRight className="inline size-3" />
            </Link>
          </div>
          <ProjectCard project={featured} wide />
        </section>
      )}

      {/* --- Уровни ----------------------------------------------------------- */}
      <section className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {TIER_ORDER.map((key) => {
          const t = TIERS[key]
          return (
            <div
              key={key}
              className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 transition hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold" style={{ color: t.color }}>
                  {t.name}
                </span>
                <span className="num text-[13px] font-bold">{usd(t.priceUsd)}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-snug text-txt-mid">{t.short}</p>
              <div className="num mt-2 text-[10.5px] text-txt-lo">
                выпущено {compactNum(SEED_PASS_STATS[key] ?? 0)}
              </div>
            </div>
          )
        })}
      </section>

      {/* --- Фильтры ---------------------------------------------------------- */}
      <section className="mt-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-txt-lo" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Поиск по проектам и авторам"
              className="w-full pl-10"
            />
          </div>
          <div className="hide-scroll flex items-center gap-2 overflow-x-auto">
            <Segmented
              value={stateFilter}
              onChange={setStateFilter}
              options={[
                { value: 'all', label: 'Все' },
                { value: 'live', label: 'Идёт сбор' },
                { value: 'successful', label: 'Успешные' },
                { value: 'closed', label: 'Закрытые' },
              ]}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-[42px] shrink-0"
              aria-label="Сортировка"
            >
              <option value="trending">Популярные</option>
              <option value="new">Новые</option>
              <option value="ending">Скоро дедлайн</option>
              <option value="goal">Крупная цель</option>
            </select>
          </div>
        </div>

        <div className="hide-scroll mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          <CatChip active={cat === 'all'} onClick={() => setCat('all')} label="Все категории" icon="✳️" />
          {CATEGORIES.map((c) => (
            <CatChip
              key={c}
              active={cat === c}
              onClick={() => setCat(c)}
              label={CATEGORY_LABEL[c]}
              icon={CATEGORY_EMOJI[c]}
            />
          ))}
        </div>
      </section>

      {/* --- Сетка проектов --------------------------------------------------- */}
      <section className="mt-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl2 border border-dashed border-white/10 py-14 text-center">
            <Filter className="mb-3 size-5 text-txt-lo" />
            <p className="text-sm font-semibold">Ничего не найдено</p>
            <p className="mt-1 text-[12.5px] text-txt-mid">Измените фильтры или создайте свой проект.</p>
            <Link to="/create" className="mt-4">
              <Button variant="solana" size="md">
                Создать проект
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function HeroStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone?: 'cyan' | 'good' | 'purple'
}) {
  const toneCls =
    tone === 'cyan' ? 'text-sol-cyan' : tone === 'good' ? 'text-good' : tone === 'purple' ? 'text-sol-violet' : 'text-txt-hi'
  return (
    <div className="rounded-xl border border-white/[0.07] bg-ink-900/60 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-txt-lo">
        <span className={toneCls}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('num mt-1.5 text-xl font-black leading-none', toneCls)}>{value}</div>
    </div>
  )
}

function CatChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition',
        active
          ? 'border-sol-purple/45 bg-sol-purple/15 text-txt-hi'
          : 'border-white/[0.08] bg-white/[0.02] text-txt-mid hover:border-white/15 hover:text-txt-hi',
      )}
    >
      <span className="text-[13px] leading-none">{icon}</span>
      {label}
    </button>
  )
}
