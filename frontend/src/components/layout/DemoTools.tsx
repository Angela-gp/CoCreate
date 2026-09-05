import { useState } from 'react'
import { FlaskConical, RotateCcw, TimerReset, Wallet } from 'lucide-react'
import { useLedger } from '../../store/ledger'
import { useBalances } from '../../store/balances'
import { useUi } from '../../store/ui'
import { useWalletCtx } from '../../hooks/useWalletCtx'
import { stateMeta } from '../../store/selectors'
import { Button, Card } from '../ui/primitives'

/**
 * Инструменты для демонстрации: приблизить дедлайн (чтобы увидеть возврат
 * средств), пополнить демо-баланс, сбросить всё в исходное состояние.
 * Показываются только в simnet — в devnet временем сети управлять нельзя.
 */
export function DemoTools() {
  const cluster = useLedger((s) => s.cluster)
  const projects = useLedger((s) => s.projects)
  const updateProject = useLedger((s) => s.updateProject)
  const syncStates = useLedger((s) => s.syncStates)
  const resetAll = useLedger((s) => s.resetAll)
  const resetBalances = useBalances((s) => s.reset)
  const faucet = useBalances((s) => s.faucet)
  const toast = useUi((s) => s.toast)
  const { address } = useWalletCtx()

  const live = projects.filter((p) => p.state === 'live')
  const [pick, setPick] = useState(live[0]?.id ?? '')

  if (cluster !== 'simnet') return null

  return (
    <Card className="border-dashed">
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-warn" />
        <h3 className="text-[13.5px] font-semibold">Инструменты демонстрации</h3>
        <span className="chip ml-auto">только simnet</span>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-txt-mid">
        Продукт целиком зависит от времени и условий смарт-контракта. Чтобы показать сценарий возврата,
        дедлайн кампании можно завершить прямо сейчас.
      </p>

      <div className="mt-3.5 flex flex-wrap items-end gap-2">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-txt-lo">Кампания</span>
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="w-full">
            {live.length === 0 && <option value="">нет активных кампаний</option>}
            {live.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {stateMeta[p.state].label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="ghost"
          size="md"
          icon={<TimerReset className="size-3.5" />}
          disabled={!pick}
          onClick={() => {
            const p = projects.find((x) => x.id === pick)
            if (!p) return
            updateProject(p.id, { deadline: new Date(Date.now() - 1000).toISOString() })
            const { finalized } = syncStates()
            const now = useLedger.getState().projects.find((x) => x.id === p.id)
            toast({
              tone: 'info',
              title: `Срок кампании «${p.title}» истёк`,
              body: finalized.length
                ? `Новое состояние: ${stateMeta[now?.state ?? 'failed'].label}. ${
                    now?.state === 'failed' ? 'Участникам доступен возврат вклада.' : 'Доступна выплата автору.'
                  }`
                : undefined,
            })
          }}
        >
          Завершить срок сейчас
        </Button>
        <Button
          variant="ghost"
          size="md"
          icon={<Wallet className="size-3.5" />}
          disabled={!address}
          onClick={() => {
            if (!address) return
            faucet(address)
            toast({ tone: 'success', title: 'Демо-баланс пополнен', body: '+500 USDC и +4 SOL' })
          }}
        >
          Пополнить баланс
        </Button>
        <Button
          variant="danger"
          size="md"
          icon={<RotateCcw className="size-3.5" />}
          onClick={() => {
            resetAll()
            resetBalances()
            toast({ tone: 'info', title: 'Демо-данные сброшены', body: 'Кампании, вклады и Pass — в исходном состоянии.' })
          }}
        >
          Сбросить демо
        </Button>
      </div>
    </Card>
  )
}
