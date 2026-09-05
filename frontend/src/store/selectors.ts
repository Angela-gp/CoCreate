import type { Contribution, CreatorPass, OnchainTx, Poll, Project, TierKey, Vote } from '../lib/types'
import { TIERS, tierAtLeast } from '../lib/tiers'
import { PLATFORM_FEE_BPS } from './ledger'

export interface ProjectStats {
  raisedUsd: number
  backers: number
  pctFunded: number
  feeUsd: number
  netUsd: number
  myContributionUsd: number
  myTier: TierKey | null
  isOver: boolean
}

export function raisedFor(project: Project, contributions: Contribution[]) {
  return (
    project.seedRaisedUsd +
    contributions
      .filter((c) => c.projectId === project.id && !c.refunded)
      .reduce((a, c) => a + c.amountUsd, 0)
  )
}

export function backersFor(project: Project, contributions: Contribution[]) {
  const wallets = new Set(
    contributions.filter((c) => c.projectId === project.id && !c.refunded).map((c) => c.wallet),
  )
  return project.seedBackers + wallets.size
}

export function statsFor(
  project: Project,
  contributions: Contribution[],
  passes: CreatorPass[],
  wallet: string | null,
): ProjectStats {
  const raisedUsd = raisedFor(project, contributions)
  const myContributionUsd = wallet
    ? contributions
        .filter((c) => c.projectId === project.id && c.wallet === wallet && !c.refunded)
        .reduce((a, c) => a + c.amountUsd, 0)
    : 0
  const myTier = wallet
    ? (passes.find((p) => p.projectId === project.id && p.wallet === wallet)?.tier ?? null)
    : null
  const feeUsd = (raisedUsd * PLATFORM_FEE_BPS) / 10_000
  return {
    raisedUsd,
    backers: backersFor(project, contributions),
    pctFunded: project.goalUsd ? (raisedUsd / project.goalUsd) * 100 : 0,
    feeUsd,
    netUsd: raisedUsd - feeUsd,
    myContributionUsd,
    myTier,
    isOver: new Date(project.deadline).getTime() <= Date.now(),
  }
}

export interface PollResult {
  optionId: string
  label: string
  hint?: string
  weight: number
  voters: number
  pct: number
  leading: boolean
}

export function pollResults(poll: Poll, votes: Vote[]): { results: PollResult[]; totalWeight: number } {
  const mine = votes.filter((v) => v.pollId === poll.id)
  const totalWeight = mine.reduce((a, v) => a + v.weight, 0)
  const max = Math.max(
    0,
    ...poll.options.map((o) => mine.filter((v) => v.optionId === o.id).reduce((a, v) => a + v.weight, 0)),
  )
  const results = poll.options.map((o) => {
    const forOption = mine.filter((v) => v.optionId === o.id)
    const weight = forOption.reduce((a, v) => a + v.weight, 0)
    return {
      optionId: o.id,
      label: o.label,
      hint: o.hint,
      weight,
      voters: forOption.length,
      pct: totalWeight ? (weight / totalWeight) * 100 : 0,
      leading: weight > 0 && weight === max,
    }
  })
  return { results, totalWeight }
}

/** Список поддержавших строится из он-чейн истории — как в реальном эксплорере. */
export interface BackerRow {
  wallet: string
  amountUsd: number
  ts: string
  signature: string
  tier: TierKey | null
}

export function backerRows(projectId: string, txs: OnchainTx[], limit = 40): BackerRow[] {
  const rows = txs
    .filter((t) => t.projectId === projectId && t.kind === 'contribute' && (t.amountUsd ?? 0) > 0)
    .map((t) => {
      const amount = t.amountUsd ?? 0
      let tier: TierKey | null = null
      for (const key of Object.keys(TIERS) as TierKey[]) {
        if (amount >= TIERS[key].priceUsd && (!tier || TIERS[key].order > TIERS[tier].order)) tier = key
      }
      return { wallet: t.wallet, amountUsd: amount, ts: t.ts, signature: t.signature, tier }
    })
  return rows.slice(0, limit)
}

export function canAccess(post: { minTier: TierKey }, myTier: TierKey | null) {
  return tierAtLeast(myTier, post.minTier)
}

/** Суточная динамика сбора по проекту — для графика в кабинете автора. */
export function dailyRaised(projectId: string, txs: OnchainTx[], days = 14) {
  const buckets: { date: string; usd: number }[] = []
  const dayMs = 86_400_000
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * dayMs)
    buckets.push({ date: d.toISOString().slice(0, 10), usd: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.date, i]))
  for (const t of txs) {
    if (t.projectId !== projectId || t.kind !== 'contribute') continue
    const key = t.ts.slice(0, 10)
    const i = index.get(key)
    if (i !== undefined) buckets[i].usd += t.amountUsd ?? 0
  }
  return buckets
}

export function platformVolume(txs: OnchainTx[]) {
  const contributed = txs
    .filter((t) => t.kind === 'contribute')
    .reduce((a, t) => a + (t.amountUsd ?? 0), 0)
  const extras = txs
    .filter((t) => t.kind === 'message' || t.kind === 'merch')
    .reduce((a, t) => a + (t.amountUsd ?? 0), 0)
  const refunded = txs.filter((t) => t.kind === 'refund').reduce((a, t) => a + (t.amountUsd ?? 0), 0)
  const fees = txs.filter((t) => t.kind === 'platform_fee').reduce((a, t) => a + (t.amountUsd ?? 0), 0)
  return { contributed, extras, refunded, fees, gross: contributed + extras }
}

export const projectBySlug = (projects: Project[], slug: string) =>
  projects.find((p) => p.slug === slug || p.id === slug)

export const stateMeta: Record<
  Project['state'],
  { label: string; tone: 'live' | 'good' | 'bad' | 'muted'; hint: string }
> = {
  live: {
    label: 'Идёт сбор',
    tone: 'live',
    hint: 'Средства заблокированы в смарт-контракте до достижения цели',
  },
  successful: {
    label: 'Цель достигнута',
    tone: 'good',
    hint: 'Смарт-контракт разблокировал средства — доступна выплата',
  },
  claimed: { label: 'Выплачено', tone: 'good', hint: 'Средства переведены блогеру и команде проекта' },
  failed: {
    label: 'Цель не достигнута',
    tone: 'bad',
    hint: 'Смарт-контракт открыл возврат: участники забирают свои средства',
  },
  refunded: { label: 'Средства возвращены', tone: 'muted', hint: 'Все вклады возвращены участникам' },
}
