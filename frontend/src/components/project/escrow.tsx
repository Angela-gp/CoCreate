import { useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  Ban,
  CheckCircle2,
  Coins,
  Landmark,
  Lock,
  PartyPopper,
  Users,
  Zap,
} from 'lucide-react'
import type { OnchainTx, Project } from '../../lib/types'
import { PLATFORM_FEE_BPS, PLATFORM_TREASURY, txKindLabel, useLedger } from '../../store/ledger'
import { statsFor, stateMeta } from '../../store/selectors'
import { usd, usdCompact, relTime, dateRu } from '../../lib/format'
import { cn, explorerUrl, short } from '../../lib/utils'
import { useWalletCtx } from '../../hooks/useWalletCtx'
import { useActions } from '../../hooks/useActions'
import { AddressChip, Badge, Button, Progress } from '../ui/primitives'
import { SolanaMark } from '../ui/art'

/** Состояние эскроу кампании + действия смарт-контракта (выплата / возврат). */
export function EscrowCard({ project }: { project: Project }) {
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const { address, cluster } = useWalletCtx()
  const { settle, refund } = useActions()
  const stats = statsFor(project, contributions, passes, address)
  const meta = stateMeta[project.state]
  const [busy, setBusy] = useState<'settle' | 'refund' | null>(null)

  const myRefundable =
    project.state === 'failed' && address
      ? contributions
          .filter((c) => c.projectId === project.id && c.wallet === address && !c.refunded)
          .reduce((a, c) => a + c.amountUsd, 0)
      : 0

  const stage =
    project.state === 'live'
      ? 0
      : project.state === 'successful'
        ? 1
        : project.state === 'claimed'
          ? 2
          : 3

  return (
    <div className="panel overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
        <div className="flex items-center gap-2">
          <Lock className="size-3.5 text-sol-cyan" />
          <span className="text-[13px] font-semibold">Эскроу смарт-контракта</span>
        </div>
        <Badge
          tone={meta.tone === 'live' ? 'live' : meta.tone === 'good' ? 'good' : meta.tone === 'bad' ? 'bad' : 'neutral'}
        >
          {meta.label}
        </Badge>
      </div>

      <div className="px-4 py-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <MiniStat label="Заблокировано" value={usd(stats.raisedUsd)} tone="cyan" icon={<Coins className="size-3" />} />
          <MiniStat label="Цель" value={usd(project.goalUsd)} icon={<Zap className="size-3" />} />
          <MiniStat
            label="Участников"
            value={String(stats.backers)}
            icon={<Users className="size-3" />}
          />
        </div>

        {/* Машина состояний */}
        <div className="mt-4 space-y-2">
          <StageRow
            index={0}
            active={stage === 0}
            done={stage > 0}
            title="Средства заблокированы"
            body="Каждый вклад лежит в PDA-хранилище кампании. Ни автор, ни платформа не могут его забрать досрочно."
          />
          {project.state === 'failed' || project.state === 'refunded' ? (
            <StageRow
              index={1}
              active={project.state === 'failed'}
              done={project.state === 'refunded'}
              tone="bad"
              title="Цель не достигнута"
              body="Открыт возврат: каждый участник забирает свой вклад сам, полностью и без комиссии."
              icon={<Ban className="size-3.5" />}
            />
          ) : (
            <StageRow
              index={1}
              active={stage === 1}
              done={stage > 1}
              title="Цель достигнута"
              body="Условие смарт-контракта выполнено — средства разблокированы для выплаты автору и команде."
              icon={<CheckCircle2 className="size-3.5" />}
            />
          )}
          {project.state !== 'failed' && project.state !== 'refunded' && (
            <StageRow
              index={2}
              active={stage === 2}
              done={stage >= 2}
              title="Выплата исполнена"
              body={`Автору и команде — ${usd(stats.netUsd)}, платформе — ${usd(stats.feeUsd)} (5%).`}
              icon={<PartyPopper className="size-3.5" />}
            />
          )}
        </div>

        {/* Действия */}
        {project.state === 'successful' && (
          <div className="mt-4 rounded-xl border border-good/25 bg-good/[0.06] p-3.5">
            <div className="text-[12.5px] font-semibold text-good">Выплата доступна</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-txt-mid">
              Инструкция <span className="num">settle_campaign</span> permissionless: её может вызвать любой —
              автор, участник или кранк-бот. Распределение зашито в контракт.
            </p>
            <Button
              variant="success"
              size="sm"
              className="mt-2.5"
              loading={busy === 'settle'}
              icon={<ArrowRight className="size-3.5" />}
              onClick={async () => {
                setBusy('settle')
                try {
                  await settle(project)
                } catch {
                  /* оверлей покажет ошибку */
                } finally {
                  setBusy(null)
                }
              }}
            >
              Исполнить выплату
            </Button>
          </div>
        )}

        {project.state === 'failed' && (
          <div className="mt-4 rounded-xl border border-bad/25 bg-bad/[0.06] p-3.5">
            <div className="text-[12.5px] font-semibold text-bad">Доступен возврат средств</div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-txt-mid">
              {myRefundable > 0
                ? `Ваш вклад ${usd(myRefundable)} можно вернуть прямо сейчас.`
                : 'В этой кампании нет вклада с текущего кошелька.'}
            </p>
            <Button
              variant="danger"
              size="sm"
              className="mt-2.5"
              disabled={myRefundable <= 0}
              loading={busy === 'refund'}
              icon={<ArrowDownToLine className="size-3.5" />}
              onClick={async () => {
                setBusy('refund')
                try {
                  await refund(project)
                } catch {
                  /* оверлей покажет ошибку */
                } finally {
                  setBusy(null)
                }
              }}
            >
              Вернуть {myRefundable > 0 ? usd(myRefundable) : 'вклад'}
            </Button>
          </div>
        )}

        {/* Адреса */}
        <div className="mt-4 space-y-2 border-t border-white/[0.07] pt-3.5">
          <AddrRow label="Campaign PDA" value={project.campaignPda} cluster={cluster} />
          <AddrRow label="Vault PDA" value={project.vault} cluster={cluster} />
          <AddrRow label="Treasury платформы" value={PLATFORM_TREASURY} cluster={cluster} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone?: 'cyan' | 'good'
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-txt-lo">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          'num mt-1 text-[15px] font-bold',
          tone === 'cyan' ? 'text-sol-cyan' : tone === 'good' ? 'text-good' : 'text-txt-hi',
        )}
      >
        {value}
      </div>
    </div>
  )
}

function StageRow({
  index,
  active,
  done,
  title,
  body,
  icon,
  tone,
}: {
  index: number
  active: boolean
  done: boolean
  title: string
  body: string
  icon?: React.ReactNode
  tone?: 'bad'
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border px-3 py-2.5 transition',
        active
          ? tone === 'bad'
            ? 'border-bad/30 bg-bad/[0.06]'
            : 'border-sol-purple/30 bg-sol-purple/[0.07]'
          : done
            ? 'border-white/[0.07] bg-white/[0.02]'
            : 'border-white/[0.05] bg-transparent opacity-55',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
          done
            ? 'border-good/40 bg-good/15 text-good'
            : active
              ? tone === 'bad'
                ? 'border-bad/40 bg-bad/15 text-bad'
                : 'border-sol-purple/50 bg-sol-purple/20 text-sol-violet'
              : 'border-white/10 text-txt-lo',
        )}
      >
        {done ? <CheckCircle2 className="size-3" /> : (icon ?? index + 1)}
      </span>
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold">{title}</div>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-txt-mid">{body}</p>
      </div>
    </div>
  )
}

function AddrRow({ label, value, cluster }: { label: string; value: string; cluster: 'simnet' | 'devnet' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] text-txt-lo">{label}</span>
      <AddressChip address={value} cluster={cluster} size={6} />
    </div>
  )
}

/** Как распределяются средства успешной кампании (из ТЗ: 5% платформе). */
export function PayoutSplit({ project }: { project: Project }) {
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const stats = statsFor(project, contributions, passes, null)

  const teamBps = project.team.reduce((a, t) => a + t.shareBps, 0)
  const partnerBps = project.partners.reduce((a, t) => a + t.shareBps, 0)
  const creatorBps = Math.max(0, 10_000 - teamBps - partnerBps)

  const rows = [
    {
      label: `Блогер · ${project.creator.name}`,
      bps: creatorBps,
      color: '#9945ff',
      wallet: project.creator.wallet,
    },
    ...project.team.map((t) => ({
      label: `${t.name} · ${t.role}`,
      bps: t.shareBps,
      color: '#00d1ff',
      wallet: t.wallet,
    })),
    ...project.partners.map((t) => ({
      label: `Партнёр · ${t.name}`,
      bps: t.shareBps,
      color: '#14f195',
      wallet: t.wallet,
    })),
  ]

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13.5px] font-semibold">
          <Landmark className="size-3.5 text-sol-teal" />
          Распределение средств
        </h3>
        <span className="num text-[11.5px] text-txt-lo">после комиссии {PLATFORM_FEE_BPS / 100}%</span>
      </div>

      <div className="mt-3.5 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        {rows.map((r) => (
          <div
            key={r.label}
            style={{ width: `${(r.bps / 10_000) * 95}%`, background: r.color }}
            title={`${r.label} — ${(r.bps / 100).toFixed(0)}%`}
          />
        ))}
        <div style={{ width: '5%', background: '#6f6f86' }} title="Комиссия платформы — 5%" />
      </div>

      <div className="mt-3.5 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            <span className="size-2 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-txt-mid">{r.label}</span>
            <span className="num shrink-0 text-[12px] font-semibold text-txt-hi">
              {usd((stats.netUsd * r.bps) / 10_000)}
            </span>
            <span className="num w-9 shrink-0 text-right text-[11px] text-txt-lo">{r.bps / 100}%</span>
          </div>
        ))}
        <div className="flex items-center gap-2.5 border-t border-white/[0.07] pt-2">
          <span className="size-2 shrink-0 rounded-full bg-txt-lo" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-txt-mid">Платформа Creator Fund</span>
          <span className="num shrink-0 text-[12px] font-semibold text-txt-hi">{usd(stats.feeUsd)}</span>
          <span className="num w-9 shrink-0 text-right text-[11px] text-txt-lo">5%</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-txt-lo">
        Доли зашиты в аккаунт кампании: инструкция выплаты переводит средства всем получателям в одной
        транзакции. Комиссия берётся только с успешных сборов.
      </p>
    </div>
  )
}

/** Он-чейн история: единый компонент для проекта и страницы прозрачности. */
export function TxList({
  txs,
  projects,
  limit = 30,
  showProject,
  emptyHint,
}: {
  txs: OnchainTx[]
  projects?: Project[]
  limit?: number
  showProject?: boolean
  emptyHint?: string
}) {
  const cluster = useLedger((s) => s.cluster)
  const shown = txs.slice(0, limit)

  if (!shown.length)
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[12.5px] text-txt-lo">
        {emptyHint ?? 'Транзакций пока нет'}
      </p>
    )

  const toneFor = (kind: OnchainTx['kind']) =>
    kind === 'contribute'
      ? 'text-sol-cyan'
      : kind === 'refund'
        ? 'text-bad'
        : kind === 'payout' || kind === 'claim_funds'
          ? 'text-good'
          : kind === 'platform_fee'
            ? 'text-warn'
            : 'text-txt-mid'

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07]">
      <table className="w-full">
        <tbody>
          {shown.map((t) => {
            const p = projects?.find((x) => x.id === t.projectId)
            return (
              <tr key={t.signature} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                <td className="py-2.5 pl-3 pr-2 align-top">
                  <div className={cn('text-[12.5px] font-medium', toneFor(t.kind))}>{txKindLabel[t.kind]}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-txt-lo">
                    <span>{relTime(t.ts)}</span>
                    <span className="num">slot {t.slot.toLocaleString('ru-RU')}</span>
                    {t.real && (
                      <span className="rounded bg-sol-teal/15 px-1 text-[9.5px] font-bold uppercase text-sol-teal">
                        devnet
                      </span>
                    )}
                  </div>
                  {showProject && p && (
                    <div className="mt-0.5 truncate text-[11px] text-txt-mid">{p.title}</div>
                  )}
                  {t.memo && !showProject && (
                    <div className="mt-0.5 truncate text-[11px] text-txt-mid">{t.memo}</div>
                  )}
                </td>
                <td className="px-2 py-2.5 align-top text-right">
                  {t.amountUsd !== undefined && t.amountUsd > 0 && (
                    <div className={cn('num text-[13px] font-bold', toneFor(t.kind))}>
                      {t.kind === 'refund' ? '−' : '+'}
                      {usdCompact(t.amountUsd)}
                    </div>
                  )}
                  <a
                    href={explorerUrl(t.signature, cluster === 'devnet' ? 'devnet' : 'simnet', 'tx')}
                    target="_blank"
                    rel="noreferrer"
                    className="num mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-txt-lo hover:text-sol-cyan"
                  >
                    <SolanaMark size={9} />
                    {short(t.signature, 4)}
                  </a>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function DeadlineNote({ project }: { project: Project }) {
  return (
    <p className="text-[11.5px] text-txt-lo">
      Кампания создана {dateRu(project.createdAt)} · дедлайн {dateRu(project.deadline)}
    </p>
  )
}
