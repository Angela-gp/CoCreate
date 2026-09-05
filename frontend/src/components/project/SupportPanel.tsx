import { useMemo, useState } from 'react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Check, EyeOff, Lock, ShieldCheck, Wallet } from 'lucide-react'
import type { Currency, Project, TierKey } from '../../lib/types'
import { TIERS, TIER_ORDER, nextTier, tierForAmount } from '../../lib/tiers'
import { SOL_USD, usd, usdToSol } from '../../lib/format'
import { cn } from '../../lib/utils'
import { useWalletCtx } from '../../hooks/useWalletCtx'
import { useActions } from '../../hooks/useActions'
import { Badge, Button, Segmented } from '../ui/primitives'
import { SolanaMark } from '../ui/art'
import { TierIcon, TierOption } from './pass'

const PRESETS = [5, 20, 50, 100]

export function SupportPanel({
  project,
  myTier,
  onDone,
  compact,
}: {
  project: Project
  myTier: TierKey | null
  onDone?: () => void
  compact?: boolean
}) {
  const { connected, cluster, balance } = useWalletCtx()
  const { setVisible } = useWalletModal()
  const { support } = useActions()

  const [amount, setAmount] = useState<number>(20)
  const [custom, setCustom] = useState('')
  const [currency, setCurrency] = useState<Currency>(project.currency)
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)

  const effective = custom ? Math.max(0, Number(custom.replace(',', '.')) || 0) : amount
  const tier = tierForAmount(effective)
  const upcoming = nextTier(tier)
  const closed = project.state !== 'live'
  const enough =
    cluster === 'devnet' ? true : currency === 'USDC' ? balance.usdc >= effective : balance.sol >= usdToSol(effective)

  const gapToNext = useMemo(
    () => (upcoming ? Math.max(0, upcoming.priceUsd - effective) : 0),
    [upcoming, effective],
  )

  const go = async () => {
    if (!connected) {
      setVisible(true)
      return
    }
    setBusy(true)
    try {
      await support(project, effective, currency, anonymous)
      onDone?.()
    } catch {
      /* ошибки показываются в оверлее транзакции */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Поддержать проект</h3>
          <Badge tone="purple" icon={<SolanaMark size={10} />}>
            через Solana
          </Badge>
        </div>
      )}

      {/* Сумма */}
      <div>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((v) => (
            <button
              key={v}
              onClick={() => {
                setAmount(v)
                setCustom('')
              }}
              disabled={closed}
              className={cn(
                'num rounded-xl border py-2.5 text-[14px] font-bold transition disabled:opacity-40',
                !custom && amount === v
                  ? 'border-sol-purple/50 bg-sol-purple/15 text-txt-hi'
                  : 'border-white/[0.08] bg-white/[0.02] text-txt-mid hover:border-white/20 hover:text-txt-hi',
              )}
            >
              ${v}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-txt-lo">
              $
            </span>
            <input
              value={custom}
              inputMode="decimal"
              disabled={closed}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="Своя сумма"
              className="w-full pl-7 num"
            />
          </div>
          <Segmented
            value={currency}
            onChange={setCurrency}
            options={[
              { value: 'USDC', label: 'USDC' },
              { value: 'SOL', label: 'SOL' },
            ]}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-txt-lo">
          <span className="num">
            {currency === 'SOL'
              ? `≈ ${usdToSol(effective).toFixed(4)} SOL по курсу $${SOL_USD}`
              : `${effective.toFixed(2)} USDC`}
          </span>
          <span className="num">
            баланс:{' '}
            {cluster === 'devnet'
              ? `${balance.sol.toFixed(3)} SOL`
              : currency === 'USDC'
                ? `${balance.usdc.toFixed(2)} USDC`
                : `${balance.sol.toFixed(3)} SOL`}
          </span>
        </div>
      </div>

      {/* Уровни */}
      <div className="space-y-1.5">
        {TIER_ORDER.map((key) => (
          <TierOption
            key={key}
            tier={key}
            selected={tier === key}
            currentTier={myTier}
            disabled={closed}
            onSelect={() => {
              setCustom('')
              setAmount(TIERS[key].priceUsd)
            }}
          />
        ))}
      </div>

      {/* Что получит участник */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5">
        {tier ? (
          <>
            <div className="flex items-center gap-2">
              <TierIcon tier={tier} className="size-4" />
              <span className="text-[13px] font-semibold" style={{ color: TIERS[tier].color }}>
                Creator Pass · {TIERS[tier].name}
              </span>
            </div>
            <ul className="mt-2.5 space-y-1.5">
              {TIERS[tier].perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-[12.5px] text-txt-mid">
                  <Check className="mt-0.5 size-3 shrink-0 text-good" strokeWidth={3} />
                  {perk}
                </li>
              ))}
            </ul>
            {upcoming && gapToNext > 0 && (
              <button
                onClick={() => {
                  setCustom('')
                  setAmount(upcoming.priceUsd)
                }}
                className="mt-3 w-full rounded-lg border border-dashed border-white/15 px-3 py-2 text-left text-[11.5px] text-txt-lo transition hover:border-white/30 hover:text-txt-mid"
              >
                +{usd(gapToNext)} до уровня{' '}
                <span className="font-semibold" style={{ color: upcoming.color }}>
                  {upcoming.name}
                </span>
                : {upcoming.short.toLowerCase()}
              </button>
            )}
          </>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-txt-mid">
            Минимальный вклад для получения Creator Pass — <span className="num font-semibold">$5</span>. Меньшая
            сумма учитывается в сборе, но без уровня доступа.
          </p>
        )}
      </div>

      {/* Эскроу-примечание */}
      <div className="flex gap-2.5 rounded-xl border border-sol-cyan/20 bg-sol-cyan/[0.05] p-3">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-sol-cyan" />
        <p className="text-[11.5px] leading-relaxed text-txt-mid">
          Средства блокируются в смарт-контракте до достижения цели. Если цель не достигнута к{' '}
          {new Date(project.deadline).toLocaleDateString('ru-RU')} — вклад можно вернуть себе самому, без участия
          автора и платформы.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-txt-mid">
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="size-4 accent-[#9945ff]"
        />
        <EyeOff className="size-3.5" />
        Не показывать мой адрес в списке поддержавших
      </label>

      <Button
        variant="solana"
        size="lg"
        full
        loading={busy}
        disabled={closed || effective <= 0 || (!enough && connected)}
        onClick={go}
        icon={connected ? <SolanaMark size={15} className="brightness-0" /> : <Wallet className="size-4" />}
      >
        {closed
          ? 'Сбор закрыт'
          : !connected
            ? 'Подключить кошелёк'
            : !enough
              ? 'Недостаточно средств'
              : `Поддержать на ${usd(effective)}`}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-txt-lo">
        <ShieldCheck className="size-3" />
        {cluster === 'devnet'
          ? 'Devnet: транзакция уйдёт в реальный кластер Solana'
          : 'Simnet: транзакция симулируется локально'}
      </div>
    </div>
  )
}
