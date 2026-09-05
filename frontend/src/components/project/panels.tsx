import { useState } from 'react'
import {
  Award,
  Clock,
  Lock,
  MessageSquareHeart,
  Package,
  Send,
  Sparkles,
  Video,
  Vote as VoteIcon,
} from 'lucide-react'
import type { MerchItem, Poll, Project, TierKey } from '../../lib/types'
import { TIERS, tierAtLeast } from '../../lib/tiers'
import { relTime, timeLeft, usd } from '../../lib/format'
import { cn, short } from '../../lib/utils'
import { useLedger } from '../../store/ledger'
import { backerRows, canAccess, pollResults } from '../../store/selectors'
import { useWalletCtx } from '../../hooks/useWalletCtx'
import { useActions } from '../../hooks/useActions'
import { Badge, Button, EmptyState } from '../ui/primitives'
import { TierBadge, TierIcon } from './pass'

/* -------------------------------------------------------------- Голосования */

export function PollPanel({
  project,
  poll,
  myTier,
  onNeedTier,
}: {
  project: Project
  poll: Poll
  myTier: TierKey | null
  onNeedTier: () => void
}) {
  const votes = useLedger((s) => s.votes)
  const { address, connected } = useWalletCtx()
  const { vote } = useActions()
  const { results, totalWeight } = pollResults(poll, votes)
  const mine = address ? votes.find((v) => v.pollId === poll.id && v.wallet === address) : undefined
  const [selected, setSelected] = useState<string | null>(mine?.optionId ?? null)
  const [busy, setBusy] = useState(false)
  const allowed = tierAtLeast(myTier, poll.minTier)
  const left = timeLeft(poll.closesAt)
  const closed = poll.closed || left.over

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <VoteIcon className="size-3.5 text-sol-violet" />
            <span className="eyebrow">Участие в проекте</span>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug">{poll.question}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={closed ? 'neutral' : 'purple'}>
            {closed ? 'голосование закрыто' : `осталось ${left.label}`}
          </Badge>
          <span className="num text-[11px] text-txt-lo">общий вес {totalWeight}</span>
        </div>
      </div>

      <div className="mt-3.5 space-y-2">
        {results.map((r) => {
          const isMine = mine?.optionId === r.optionId
          const isSelected = selected === r.optionId
          return (
            <button
              key={r.optionId}
              disabled={!allowed || closed}
              onClick={() => setSelected(r.optionId)}
              className={cn(
                'relative w-full overflow-hidden rounded-xl border px-3.5 py-3 text-left transition',
                isSelected
                  ? 'border-sol-purple/50 bg-sol-purple/[0.08]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15',
                (!allowed || closed) && 'cursor-default',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-sol-grad-soft transition-[width] duration-700"
                style={{ width: `${r.pct}%` }}
              />
              <div className="relative flex items-center gap-2.5">
                <span
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-full border',
                    isSelected ? 'border-sol-violet' : 'border-white/20',
                  )}
                >
                  {isSelected && <span className="size-2 rounded-full bg-sol-violet" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium">{r.label}</span>
                    {isMine && (
                      <span className="shrink-0 rounded bg-good/15 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-good">
                        ваш голос
                      </span>
                    )}
                    {r.leading && !isMine && (
                      <Sparkles className="size-3 shrink-0 text-sol-teal" />
                    )}
                  </div>
                  {r.hint && <div className="mt-0.5 truncate text-[11px] text-txt-lo">{r.hint}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className="num text-[13px] font-bold">{Math.round(r.pct)}%</div>
                  <div className="num text-[10px] text-txt-lo">
                    вес {r.weight} · {r.voters} чел.
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {!allowed ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.09] bg-white/[0.025] p-3">
          <Lock className="size-3.5 shrink-0 text-txt-lo" />
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-txt-mid">
            Голосование доступно с уровня{' '}
            <span className="font-semibold" style={{ color: TIERS[poll.minTier].color }}>
              {TIERS[poll.minTier].name}
            </span>{' '}
            (от {usd(TIERS[poll.minTier].priceUsd)}).
          </p>
          <Button size="sm" variant="ghost" onClick={onNeedTier}>
            Поддержать
          </Button>
        </div>
      ) : (
        !closed && (
          <div className="mt-3.5 flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              disabled={!selected || !connected || selected === mine?.optionId}
              loading={busy}
              onClick={async () => {
                if (!selected) return
                setBusy(true)
                try {
                  await vote(project, poll, selected, myTier)
                } catch {
                  /* оверлей покажет ошибку */
                } finally {
                  setBusy(false)
                }
              }}
            >
              {mine ? 'Изменить голос' : 'Проголосовать'}
            </Button>
            {myTier && (
              <span className="text-[11.5px] text-txt-lo">
                вес вашего голоса ×{TIERS[myTier].voteWeight}
              </span>
            )}
          </div>
        )
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Backstage */

const KIND_ICON = {
  update: Award,
  video: Video,
  photo: Sparkles,
  call: MessageSquareHeart,
}

export function BackstageList({
  project,
  myTier,
  onNeedTier,
}: {
  project: Project
  myTier: TierKey | null
  onNeedTier: () => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (!project.backstage.length)
    return (
      <EmptyState
        icon={<Video className="size-5" />}
        title="Backstage ещё не опубликован"
        body="Автор выкладывает закрытые материалы по ходу работы — они появятся здесь."
      />
    )

  return (
    <div className="space-y-2">
      {project.backstage.map((post) => {
        const unlocked = canAccess(post, myTier)
        const Icon = KIND_ICON[post.kind]
        const open = openId === post.id
        return (
          <div
            key={post.id}
            className={cn(
              'overflow-hidden rounded-xl border transition',
              unlocked ? 'border-white/[0.08] bg-white/[0.025]' : 'border-white/[0.06] bg-white/[0.012]',
            )}
          >
            <button
              onClick={() => (unlocked ? setOpenId(open ? null : post.id) : onNeedTier())}
              className="flex w-full items-start gap-3 p-3.5 text-left"
            >
              <span
                className={cn(
                  'mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border',
                  unlocked
                    ? 'border-sol-purple/30 bg-sol-purple/12 text-sol-violet'
                    : 'border-white/10 bg-white/[0.03] text-txt-lo',
                )}
              >
                {unlocked ? <Icon className="size-4" /> : <Lock className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-[13.5px] font-semibold', !unlocked && 'text-txt-mid')}>
                    {post.title}
                  </span>
                  <TierBadge tier={post.minTier} className="scale-90" />
                </div>
                <p
                  className={cn(
                    'mt-1 text-[12px] leading-relaxed text-txt-mid',
                    !unlocked && 'select-none blur-[3px]',
                    !open && unlocked && 'line-clamp-2',
                  )}
                >
                  {post.body}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-txt-lo">
                  <Clock className="size-3" />
                  {relTime(post.publishedAt)}
                  {!unlocked && (
                    <span className="ml-1 text-sol-violet">
                      · нужен уровень {TIERS[post.minTier].name}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------- Мерч */

export function MerchList({
  project,
  myTier,
  onNeedTier,
}: {
  project: Project
  myTier: TierKey | null
  onNeedTier: () => void
}) {
  const { buyMerch } = useActions()
  const orders = useLedger((s) => s.orders)
  const { address, connected } = useWalletCtx()
  const [busy, setBusy] = useState<string | null>(null)

  if (!project.merch.length)
    return (
      <EmptyState
        icon={<Package className="size-5" />}
        title="Товаров пока нет"
        body="Автор может добавить мерч и цифровые товары — оплата тоже проходит через Solana."
      />
    )

  const bought = (item: MerchItem) =>
    !!address && orders.some((o) => o.itemId === item.id && o.wallet === address)

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {project.merch.map((item) => {
        const locked = item.minTier ? !tierAtLeast(myTier, item.minTier) : false
        const owned = bought(item)
        return (
          <div key={item.id} className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-xl">
              {item.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold leading-snug">{item.title}</span>
                <span className="num shrink-0 text-[13px] font-bold">{usd(item.priceUsd)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-txt-lo">
                <span className="rounded bg-white/[0.06] px-1.5 py-0.5">
                  {item.kind === 'digital' ? 'цифровой' : 'физический'}
                </span>
                {item.stock !== undefined && <span>осталось {item.stock}</span>}
                {item.minTier && (
                  <span className="flex items-center gap-1">
                    <TierIcon tier={item.minTier} />
                    от {TIERS[item.minTier].name}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant={owned ? 'success' : locked ? 'outline' : 'ghost'}
                className="mt-2.5"
                disabled={owned}
                loading={busy === item.id}
                onClick={async () => {
                  if (locked) return onNeedTier()
                  if (!connected) return onNeedTier()
                  setBusy(item.id)
                  try {
                    await buyMerch(project, item)
                  } catch {
                    /* оверлей покажет ошибку */
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                {owned ? 'Куплено' : locked ? `Нужен ${TIERS[item.minTier!].name}` : 'Купить'}
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------- Платные сообщения */

const MSG_PRESETS = [5, 10, 25, 50]

export function MessagesPanel({ project, myTier }: { project: Project; myTier: TierKey | null }) {
  const messages = useLedger((s) => s.messages).filter((m) => m.projectId === project.id)
  const { sendMessage } = useActions()
  const { address, connected } = useWalletCtx()
  const [text, setText] = useState('')
  const [amount, setAmount] = useState(10)
  const [busy, setBusy] = useState(false)

  return (
    <div className="space-y-3">
      <div className="panel p-3.5">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="size-3.5 text-sol-violet" />
          <span className="text-[13px] font-semibold">Платное сообщение автору</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 240))}
          rows={2}
          placeholder="Ваше сообщение попадёт в закреплённую ленту проекта"
          className="mt-2.5 w-full resize-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5">
            {MSG_PRESETS.map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={cn(
                  'num rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition',
                  amount === v
                    ? 'border-sol-purple/50 bg-sol-purple/15 text-txt-hi'
                    : 'border-white/[0.08] text-txt-mid hover:border-white/20',
                )}
              >
                ${v}
              </button>
            ))}
          </div>
          <span className="num ml-auto text-[11px] text-txt-lo">{text.length}/240</span>
          <Button
            size="sm"
            variant="primary"
            icon={<Send className="size-3.5" />}
            disabled={!text.trim() || !connected}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await sendMessage(
                  project,
                  text.trim(),
                  amount,
                  myTier,
                  address ? `@${short(address, 4)}` : '@anon',
                )
                setText('')
              } catch {
                /* оверлей покажет ошибку */
              } finally {
                setBusy(false)
              }
            }}
          >
            Отправить {usd(amount)}
          </Button>
        </div>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          icon={<MessageSquareHeart className="size-5" />}
          title="Сообщений пока нет"
          body="Платные сообщения выделяются в ленте проекта и приходят автору напрямую."
        />
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5"
              style={m.tier ? { borderColor: `${TIERS[m.tier].color}33` } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="num text-[12.5px] font-semibold text-txt-hi">{m.handle}</span>
                {m.tier && <TierBadge tier={m.tier} className="scale-90" />}
                <span className="num ml-auto rounded-md bg-sol-grad px-2 py-0.5 text-[11px] font-bold text-ink-950">
                  {usd(m.amountUsd)}
                </span>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-txt-mid">{m.text}</p>
              <div className="mt-1.5 text-[10.5px] text-txt-lo">{relTime(m.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------- Список участников */

export function BackersList({ project }: { project: Project }) {
  const txs = useLedger((s) => s.txs)
  const cluster = useLedger((s) => s.cluster)
  const rows = backerRows(project.id, txs)

  if (!rows.length)
    return (
      <EmptyState
        icon={<Sparkles className="size-5" />}
        title="Пока никто не поддержал"
        body="Станьте первым: вклад блокируется в смарт-контракте и вернётся, если цель не будет достигнута."
      />
    )

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07]">
      {rows.map((r, i) => (
        <div
          key={r.signature + i}
          className="flex items-center gap-3 border-b border-white/[0.05] px-3.5 py-2.5 last:border-0 hover:bg-white/[0.02]"
        >
          <span className="num w-6 shrink-0 text-[11px] text-txt-lo">{i + 1}</span>
          <span className="num min-w-0 flex-1 truncate text-[12.5px] text-txt-mid">{short(r.wallet, 5)}</span>
          {r.tier && <TierBadge tier={r.tier} className="hidden scale-90 sm:inline-flex" />}
          <span className="num shrink-0 text-[13px] font-bold text-txt-hi">{usd(r.amountUsd)}</span>
          <span className="w-16 shrink-0 text-right text-[10.5px] text-txt-lo">{relTime(r.ts)}</span>
        </div>
      ))}
      <div className="bg-white/[0.015] px-3.5 py-2 text-[10.5px] text-txt-lo">
        Список строится из он-чейн истории кластера {cluster === 'devnet' ? 'devnet' : 'simnet'}
      </div>
    </div>
  )
}
