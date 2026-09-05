import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Flag,
  Play,
  ScrollText,
  Share2,
  Users,
  Vote as VoteIcon,
} from 'lucide-react'
import { CATEGORY_LABEL } from '../lib/categories'
import { compactNum, dateRu, plural, timeLeft, usd, usdCompact } from '../lib/format'
import { cn } from '../lib/utils'
import { useLedger } from '../store/ledger'
import { projectBySlug, statsFor, stateMeta } from '../store/selectors'
import { useWalletCtx } from '../hooks/useWalletCtx'
import { useUi } from '../store/ui'
import { Avatar, ProjectArt, SolanaMark } from '../components/ui/art'
import { Badge, Button, Card, Modal, Progress, Tab, TabList, TabPanel, Tabs } from '../components/ui/primitives'
import { SupportPanel } from '../components/project/SupportPanel'
import { EscrowCard, PayoutSplit, TxList } from '../components/project/escrow'
import { BackersList, BackstageList, MerchList, MessagesPanel, PollPanel } from '../components/project/panels'
import { PassCard, TierBadge } from '../components/project/pass'

export default function ProjectPage() {
  const { slug = '' } = useParams()
  const projects = useLedger((s) => s.projects)
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const txs = useLedger((s) => s.txs)
  const allMessages = useLedger((s) => s.messages)
  const { address } = useWalletCtx()
  const toast = useUi((s) => s.toast)

  const [tab, setTab] = useState('about')
  const [supportOpen, setSupportOpen] = useState(false)

  const project = projectBySlug(projects, slug)
  const projectTxs = useMemo(
    () => (project ? txs.filter((t) => t.projectId === project.id) : []),
    [txs, project],
  )

  if (!project)
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-lg font-semibold">Проект не найден</h1>
        <Link to="/" className="mt-4 inline-block">
          <Button variant="ghost">К списку проектов</Button>
        </Link>
      </div>
    )

  const stats = statsFor(project, contributions, passes, address)
  const meta = stateMeta[project.state]
  const left = timeLeft(project.deadline)
  const myPass = address ? passes.find((p) => p.projectId === project.id && p.wallet === address) : undefined
  const messages = allMessages.filter((m) => m.projectId === project.id)

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: project.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast({ tone: 'success', title: 'Ссылка скопирована' })
      }
    } catch {
      /* пользователь отменил */
    }
  }

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-32 pt-4 sm:px-6 lg:pb-16">
      <Link to="/" className="inline-flex items-center gap-1.5 text-[12.5px] text-txt-mid hover:text-txt-hi">
        <ArrowLeft className="size-3.5" />
        Все проекты
      </Link>

      {/* --- Обложка ---------------------------------------------------------- */}
      <div className="relative mt-3 overflow-hidden rounded-4xl border border-white/[0.07]">
        <div className="relative aspect-[16/9] max-h-[420px] w-full">
          <ProjectArt scene={project.art} id={project.id + '-hero'} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/45 to-transparent" />
          <button className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-ink-950/45 backdrop-blur transition hover:scale-105 hover:border-white/45">
            <Play className="size-5 translate-x-[2px] fill-white text-white" />
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  meta.tone === 'live' ? 'live' : meta.tone === 'good' ? 'good' : meta.tone === 'bad' ? 'bad' : 'neutral'
                }
              >
                {meta.label}
              </Badge>
              <Badge tone="neutral">{CATEGORY_LABEL[project.category]}</Badge>
              <Badge tone="purple" icon={<SolanaMark size={10} />}>
                {project.currency} эскроу
              </Badge>
            </div>
            <h1 className="mt-3 max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-4xl">
              {project.title}
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-txt-mid sm:text-[14.5px]">
              {project.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* --- Автор + действия -------------------------------------------------- */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Avatar name={project.creator.name} hue={project.creator.avatarHue} size={44} ring />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold">{project.creator.name}</span>
            {project.creator.verified && <BadgeCheck className="size-4 shrink-0 text-sol-cyan" />}
          </div>
          <div className="text-[12px] text-txt-lo">
            {project.creator.handle} · {compactNum(project.creator.followers)} подписчиков
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Share2 className="size-3.5" />} onClick={share}>
            <span className="hidden sm:inline">Поделиться</span>
          </Button>
          {myPass && <TierBadge tier={myPass.tier} />}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* --- Левая колонка -------------------------------------------------- */}
        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab}>
            <TabList>
              <Tab id="about">О проекте</Tab>
              <Tab id="backstage" count={project.backstage.length}>
                Backstage
              </Tab>
              <Tab id="polls" count={project.polls.length}>
                Голосования
              </Tab>
              <Tab id="merch" count={project.merch.length}>
                Мерч
              </Tab>
              <Tab id="messages" count={messages.length}>
                Сообщения
              </Tab>
              <Tab id="backers" count={stats.backers}>
                Участники
              </Tab>
              <Tab id="chain" count={projectTxs.length}>
                On-chain
              </Tab>
            </TabList>

            <div className="mt-4">
              <TabPanel id="about">
                <div className="space-y-5">
                  <Card>
                    <p className="whitespace-pre-line text-[13.5px] leading-[1.75] text-txt-mid">
                      {project.description}
                    </p>
                    {project.creator.bio && (
                      <div className="mt-4 flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                        <Avatar name={project.creator.name} hue={project.creator.avatarHue} size={34} />
                        <div>
                          <div className="text-[12.5px] font-semibold">Об авторе</div>
                          <p className="mt-1 text-[12px] leading-relaxed text-txt-mid">{project.creator.bio}</p>
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Этапы */}
                  <Card>
                    <div className="mb-4 flex items-center gap-2">
                      <Flag className="size-3.5 text-sol-teal" />
                      <h3 className="text-[13.5px] font-semibold">Этапы проекта</h3>
                    </div>
                    <div className="relative pl-4">
                      <div className="absolute bottom-2 left-[5px] top-2 w-px bg-white/10" />
                      {project.milestones.map((m) => {
                        const reached = stats.pctFunded >= m.pct
                        return (
                          <div key={m.label} className="relative mb-4 last:mb-0">
                            <span
                              className={cn(
                                'absolute -left-4 top-1 size-2.5 rounded-full border-2',
                                reached
                                  ? 'border-sol-teal bg-sol-teal'
                                  : 'border-white/25 bg-ink-850',
                              )}
                            />
                            <div className="flex items-baseline justify-between gap-3">
                              <span
                                className={cn('text-[13px] font-medium', reached ? 'text-txt-hi' : 'text-txt-mid')}
                              >
                                {m.label}
                              </span>
                              <span className="num text-[11.5px] text-txt-lo">
                                {usdCompact((project.goalUsd * m.pct) / 100)} · {m.pct}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  <PayoutSplit project={project} />
                </div>
              </TabPanel>

              <TabPanel id="backstage">
                <BackstageList project={project} myTier={stats.myTier} onNeedTier={() => setSupportOpen(true)} />
              </TabPanel>

              <TabPanel id="polls">
                {project.polls.length ? (
                  <div className="space-y-3">
                    {project.polls.map((poll) => (
                      <PollPanel
                        key={poll.id}
                        project={project}
                        poll={poll}
                        myTier={stats.myTier}
                        onNeedTier={() => setSupportOpen(true)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="text-center">
                    <VoteIcon className="mx-auto size-5 text-txt-lo" />
                    <p className="mt-2 text-sm font-semibold">Голосований пока нет</p>
                    <p className="mt-1 text-[12.5px] text-txt-mid">
                      Автор запускает голосования по ходу проекта: участники влияют на решения.
                    </p>
                  </Card>
                )}
              </TabPanel>

              <TabPanel id="merch">
                <MerchList project={project} myTier={stats.myTier} onNeedTier={() => setSupportOpen(true)} />
              </TabPanel>

              <TabPanel id="messages">
                <MessagesPanel project={project} myTier={stats.myTier} />
              </TabPanel>

              <TabPanel id="backers">
                <BackersList project={project} />
              </TabPanel>

              <TabPanel id="chain">
                <div className="space-y-3">
                  <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3.5 text-[12px] text-txt-mid">
                    <span className="flex items-center gap-1.5">
                      <ScrollText className="size-3.5 text-sol-cyan" />
                      Полная история кампании
                    </span>
                    <span className="num">{projectTxs.length} транзакций</span>
                    <span className="num ml-auto">создана {dateRu(project.createdAt)}</span>
                  </Card>
                  <TxList txs={projectTxs} limit={60} />
                </div>
              </TabPanel>
            </div>
          </Tabs>
        </div>

        {/* --- Правая колонка ------------------------------------------------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="num text-[26px] font-black leading-none">{usd(stats.raisedUsd)}</div>
                <div className="mt-1 text-[12px] text-txt-lo">
                  из <span className="num">{usd(project.goalUsd)}</span> цели
                </div>
              </div>
              <div
                className={cn(
                  'num text-xl font-black',
                  stats.pctFunded >= 100 ? 'text-good' : 'text-sol-violet',
                )}
              >
                {Math.round(stats.pctFunded)}%
              </div>
            </div>
            <Progress value={stats.pctFunded} className="mt-3" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-txt-lo">
                  <Users className="size-3" /> участников
                </div>
                <div className="num mt-0.5 text-[15px] font-bold">{compactNum(stats.backers)}</div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-txt-lo">
                  <Clock className="size-3" /> {left.over ? 'сбор' : 'осталось'}
                </div>
                <div className="num mt-0.5 text-[15px] font-bold">
                  {left.over
                    ? 'закрыт'
                    : left.days > 0
                      ? plural(left.days, ['день', 'дня', 'дней'])
                      : `${left.hours} ч ${left.minutes} м`}
                </div>
              </div>
            </div>

            {myPass ? (
              <div className="mt-4 space-y-3">
                <PassCard pass={myPass} />
                <Button variant="ghost" size="md" full onClick={() => setSupportOpen(true)}>
                  Увеличить вклад
                </Button>
              </div>
            ) : (
              <div className="mt-4 hidden lg:block">
                <SupportPanel project={project} myTier={stats.myTier} compact />
              </div>
            )}
          </Card>

          {myPass && (
            <Card className="lg:block">
              <SupportPanel project={project} myTier={stats.myTier} compact />
            </Card>
          )}

          <EscrowCard project={project} />
        </aside>
      </div>

      {/* --- Мобильная панель поддержки --------------------------------------- */}
      <div className="fixed bottom-[62px] left-0 right-0 z-30 border-t border-white/[0.08] bg-ink-900/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="num text-[15px] font-bold leading-none">
              {usdCompact(stats.raisedUsd)}
              <span className="ml-1 text-[11px] font-medium text-txt-lo">
                / {usdCompact(project.goalUsd)}
              </span>
            </div>
            <Progress value={stats.pctFunded} height="h-1" className="mt-1.5" showGlow={false} />
          </div>
          <Button
            variant="solana"
            size="md"
            disabled={project.state !== 'live'}
            onClick={() => setSupportOpen(true)}
          >
            {project.state === 'live' ? 'Поддержать' : 'Сбор закрыт'}
          </Button>
        </div>
      </div>

      <Modal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        title="Поддержать проект"
        subtitle={project.title}
      >
        <SupportPanel project={project} myTier={stats.myTier} onDone={() => setSupportOpen(false)} compact />
      </Modal>
    </div>
  )
}
