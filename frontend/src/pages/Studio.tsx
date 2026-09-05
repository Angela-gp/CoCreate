import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  ArrowRight,
  BarChart3,
  Coins,
  LayoutDashboard,
  Megaphone,
  Plus,
  Users,
  Vote as VoteIcon,
  Wallet,
  Wand2,
} from 'lucide-react'
import type { Project, TierKey } from '../lib/types'
import { TIERS, TIER_ORDER } from '../lib/tiers'
import { compactNum, dateRu, plural, timeLeft, usd, usdCompact } from '../lib/format'
import { useLedger } from '../store/ledger'
import { dailyRaised, statsFor, stateMeta } from '../store/selectors'
import { useWalletCtx } from '../hooks/useWalletCtx'
import { useActions } from '../hooks/useActions'
import { useUi } from '../store/ui'
import { Badge, Button, Card, EmptyState, Field, Modal, Progress, SectionTitle, Stat } from '../components/ui/primitives'
import { DailyFundingChart } from '../components/ui/BarChart'
import { ProjectRow } from '../components/project/ProjectCard'
import { TxList } from '../components/project/escrow'
import { ProjectArt } from '../components/ui/art'

export default function Studio() {
  const projects = useLedger((s) => s.projects)
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const txs = useLedger((s) => s.txs)
  const updateProject = useLedger((s) => s.updateProject)
  const { address, connected } = useWalletCtx()
  const { setVisible } = useWalletModal()
  const { settle } = useActions()
  const toast = useUi((s) => s.toast)

  const [backstageFor, setBackstageFor] = useState<Project | null>(null)
  const [pollFor, setPollFor] = useState<Project | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const mine = useMemo(
    () => (address ? projects.filter((p) => p.creator.wallet === address) : []),
    [projects, address],
  )

  const totals = useMemo(() => {
    let raised = 0
    let payable = 0
    let backers = 0
    let fee = 0
    for (const p of mine) {
      const s = statsFor(p, contributions, passes, address)
      raised += s.raisedUsd
      backers += s.backers
      fee += s.feeUsd
      if (p.state === 'successful') payable += s.netUsd
    }
    return { raised, payable, backers, fee }
  }, [mine, contributions, passes, address])

  if (!connected)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.03]">
          <LayoutDashboard className="size-6 text-sol-violet" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Кабинет автора</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-txt-mid">
          Подключите кошелёк, чтобы управлять своими кампаниями: публиковать backstage, запускать
          голосования и исполнять выплаты.
        </p>
        <Button variant="solana" size="lg" className="mt-5" onClick={() => setVisible(true)} icon={<Wallet className="size-4" />}>
          Подключить кошелёк
        </Button>
      </div>
    )

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
      <SectionTitle
        eyebrow="Кабинет автора"
        title="Ваши кампании"
        hint="Сбор, участники, выплаты и инструменты работы с аудиторией"
        right={
          <Link to="/create">
            <Button variant="solana" size="md" icon={<Plus className="size-4" />}>
              Новая кампания
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Собрано всего" value={usdCompact(totals.raised)} tone="cyan" sub={`${mine.length} кампаний`} />
        <Stat label="Готово к выплате" value={usdCompact(totals.payable)} tone="good" sub="после комиссии 5%" />
        <Stat label="Участников" value={compactNum(totals.backers)} sub="уникальные кошельки" />
        <Stat label="Комиссия платформы" value={usdCompact(totals.fee)} sub="только с успешных сборов" />
      </div>

      {mine.length === 0 ? (
        <div className="mt-6 space-y-4">
          <EmptyState
            icon={<Megaphone className="size-6" />}
            title="У этого кошелька пока нет кампаний"
            body="Создайте свою кампанию за пару минут — или примерьте роль автора на демо-проекте, чтобы увидеть весь инструментарий."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/create">
                  <Button variant="solana" size="md" icon={<Plus className="size-4" />}>
                    Создать кампанию
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="md"
                  icon={<Wand2 className="size-4" />}
                  onClick={() => {
                    const demo = projects.find((p) => p.state === 'live')
                    if (!demo || !address) return
                    updateProject(demo.id, { creator: { ...demo.creator, wallet: address } })
                    toast({
                      tone: 'info',
                      title: 'Вы назначены автором демо-кампании',
                      body: `«${demo.title}» теперь в вашем кабинете. Это демо-действие для показа сценария.`,
                    })
                  }}
                >
                  Стать автором демо-кампании
                </Button>
              </div>
            }
          />
          <Card>
            <SectionTitle title="Все кампании платформы" hint="Для примера — как выглядят чужие сборы" />
            <div className="space-y-2">
              {projects.slice(0, 4).map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {mine.map((project) => {
            const s = statsFor(project, contributions, passes, address)
            const meta = stateMeta[project.state]
            const left = timeLeft(project.deadline)
            const daily = dailyRaised(project.id, txs)
            const projectTxs = txs.filter((t) => t.projectId === project.id)
            const passStats = TIER_ORDER.map((tier) => ({
              tier,
              count: passes.filter((p) => p.projectId === project.id && p.tier === tier).length,
            }))

            return (
              <Card key={project.id} className="p-0">
                <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] p-4">
                  <div className="size-12 shrink-0 overflow-hidden rounded-xl">
                    <ProjectArt scene={project.art} id={project.id + '-studio'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/p/${project.slug}`} className="truncate text-[15px] font-semibold hover:text-white">
                        {project.title}
                      </Link>
                      <Badge
                        tone={
                          meta.tone === 'live'
                            ? 'live'
                            : meta.tone === 'good'
                              ? 'good'
                              : meta.tone === 'bad'
                                ? 'bad'
                                : 'neutral'
                        }
                      >
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-1 text-[11.5px] text-txt-lo">
                      дедлайн {dateRu(project.deadline)} ·{' '}
                      {left.over
                        ? 'срок истёк'
                        : `осталось ${left.days > 0 ? plural(left.days, ['день', 'дня', 'дней']) : left.label}`}
                    </div>
                  </div>
                  <Link to={`/p/${project.slug}`} className="shrink-0">
                    <Button variant="subtle" size="sm" icon={<ArrowRight className="size-3.5" />}>
                      Страница
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-5 p-4 lg:grid-cols-[1fr_320px]">
                  <div className="min-w-0 space-y-4">
                    <div>
                      <div className="mb-2 flex items-baseline justify-between">
                        <span className="num text-xl font-black">
                          {usd(s.raisedUsd)}
                          <span className="ml-1.5 text-[12px] font-medium text-txt-lo">
                            из {usd(project.goalUsd)}
                          </span>
                        </span>
                        <span className="num text-[13px] font-bold text-sol-violet">
                          {Math.round(s.pctFunded)}%
                        </span>
                      </div>
                      <Progress value={s.pctFunded} />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Участников" value={compactNum(s.backers)} />
                      <Stat label="К выплате" value={usdCompact(s.netUsd)} tone="good" />
                      <Stat label="Комиссия 5%" value={usdCompact(s.feeUsd)} />
                    </div>

                    <div className="panel-flat p-3.5">
                      <DailyFundingChart data={daily} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Megaphone className="size-3.5" />}
                        onClick={() => setBackstageFor(project)}
                      >
                        Backstage-пост
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<VoteIcon className="size-3.5" />}
                        onClick={() => setPollFor(project)}
                      >
                        Запустить голосование
                      </Button>
                      {project.state === 'successful' && (
                        <Button
                          variant="success"
                          size="sm"
                          icon={<Coins className="size-3.5" />}
                          loading={busy === project.id}
                          onClick={async () => {
                            setBusy(project.id)
                            try {
                              await settle(project)
                            } catch {
                              /* оверлей покажет ошибку */
                            } finally {
                              setBusy(null)
                            }
                          }}
                        >
                          Получить {usdCompact(s.netUsd)}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="panel-flat p-3.5">
                      <div className="flex items-center gap-2 text-[12px] font-semibold">
                        <Users className="size-3.5 text-sol-cyan" />
                        Аудитория по уровням
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        {passStats.map(({ tier, count }) => (
                          <div key={tier} className="flex items-center gap-2">
                            <span className="size-2 rounded-full" style={{ background: TIERS[tier].color }} />
                            <span className="flex-1 text-[12px] text-txt-mid">{TIERS[tier].name}</span>
                            <span className="num text-[12px] font-semibold">{count}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-[10.5px] leading-snug text-txt-lo">
                        Считаются Pass, выпущенные в этом кластере
                      </p>
                    </div>

                    <div className="panel-flat p-3.5">
                      <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold">
                        <BarChart3 className="size-3.5 text-sol-teal" />
                        Последние транзакции
                      </div>
                      <TxList txs={projectTxs} limit={5} />
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <BackstageModal project={backstageFor} onClose={() => setBackstageFor(null)} />
      <PollModal project={pollFor} onClose={() => setPollFor(null)} />
    </div>
  )
}

function BackstageModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { publishBackstage } = useActions()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [minTier, setMinTier] = useState<TierKey>('supporter')

  return (
    <Modal
      open={!!project}
      onClose={onClose}
      title="Backstage-пост"
      subtitle={project?.title}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" size="md" full onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="solana"
            size="md"
            full
            disabled={!title.trim() || !body.trim()}
            onClick={() => {
              if (!project) return
              publishBackstage(project, { title: title.trim(), body: body.trim(), minTier })
              setTitle('')
              setBody('')
              onClose()
            }}
          >
            Опубликовать
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="Заголовок" required>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" placeholder="Что показываем участникам" />
        </Field>
        <Field label="Текст" required>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full resize-none" />
        </Field>
        <Field label="Минимальный уровень доступа" hint="контент скрыт для более низких уровней">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setMinTier(t)}
                className="rounded-lg border px-2 py-2 text-[12px] font-semibold transition"
                style={
                  minTier === t
                    ? { borderColor: TIERS[t].ring, background: `${TIERS[t].color}18`, color: TIERS[t].color }
                    : { borderColor: 'rgba(255,255,255,.08)', color: '#a3a3b8' }
                }
              >
                {TIERS[t].name}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  )
}

function PollModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { publishPoll } = useActions()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', ''])
  const [minTier, setMinTier] = useState<TierKey>('insider')
  const [days, setDays] = useState(7)

  const valid = question.trim() && options.filter((o) => o.trim()).length >= 2

  return (
    <Modal
      open={!!project}
      onClose={onClose}
      title="Новое голосование"
      subtitle={project?.title}
      footer={
        <div className="flex gap-2">
          <Button variant="ghost" size="md" full onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="solana"
            size="md"
            full
            disabled={!valid}
            onClick={() => {
              if (!project) return
              publishPoll(project, {
                question: question.trim(),
                options: options.map((o) => o.trim()).filter(Boolean),
                minTier,
                days,
              })
              setQuestion('')
              setOptions(['', '', ''])
              onClose()
            }}
          >
            Запустить
          </Button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <Field label="Вопрос" required>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full"
            placeholder="Например: какую локацию снимаем следующей?"
          />
        </Field>
        <Field label="Варианты" hint="минимум два">
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <input
                key={i}
                value={o}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                className="w-full"
                placeholder={`Вариант ${i + 1}`}
              />
            ))}
            <Button variant="subtle" size="sm" onClick={() => setOptions([...options, ''])} icon={<Plus className="size-3.5" />}>
              Добавить вариант
            </Button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Кто голосует">
            <select value={minTier} onChange={(e) => setMinTier(e.target.value as TierKey)} className="w-full">
              {TIER_ORDER.map((t) => (
                <option key={t} value={t}>
                  от {TIERS[t].name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Дней на голосование">
            <input
              type="number"
              min={1}
              max={60}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(60, Number(e.target.value) || 7)))}
              className="w-full num"
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
