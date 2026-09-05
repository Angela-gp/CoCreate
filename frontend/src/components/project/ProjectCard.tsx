import { Link } from 'react-router-dom'
import { Clock, Play, Users } from 'lucide-react'
import type { Project } from '../../lib/types'
import { backersLabel, compactNum, daysLeft, plural, usd, usdCompact } from '../../lib/format'
import { cn } from '../../lib/utils'
import { useLedger } from '../../store/ledger'
import { statsFor, stateMeta } from '../../store/selectors'
import { Avatar, ProjectArt } from '../ui/art'
import { Badge, Progress } from '../ui/primitives'
import { CATEGORY_LABEL } from '../../lib/categories'

export function ProjectCard({ project, wide }: { project: Project; wide?: boolean }) {
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const stats = statsFor(project, contributions, passes, null)
  const meta = stateMeta[project.state]
  const days = daysLeft(project.deadline)

  return (
    <Link
      to={`/p/${project.slug}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl2 border border-white/[0.07] bg-ink-850/70 transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,.9)]',
        wide && 'sm:flex-row',
      )}
    >
      <div className={cn('relative shrink-0 overflow-hidden', wide ? 'sm:w-[46%]' : '')}>
        <div className={cn('relative', wide ? 'aspect-[16/10] h-full sm:aspect-auto' : 'aspect-[16/10]')}>
          <ProjectArt scene={project.art} id={project.id} className="transition-transform duration-500 group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone={meta.tone === 'live' ? 'live' : meta.tone === 'good' ? 'good' : meta.tone === 'bad' ? 'bad' : 'neutral'}>
              {meta.label}
            </Badge>
            <Badge tone="neutral">{CATEGORY_LABEL[project.category]}</Badge>
          </div>
          <span className="absolute bottom-3 left-3 grid size-9 place-items-center rounded-full border border-white/25 bg-ink-950/60 backdrop-blur transition group-hover:scale-110 group-hover:border-white/40">
            <Play className="size-3.5 translate-x-[1px] fill-white/90 text-white/90" />
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <Avatar name={project.creator.name} hue={project.creator.avatarHue} size={22} />
          <span className="truncate text-[12px] text-txt-mid">{project.creator.handle}</span>
          <span className="ml-auto shrink-0 num text-[11px] text-txt-lo">
            {compactNum(project.creator.followers)} подписчиков
          </span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[15px] font-semibold leading-snug group-hover:text-white">
          {project.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-txt-mid">{project.tagline}</p>

        <div className="mt-auto pt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="num text-base font-bold text-txt-hi">
              {usdCompact(stats.raisedUsd)}
              <span className="ml-1.5 text-[11.5px] font-medium text-txt-lo">из {usdCompact(project.goalUsd)}</span>
            </span>
            <span
              className={cn(
                'num text-[12.5px] font-bold',
                stats.pctFunded >= 100 ? 'text-good' : 'text-sol-violet',
              )}
            >
              {Math.round(stats.pctFunded)}%
            </span>
          </div>
          <Progress value={stats.pctFunded} height="h-1.5" />
          <div className="mt-2.5 flex items-center gap-3 text-[11.5px] text-txt-lo">
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {backersLabel(stats.backers)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {project.state === 'live'
                ? days > 0
                  ? `${plural(days, ['день', 'дня', 'дней'])} осталось`
                  : 'последний день'
                : 'сбор закрыт'}
            </span>
            <span className="num ml-auto">{project.currency}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/** Компактная строка проекта — для кабинета автора и списков. */
export function ProjectRow({ project }: { project: Project }) {
  const contributions = useLedger((s) => s.contributions)
  const passes = useLedger((s) => s.passes)
  const stats = statsFor(project, contributions, passes, null)
  const meta = stateMeta[project.state]

  return (
    <Link
      to={`/p/${project.slug}`}
      className="flex items-center gap-3.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition hover:border-white/15 hover:bg-white/[0.045]"
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-lg">
        <ProjectArt scene={project.art} id={project.id + '-row'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold">{project.title}</span>
          <Badge
            tone={meta.tone === 'live' ? 'live' : meta.tone === 'good' ? 'good' : meta.tone === 'bad' ? 'bad' : 'neutral'}
            className="shrink-0"
          >
            {meta.label}
          </Badge>
        </div>
        <div className="mt-1.5">
          <Progress value={stats.pctFunded} height="h-1" showGlow={false} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="num text-[13px] font-bold">{usd(stats.raisedUsd)}</div>
        <div className="num text-[11px] text-txt-lo">{Math.round(stats.pctFunded)}% из {usdCompact(project.goalUsd)}</div>
      </div>
    </Link>
  )
}
