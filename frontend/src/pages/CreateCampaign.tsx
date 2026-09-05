import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { ArrowLeft, ArrowRight, Check, Info, Plus, Trash2, Wallet } from 'lucide-react'
import type { ArtScene, Currency, Project, ProjectCategory, TeamMember } from '../lib/types'
import { CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABEL } from '../lib/categories'
import { TIERS, TIER_ORDER } from '../lib/tiers'
import { usd } from '../lib/format'
import { cn, derivePda, uid } from '../lib/utils'
import { slugify } from '../lib/slug'
import { useWalletCtx } from '../hooks/useWalletCtx'
import { useActions } from '../hooks/useActions'
import { Badge, Button, Card, Field, Progress, SectionTitle } from '../components/ui/primitives'
import { ProjectArt, SolanaMark } from '../components/ui/art'
import { ProjectCard } from '../components/project/ProjectCard'

const SCENES: { id: ArtScene; label: string }[] = [
  { id: 'mountains', label: 'Горы' },
  { id: 'city', label: 'Город' },
  { id: 'studio', label: 'Студия' },
  { id: 'desert', label: 'Степь' },
  { id: 'stage', label: 'Сцена' },
  { id: 'space', label: 'Космос' },
  { id: 'code', label: 'Экран' },
]

const STEPS = ['Основа', 'Цель и срок', 'Команда', 'Публикация']

export default function CreateCampaign() {
  const navigate = useNavigate()
  const { address, connected } = useWalletCtx()
  const { setVisible } = useWalletModal()
  const { publishProject } = useActions()

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProjectCategory>('film')
  const [art, setArt] = useState<ArtScene>('mountains')
  const [goal, setGoal] = useState(20000)
  const [days, setDays] = useState(30)
  const [currency, setCurrency] = useState<Currency>('USDC')
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [team, setTeam] = useState<{ name: string; role: string; share: number }[]>([])

  const teamBps = team.reduce((a, t) => a + Math.round(t.share * 100), 0)
  const creatorPct = Math.max(0, 100 - teamBps / 100)

  const draft: Project = useMemo(() => {
    const id = 'own-' + uid('')
    return {
      id,
      slug: slugify(title, id),
      title: title || 'Название кампании',
      tagline: tagline || 'Короткое описание проекта',
      description: description || 'Расскажите, что вы делаете и на что пойдут средства.',
      category,
      art,
      creator: {
        handle: handle || '@you',
        name: name || 'Автор',
        wallet: address ?? derivePda('wallet', 'anon'),
        avatarHue: 268,
        followers: 0,
        verified: false,
        bio: bio || undefined,
      },
      goalUsd: goal,
      seedRaisedUsd: 0,
      seedBackers: 0,
      currency,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + days * 86_400_000).toISOString(),
      state: 'live',
      vault: derivePda('vault', id),
      campaignPda: derivePda('campaign', id),
      team: team
        .filter((t) => t.name.trim())
        .map<TeamMember>((t, i) => ({
          name: t.name.trim(),
          role: t.role.trim() || 'Команда',
          shareBps: Math.round(t.share * 100),
          wallet: derivePda('wallet', id + '-team-' + i),
        })),
      partners: [],
      polls: [],
      backstage: [],
      merch: [],
      milestones: [
        { label: 'Подготовка', pct: 30 },
        { label: 'Производство', pct: 70 },
        { label: 'Релиз', pct: 100 },
      ],
    }
  }, [title, tagline, description, category, art, goal, days, currency, handle, name, bio, team, address])

  const stepValid = [
    title.trim().length >= 3 && tagline.trim().length >= 8,
    goal >= 100 && days >= 3,
    teamBps <= 9500,
    connected,
  ]

  if (!connected)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.03]">
          <Plus className="size-6 text-sol-teal" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Создать кампанию</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-txt-mid">
          Кампания — это аккаунт в смарт-контракте: цель, дедлайн и правила выплаты. Для создания нужен
          кошелёк, который станет её владельцем.
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

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-6 lg:pb-16">
      <SectionTitle
        eyebrow="Новая кампания"
        title="Соберите финансирование на свой проект"
        hint="Средства аудитории блокируются в смарт-контракте Solana до достижения цели"
      />

      {/* Шаги */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i <= step && setStep(i)}
            className={cn(
              'flex flex-1 flex-col gap-1.5 text-left transition',
              i > step && 'cursor-default opacity-50',
            )}
          >
            <span
              className={cn(
                'h-1 rounded-full transition-all',
                i < step ? 'bg-sol-teal' : i === step ? 'bg-sol-grad' : 'bg-white/10',
              )}
            />
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium">
              {i < step && <Check className="size-3 text-sol-teal" strokeWidth={3} />}
              <span className={i === step ? 'text-txt-hi' : 'text-txt-lo'}>{s}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="min-w-0">
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Название проекта" required hint={`${title.length}/70`}>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 70))}
                  className="w-full"
                  placeholder="Документальный фильм «Узбекистан без фильтров»"
                />
              </Field>
              <Field label="Короткое описание" required hint={`${tagline.length}/140`}>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value.slice(0, 140))}
                  className="w-full"
                  placeholder="О чём проект в одном предложении"
                />
              </Field>
              <Field label="Категория">
                <div className="hide-scroll flex gap-1.5 overflow-x-auto pb-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition',
                        category === c
                          ? 'border-sol-purple/45 bg-sol-purple/15 text-txt-hi'
                          : 'border-white/[0.08] text-txt-mid hover:border-white/20',
                      )}
                    >
                      <span>{CATEGORY_EMOJI[c]}</span>
                      {CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Обложка" hint="векторная сцена — рисуется без загрузки файлов">
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {SCENES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setArt(s.id)}
                      className={cn(
                        'overflow-hidden rounded-lg border transition',
                        art === s.id ? 'border-sol-purple ring-2 ring-sol-purple/30' : 'border-white/10 hover:border-white/25',
                      )}
                      title={s.label}
                    >
                      <div className="aspect-[4/3]">
                        <ProjectArt scene={s.id} id={'pick-' + s.id} />
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Полное описание" hint="на что пойдут средства">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full resize-none"
                  placeholder="Что вы делаете, какой у вас опыт, из чего состоит бюджет, что получат участники."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Ваше имя">
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="Имя автора" />
                </Field>
                <Field label="Никнейм">
                  <input value={handle} onChange={(e) => setHandle(e.target.value)} className="w-full" placeholder="@nickname" />
                </Field>
              </div>
              <Field label="Об авторе">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="w-full resize-none" />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Цель по сбору" required hint="минимум $100">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-lo">$</span>
                  <input
                    value={goal}
                    inputMode="numeric"
                    onChange={(e) => setGoal(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))}
                    className="num w-full pl-7 text-lg font-bold"
                  />
                </div>
                <input
                  type="range"
                  min={500}
                  max={100000}
                  step={500}
                  value={Math.min(100000, goal)}
                  onChange={(e) => setGoal(Number(e.target.value))}
                  className="mt-3 w-full accent-[#9945ff]"
                />
                <div className="mt-1 flex justify-between text-[10.5px] text-txt-lo">
                  <span>$500</span>
                  <span>$100 000</span>
                </div>
              </Field>

              <Field label="Срок сбора" required>
                <div className="flex gap-1.5">
                  {[14, 30, 45, 60].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={cn(
                        'num flex-1 rounded-xl border py-2.5 text-[13px] font-bold transition',
                        days === d
                          ? 'border-sol-purple/50 bg-sol-purple/15 text-txt-hi'
                          : 'border-white/[0.08] text-txt-mid hover:border-white/20',
                      )}
                    >
                      {d} дней
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Валюта сбора" hint="все платежи проходят через Solana">
                <div className="flex gap-2">
                  {(['USDC', 'SOL'] as Currency[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-semibold transition',
                        currency === c
                          ? 'border-sol-teal/50 bg-sol-teal/10 text-txt-hi'
                          : 'border-white/[0.08] text-txt-mid hover:border-white/20',
                      )}
                    >
                      <SolanaMark size={14} />
                      {c}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="rounded-xl border border-sol-cyan/20 bg-sol-cyan/[0.05] p-3.5">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-sol-cyan">
                  <Info className="size-3.5" />
                  Правила смарт-контракта
                </div>
                <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-txt-mid">
                  <li>• Вклады блокируются в PDA-хранилище кампании.</li>
                  <li>• Цель достигнута → выплата автору и команде, комиссия платформы 5%.</li>
                  <li>• Цель не достигнута к дедлайну → участники забирают вклады сами.</li>
                  <li>• Изменить цель и дедлайн после публикации нельзя.</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium">Команда проекта</span>
                  <Button
                    variant="subtle"
                    size="sm"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => setTeam([...team, { name: '', role: '', share: 10 }])}
                  >
                    Добавить
                  </Button>
                </div>
                {team.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-3.5 py-6 text-center text-[12.5px] text-txt-lo">
                    Участники команды получают свою долю автоматически в той же транзакции выплаты.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {team.map((m, i) => (
                      <div key={i} className="flex flex-wrap items-end gap-2 rounded-xl border border-white/[0.08] p-3">
                        <div className="min-w-[130px] flex-1">
                          <div className="mb-1 text-[10.5px] uppercase tracking-wider text-txt-lo">Имя</div>
                          <input
                            value={m.name}
                            onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                            className="w-full"
                          />
                        </div>
                        <div className="min-w-[110px] flex-1">
                          <div className="mb-1 text-[10.5px] uppercase tracking-wider text-txt-lo">Роль</div>
                          <input
                            value={m.role}
                            onChange={(e) => setTeam(team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))}
                            className="w-full"
                          />
                        </div>
                        <div className="w-24">
                          <div className="mb-1 text-[10.5px] uppercase tracking-wider text-txt-lo">Доля %</div>
                          <input
                            value={m.share}
                            inputMode="decimal"
                            onChange={(e) =>
                              setTeam(
                                team.map((x, j) =>
                                  j === i ? { ...x, share: Math.max(0, Math.min(95, Number(e.target.value) || 0)) } : x,
                                ),
                              )
                            }
                            className="num w-full"
                          />
                        </div>
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => setTeam(team.filter((_, j) => j !== i))}
                          icon={<Trash2 className="size-3.5" />}
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2.5 flex items-center justify-between text-[12px]">
                  <span className="text-txt-mid">Ваша доля после комиссии платформы</span>
                  <span className={cn('num font-bold', creatorPct < 20 ? 'text-warn' : 'text-good')}>
                    {creatorPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-medium">Уровни поддержки</div>
                <div className="space-y-1.5">
                  {TIER_ORDER.map((t) => (
                    <div
                      key={t}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5"
                    >
                      <span className="size-2 rounded-full" style={{ background: TIERS[t].color }} />
                      <span className="text-[12.5px] font-semibold" style={{ color: TIERS[t].color }}>
                        {TIERS[t].name}
                      </span>
                      <span className="num ml-auto text-[12.5px] font-bold">{usd(TIERS[t].priceUsd)}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11.5px] leading-relaxed text-txt-lo">
                  Уровни и привилегии стандартизированы платформой: участник получает Creator Pass того уровня,
                  который покрывает его суммарный вклад.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="eyebrow mb-3">Что будет создано в блокчейне</div>
                <Row label="Инструкция" value="create_campaign" mono />
                <Row label="Campaign PDA" value={draft.campaignPda.slice(0, 20) + '…'} mono />
                <Row label="Vault PDA" value={draft.vault.slice(0, 20) + '…'} mono />
                <Row label="Цель" value={usd(draft.goalUsd)} />
                <Row label="Дедлайн" value={new Date(draft.deadline).toLocaleDateString('ru-RU')} />
                <Row label="Валюта" value={draft.currency} />
                <Row label="Комиссия платформы" value="5% с успешного сбора" />
                <Row label="Владелец кампании" value={(address ?? '').slice(0, 16) + '…'} mono />
              </div>

              <div className="rounded-xl border border-warn/25 bg-warn/[0.06] p-3.5 text-[12px] leading-relaxed text-txt-mid">
                Проверьте цель и срок: после публикации их изменить нельзя — правила фиксируются в аккаунте
                кампании.
              </div>

              <Button
                variant="solana"
                size="lg"
                full
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await publishProject(draft)
                    navigate(`/p/${draft.slug}`)
                  } catch {
                    /* оверлей покажет ошибку */
                  } finally {
                    setBusy(false)
                  }
                }}
                icon={<SolanaMark size={15} className="brightness-0" />}
              >
                Опубликовать кампанию
              </Button>
            </div>
          )}

          {/* Навигация */}
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <Button
              variant="ghost"
              size="md"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              icon={<ArrowLeft className="size-4" />}
            >
              Назад
            </Button>
            {step < 3 && (
              <Button
                variant="primary"
                size="md"
                disabled={!stepValid[step]}
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                icon={<ArrowRight className="size-4" />}
              >
                Далее
              </Button>
            )}
          </div>
        </Card>

        {/* Превью */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Предпросмотр карточки</span>
            <Badge tone="purple">черновик</Badge>
          </div>
          <ProjectCard project={draft} />
          <div className="panel p-3.5">
            <div className="text-[12px] font-semibold">Как это увидит аудитория</div>
            <div className="mt-2.5 space-y-2 text-[11.5px] leading-relaxed text-txt-mid">
              <p>Прогресс сбора и процент от цели обновляются после каждой транзакции.</p>
              <p>Список поддержавших строится из он-чейн истории и доступен всем.</p>
              <p>Creator Pass выдаётся автоматически при вкладе от $5.</p>
            </div>
            <div className="mt-3">
              <Progress value={0} height="h-1.5" showGlow={false} />
              <div className="num mt-1.5 text-[10.5px] text-txt-lo">$0 из {usd(draft.goalUsd)} · 0%</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0">
      <span className="text-[12px] text-txt-lo">{label}</span>
      <span className={cn('text-[12px] font-medium text-txt-hi', mono && 'num')}>{value}</span>
    </div>
  )
}
