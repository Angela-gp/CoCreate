import type { TierKey } from './types'

export interface TierDef {
  key: TierKey
  name: string
  priceUsd: number
  /** вес голоса в голосованиях проекта */
  voteWeight: number
  short: string
  perks: string[]
  color: string
  ring: string
  glow: string
  icon: 'heart' | 'crown-pink' | 'crown-violet' | 'crown-green'
  order: number
}

/** Уровни поддержки (Creator Pass) — из ТЗ, «Уровни поддержки» на карточке. */
export const TIERS: Record<TierKey, TierDef> = {
  supporter: {
    key: 'supporter',
    name: 'Supporter',
    priceUsd: 5,
    voteWeight: 0,
    short: 'Доступ к backstage-контенту',
    perks: ['Доступ к backstage-контенту', 'Цифровой Pass в кошельке', 'Имя в списке поддержавших'],
    color: '#ff7ab8',
    ring: 'rgba(255,122,184,.5)',
    glow: '0 10px 34px -14px rgba(255,122,184,.55)',
    icon: 'heart',
    order: 1,
  },
  insider: {
    key: 'insider',
    name: 'Insider',
    priceUsd: 20,
    voteWeight: 1,
    short: 'Backstage + участие в голосованиях',
    perks: ['Всё из Supporter', 'Участие в голосованиях проекта', 'Ранний доступ к материалам'],
    color: '#c46bff',
    ring: 'rgba(196,107,255,.5)',
    glow: '0 10px 34px -14px rgba(196,107,255,.55)',
    icon: 'crown-pink',
    order: 2,
  },
  producer: {
    key: 'producer',
    name: 'Producer',
    priceUsd: 50,
    voteWeight: 3,
    short: 'Имя в титрах + закрытый контент',
    perks: ['Всё из Insider', 'Имя в титрах проекта', 'Закрытый контент и черновики', 'Голос с весом ×3'],
    color: '#7c6bff',
    ring: 'rgba(124,107,255,.5)',
    glow: '0 10px 34px -14px rgba(124,107,255,.55)',
    icon: 'crown-violet',
    order: 3,
  },
  executive: {
    key: 'executive',
    name: 'Executive',
    priceUsd: 100,
    voteWeight: 6,
    short: 'Всё выше + закрытый созвон + премьера',
    perks: [
      'Всё из Producer',
      'Участие в закрытом созвоне с автором',
      'Приглашение на премьеру',
      'Голос с весом ×6',
    ],
    color: '#14f195',
    ring: 'rgba(20,241,149,.5)',
    glow: '0 10px 34px -14px rgba(20,241,149,.55)',
    icon: 'crown-green',
    order: 4,
  },
}

export const TIER_ORDER: TierKey[] = ['supporter', 'insider', 'producer', 'executive']

/** Уровень Pass, который выдаётся за вклад: наибольший, чей порог покрыт суммой. */
export function tierForAmount(amountUsd: number): TierKey | null {
  let found: TierKey | null = null
  for (const key of TIER_ORDER) if (amountUsd >= TIERS[key].priceUsd) found = key
  return found
}

export function tierAtLeast(tier: TierKey | null, min: TierKey): boolean {
  if (!tier) return false
  return TIERS[tier].order >= TIERS[min].order
}

export function nextTier(tier: TierKey | null): TierDef | null {
  const order = tier ? TIERS[tier].order : 0
  const next = TIER_ORDER.find((k) => TIERS[k].order === order + 1)
  return next ? TIERS[next] : null
}
