import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { ArrowDownToLine, BadgeCheck, Package, Ticket, Vote as VoteIcon, Wallet } from 'lucide-react'
import { TIERS } from '../lib/tiers'
import { relTime, usd, usdCompact } from '../lib/format'
import { cn, short } from '../lib/utils'
import { useLedger } from '../store/ledger'
import { useWalletCtx } from '../hooks/useWalletCtx'
import { useActions } from '../hooks/useActions'
import { AddressChip, Badge, Button, Card, EmptyState, SectionTitle, Stat } from '../components/ui/primitives'
import { PassCard, TierBadge } from '../components/project/pass'

export default function MyPasses() {
  const projects = useLedger((s) => s.projects)
  const passes = useLedger((s) => s.passes)
  const contributions = useLedger((s) => s.contributions)
  const votes = useLedger((s) => s.votes)
  const orders = useLedger((s) => s.orders)
  const cluster = useLedger((s) => s.cluster)
  const { address, connected } = useWalletCtx()
  const { setVisible } = useWalletModal()
  const { refund } = useActions()
  const [busy, setBusy] = useState<string | null>(null)

  const mine = useMemo(() => {
    if (!address) return { passes: [], contributions: [], votes: [], orders: [], invested: 0, refundable: 0 }
    const myPasses = passes.filter((p) => p.wallet === address)
    const myContribs = contributions.filter((c) => c.wallet === address)
    const invested = myContribs.filter((c) => !c.refunded).reduce((a, c) => a + c.amountUsd, 0)
    const refundable = myContribs
      .filter((c) => !c.refunded && projects.find((p) => p.id === c.projectId)?.state === 'failed')
      .reduce((a, c) => a + c.amountUsd, 0)
    return {
      passes: myPasses,
      contributions: myContribs,
      votes: votes.filter((v) => v.wallet === address),
      orders: orders.filter((o) => o.wallet === address),
      invested,
      refundable,
    }
  }, [address, passes, contributions, votes, orders, projects])

  if (!connected)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.03]">
          <Ticket className="size-6 text-sol-violet" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Мои Creator Pass</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-txt-mid">
          Pass — цифровое подтверждение участия в проекте. Подключите кошелёк, чтобы увидеть свои уровни,
          привилегии и вклады.
        </p>
        <Button
          variant="solana"
          size="lg"
          className="mt-5"
          onClick={() => setVisible(true)}
          icon={<Wallet className="size-4" />}
        >
          Подключить кошелёк
        </Button>
      </div>
    )

  const refundableProjects = projects.filter(
    (p) =>
      p.state === 'failed' &&
      mine.contributions.some((c) => c.projectId === p.id && !c.refunded),
  )

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
      <SectionTitle
        eyebrow="Участие"
        title="Мои Creator Pass"
        hint="Уровни доступа, вклады и привилегии текущего кошелька"
        right={address ? <AddressChip address={address} cluster={cluster} size={5} /> : null}
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Всего вложено" value={usdCompact(mine.invested)} tone="cyan" sub={`${mine.contributions.length} вкладов`} />
        <Stat label="Активных Pass" value={String(mine.passes.length)} tone="purple" sub="в этом кластере" />
        <Stat label="Голосов подано" value={String(mine.votes.length)} sub="решения проектов" />
        <Stat
          label="Доступно к возврату"
          value={usdCompact(mine.refundable)}
          sub={mine.refundable > 0 ? 'кампании не достигли цели' : 'нет возвратов'}
        />
      </div>

      {refundableProjects.length > 0 && (
        <Card className="mt-5 border-bad/25 bg-bad/[0.05]">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="size-4 text-bad" />
            <h3 className="text-[14px] font-semibold text-bad">Доступен возврат средств</h3>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-txt-mid">
            Эти кампании не достигли цели в срок. Смарт-контракт разрешает забрать вклад целиком — без комиссии и
            без участия автора.
          </p>
          <div className="mt-3 space-y-2">
            {refundableProjects.map((p) => {
              const amount = mine.contributions
                .filter((c) => c.projectId === p.id && !c.refunded)
                .reduce((a, c) => a + c.amountUsd, 0)
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-850/60 p-3"
                >
                  <Link to={`/p/${p.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:text-white">
                    {p.title}
                  </Link>
                  <span className="num text-[13px] font-bold text-bad">{usd(amount)}</span>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={busy === p.id}
                    onClick={async () => {
                      setBusy(p.id)
                      try {
                        await refund(p)
                      } catch {
                        /* оверлей покажет ошибку */
                      } finally {
                        setBusy(null)
                      }
                    }}
                  >
                    Вернуть
                  </Button>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <BadgeCheck className="size-4 text-sol-cyan" />
              Мои Pass
            </h3>
            {mine.passes.length === 0 ? (
              <EmptyState
                icon={<Ticket className="size-5" />}
                title="Pass ещё не выпущен"
                body="Поддержите любой проект на сумму от $5 — Creator Pass появится здесь автоматически."
                action={
                  <Link to="/">
                    <Button variant="solana" size="md">
                      Выбрать проект
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {mine.passes.map((pass) => {
                  const project = projects.find((p) => p.id === pass.projectId)
                  return (
                    <div key={pass.id} className="space-y-2">
                      <PassCard pass={pass} />
                      <div className="flex items-center justify-between gap-2 px-1">
                        <Link
                          to={project ? `/p/${project.slug}` : '/'}
                          className="truncate text-[11.5px] text-txt-mid hover:text-txt-hi"
                        >
                          Открыть проект →
                        </Link>
                        <span className="num text-[10.5px] text-txt-lo">{relTime(pass.issuedAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <VoteIcon className="size-4 text-sol-violet" />
              Мои голоса
            </h3>
            {mine.votes.length === 0 ? (
              <p className="text-[12.5px] text-txt-lo">
                Голосования доступны с уровня Insider ($20). Ваш голос записывается в блокчейн.
              </p>
            ) : (
              <div className="space-y-2">
                {mine.votes.map((v) => {
                  const project = projects.find((p) => p.id === v.projectId)
                  const poll = project?.polls.find((p) => p.id === v.pollId)
                  const option = poll?.options.find((o) => o.id === v.optionId)
                  return (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium">{poll?.question ?? 'Голосование'}</div>
                        <div className="mt-0.5 truncate text-[11px] text-txt-lo">
                          {project?.title} · ваш выбор: {option?.label ?? '—'}
                        </div>
                      </div>
                      <Badge tone="purple">вес ×{v.weight}</Badge>
                      <span className="num text-[10.5px] text-txt-lo">{relTime(v.createdAt)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold">
              <Package className="size-4 text-sol-teal" />
              Покупки
            </h3>
            {mine.orders.length === 0 ? (
              <p className="text-[12.5px] text-txt-lo">
                Мерч и цифровые товары проектов появятся здесь после оплаты.
              </p>
            ) : (
              <div className="space-y-2">
                {mine.orders.map((o) => {
                  const project = projects.find((p) => p.id === o.projectId)
                  const item = project?.merch.find((m) => m.id === o.itemId)
                  return (
                    <div
                      key={o.id}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-lg">
                        {item?.emoji ?? '🎁'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium">{item?.title ?? 'Товар'}</div>
                        <div className="truncate text-[11px] text-txt-lo">{project?.title}</div>
                      </div>
                      <span className="num text-[12.5px] font-bold">{usd(o.amountUsd)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Привилегии */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h3 className="text-[14px] font-semibold">Мои привилегии</h3>
            {mine.passes.length === 0 ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-txt-mid">
                Каждый уровень открывает свой набор возможностей — от backstage до участия в закрытом созвоне.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {mine.passes.map((pass) => {
                  const project = projects.find((p) => p.id === pass.projectId)
                  return (
                    <div key={pass.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[12.5px] font-medium">{project?.title}</span>
                        <TierBadge tier={pass.tier} className="scale-90" />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {TIERS[pass.tier].perks.map((perk) => (
                          <li key={perk} className="flex items-start gap-1.5 text-[11.5px] text-txt-mid">
                            <span className="mt-1 size-1 shrink-0 rounded-full" style={{ background: TIERS[pass.tier].color }} />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-[13.5px] font-semibold">История вкладов</h3>
            <div className="mt-2.5 space-y-1.5">
              {mine.contributions.length === 0 ? (
                <p className="text-[12px] text-txt-lo">Вкладов пока нет</p>
              ) : (
                mine.contributions.slice(0, 12).map((c) => {
                  const project = projects.find((p) => p.id === c.projectId)
                  return (
                    <div key={c.id} className="flex items-center gap-2 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[12px] text-txt-mid">{project?.title}</span>
                      <span
                        className={cn(
                          'num text-[12px] font-semibold',
                          c.refunded ? 'text-txt-lo line-through' : 'text-txt-hi',
                        )}
                      >
                        {usd(c.amountUsd)}
                      </span>
                      <span className="num w-14 shrink-0 text-right text-[10px] text-txt-lo">
                        {short(c.signature, 3)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
