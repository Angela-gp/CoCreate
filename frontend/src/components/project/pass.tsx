import { Crown, Heart, ShieldCheck } from 'lucide-react'
import type { CreatorPass, TierKey } from '../../lib/types'
import { TIERS } from '../../lib/tiers'
import { cn, short } from '../../lib/utils'
import { usd, dateRu } from '../../lib/format'
import { CopyButton } from '../ui/primitives'
import { SolanaMark } from '../ui/art'

export function TierIcon({ tier, className }: { tier: TierKey; className?: string }) {
  const def = TIERS[tier]
  const Icon = def.icon === 'heart' ? Heart : Crown
  return <Icon className={cn('size-3.5', className)} style={{ color: def.color }} strokeWidth={2.4} />
}

export function TierBadge({ tier, className }: { tier: TierKey; className?: string }) {
  const def = TIERS[tier]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        className,
      )}
      style={{ borderColor: def.ring, background: `${def.color}14`, color: def.color }}
    >
      <TierIcon tier={tier} />
      {def.name}
    </span>
  )
}

/** Цифровой Creator Pass — как на карточке ТЗ: уровень, вклад, mint-адрес. */
export function PassCard({
  pass,
  compact,
  className,
}: {
  pass: CreatorPass
  compact?: boolean
  className?: string
}) {
  const def = TIERS[pass.tier]
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl2 border p-4 transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
      style={{
        borderColor: def.ring,
        background: `radial-gradient(120% 120% at 8% 0%, ${def.color}30 0%, rgba(9,9,16,.94) 58%), #0a0a12`,
        boxShadow: def.glow,
      }}
    >
      <div
        className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/3 -skew-x-12 bg-white/[0.07] opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <TierIcon tier={pass.tier} className="size-4" />
            <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: def.color }}>
              {def.name} supporter
            </span>
            <ShieldCheck className="size-3.5 text-sol-cyan" />
          </div>
          <div className="mt-2 truncate text-[15px] font-semibold text-txt-hi">{pass.projectTitle}</div>
        </div>
        <SolanaMark size={22} className="mt-1 opacity-80" />
      </div>

      {!compact && (
        <div className="relative mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-txt-lo">Уровень</div>
            <div className="num mt-0.5 text-sm font-bold" style={{ color: def.color }}>
              {def.name}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-txt-lo">Вклад</div>
            <div className="num mt-0.5 text-sm font-bold text-txt-hi">{usd(pass.contributedUsd)}</div>
          </div>
        </div>
      )}

      <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.12em] text-txt-lo">Mint</div>
          <div className="num flex items-center gap-1 text-[11px] text-txt-mid">
            {short(pass.mint, 6)}
            <CopyButton text={pass.mint} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.12em] text-txt-lo">Выпущен</div>
          <div className="text-[11px] text-txt-mid">{dateRu(pass.issuedAt)}</div>
        </div>
      </div>
    </div>
  )
}

/** Карточка уровня в выборе суммы поддержки. */
export function TierOption({
  tier,
  selected,
  onSelect,
  disabled,
  currentTier,
}: {
  tier: TierKey
  selected: boolean
  onSelect: () => void
  disabled?: boolean
  currentTier?: TierKey | null
}) {
  const def = TIERS[tier]
  const owned = currentTier === tier
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all duration-200',
        selected ? 'bg-white/[0.06]' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.045]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      style={selected ? { borderColor: def.ring, boxShadow: `0 0 0 1px ${def.ring}` } : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="grid size-7 place-items-center rounded-lg"
            style={{ background: `${def.color}1f`, border: `1px solid ${def.color}40` }}
          >
            <TierIcon tier={tier} />
          </span>
          <span className="text-[13px] font-semibold" style={{ color: selected ? def.color : undefined }}>
            {def.name}
          </span>
          {owned && (
            <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-txt-mid">
              у вас
            </span>
          )}
        </div>
        <span className="num text-sm font-bold">{usd(def.priceUsd)}</span>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-txt-mid">{def.short}</p>
      {def.voteWeight > 0 && (
        <p className="mt-1 text-[11px] text-txt-lo">Вес голоса ×{def.voteWeight}</p>
      )}
    </button>
  )
}
