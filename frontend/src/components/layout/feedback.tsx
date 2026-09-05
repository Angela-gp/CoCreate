import { AlertTriangle, Check, CheckCircle2, ExternalLink, Info, Loader2, X } from 'lucide-react'
import { useTxFlow } from '../../store/txflow'
import { useUi } from '../../store/ui'
import { useLedger } from '../../store/ledger'
import { cn, explorerUrl, short } from '../../lib/utils'
import { usd } from '../../lib/format'
import { Button, CopyButton, Modal } from '../ui/primitives'
import { SolanaMark } from '../ui/art'

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismiss)
  const cluster = useLedger((s) => s.cluster)

  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-[90] flex w-[calc(100vw-1.5rem)] max-w-[368px] flex-col gap-2 sm:bottom-5 sm:right-5">
      {toasts.map((t) => {
        const Icon =
          t.tone === 'success'
            ? CheckCircle2
            : t.tone === 'error'
              ? AlertTriangle
              : t.tone === 'pending'
                ? Loader2
                : Info
        const tone =
          t.tone === 'success'
            ? 'border-good/25 bg-good/[0.08]'
            : t.tone === 'error'
              ? 'border-bad/30 bg-bad/[0.08]'
              : 'border-white/[0.1] bg-ink-800/95'
        const iconTone =
          t.tone === 'success' ? 'text-good' : t.tone === 'error' ? 'text-bad' : 'text-sol-cyan'
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-xl animate-slide-in-right',
              tone,
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', iconTone, t.tone === 'pending' && 'animate-spin')} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold leading-snug">{t.title}</div>
              {t.body && <div className="mt-1 text-[12px] leading-snug text-txt-mid">{t.body}</div>}
              {t.signature && (
                <a
                  href={explorerUrl(t.signature, cluster === 'devnet' ? 'devnet' : 'simnet', 'tx')}
                  target="_blank"
                  rel="noreferrer"
                  className="num mt-1.5 inline-flex items-center gap-1 text-[11px] text-sol-cyan hover:underline"
                >
                  {short(t.signature, 6)}
                  <ExternalLink className="size-2.5" />
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-txt-lo transition hover:bg-white/5 hover:text-txt-hi"
              aria-label="Скрыть"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Оверлей исполнения транзакции: шаги программы, подпись, ссылка в эксплорер. */
export function TxFlowOverlay() {
  const flow = useTxFlow()
  const cluster = useLedger((s) => s.cluster)
  const ok = flow.done && !flow.error

  return (
    <Modal
      open={flow.open}
      onClose={flow.close}
      dismissable={flow.done}
      title={flow.title}
      subtitle={flow.subtitle}
      size="sm"
      footer={
        flow.done ? (
          <div className="flex items-center gap-2">
            {flow.signature && (
              <a
                href={explorerUrl(flow.signature, cluster === 'devnet' ? 'devnet' : 'simnet', 'tx')}
                target="_blank"
                rel="noreferrer"
                className="flex-1"
              >
                <Button variant="ghost" full size="md" icon={<ExternalLink className="size-3.5" />}>
                  Открыть в эксплорере
                </Button>
              </a>
            )}
            <Button variant={ok ? 'solana' : 'ghost'} size="md" full={!flow.signature} onClick={flow.close}>
              {ok ? 'Готово' : 'Закрыть'}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11.5px] text-txt-lo">
            <Loader2 className="size-3.5 animate-spin" />
            {cluster === 'devnet'
              ? 'Транзакция отправляется в кластер devnet'
              : 'Симуляция инструкции программы creator_fund'}
          </div>
        )
      }
    >
      <div className="space-y-3">
        {flow.amountUsd !== undefined && flow.amountUsd > 0 && (
          <div className="flex items-baseline justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
            <span className="text-[12px] text-txt-mid">Сумма</span>
            <span className="num text-lg font-bold">
              {usd(flow.amountUsd)}{' '}
              <span className="text-[12px] font-medium text-txt-lo">{flow.currency}</span>
            </span>
          </div>
        )}

        <ol className="space-y-1">
          {flow.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg px-1 py-2">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                  s.status === 'done'
                    ? 'border-good/40 bg-good/15 text-good'
                    : s.status === 'active'
                      ? 'border-sol-purple/50 bg-sol-purple/15 text-sol-violet'
                      : s.status === 'error'
                        ? 'border-bad/40 bg-bad/15 text-bad'
                        : 'border-white/10 text-txt-lo',
                )}
              >
                {s.status === 'done' ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : s.status === 'active' ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : s.status === 'error' ? (
                  <X className="size-3" strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  'text-[13px]',
                  s.status === 'pending' ? 'text-txt-lo' : 'text-txt-hi',
                  s.status === 'error' && 'text-bad',
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>

        {flow.error && (
          <div className="rounded-xl border border-bad/25 bg-bad/[0.07] p-3 text-[12.5px] leading-relaxed text-bad">
            {flow.error}
          </div>
        )}

        {ok && flow.signature && (
          <div className="relative overflow-hidden rounded-xl border border-good/25 bg-good/[0.06] p-3.5">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-good">
              <SolanaMark size={14} />
              Транзакция подтверждена
            </div>
            <div className="num mt-1.5 flex items-center gap-1 break-all text-[11px] text-txt-mid">
              {short(flow.signature, 12)}
              <CopyButton text={flow.signature} />
            </div>
            <div className="mt-1 text-[11px] text-txt-lo">
              {cluster === 'devnet'
                ? 'Подпись реальная — проверяется в Solana Explorer'
                : 'Simnet: подпись сгенерирована локально, средства не покидали демо-кошелёк'}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
