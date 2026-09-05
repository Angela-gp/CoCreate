import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BadgeCheck,
  Compass,
  LayoutDashboard,
  Info,
  Plus,
  ScrollText,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useLedger } from '../../store/ledger'
import { useUi } from '../../store/ui'
import { Logo } from '../ui/art'
import { Button, Segmented, Tooltip } from '../ui/primitives'
import { WalletButton } from './WalletButton'

const NAV = [
  { to: '/', label: 'Проекты', icon: Compass, exact: true },
  { to: '/passes', label: 'Мои Pass', icon: BadgeCheck },
  { to: '/studio', label: 'Кабинет автора', icon: LayoutDashboard },
  { to: '/transparency', label: 'Прозрачность', icon: ScrollText },
  { to: '/about', label: 'О платформе', icon: Info },
]

/** Переключатель кластера: демо-сеть или настоящий devnet. */
export function ClusterSwitch({ compact }: { compact?: boolean }) {
  const cluster = useLedger((s) => s.cluster)
  const setCluster = useLedger((s) => s.setCluster)
  const toast = useUi((s) => s.toast)

  return (
    <Tooltip
      label={
        cluster === 'simnet'
          ? 'Simnet: транзакции симулируются локально, ничего не отправляется в сеть'
          : 'Devnet: транзакции реально уходят в кластер Solana devnet и видны в эксплорере'
      }
    >
      <Segmented
        className={compact ? 'scale-95' : undefined}
        value={cluster}
        onChange={(v) => {
          setCluster(v)
          toast({
            tone: 'info',
            title: v === 'devnet' ? 'Включён devnet' : 'Включён simnet',
            body:
              v === 'devnet'
                ? 'Платежи уходят настоящими транзакциями. Нужен devnet SOL — запросите airdrop в меню кошелька.'
                : 'Платежи симулируются локально: полный сценарий продукта без реальных средств.',
          })
        }}
        options={[
          { value: 'simnet', label: 'Демо' },
          { value: 'devnet', label: 'Devnet' },
        ]}
      />
    </Tooltip>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-900/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <Logo size={32} />
            <span className="hidden text-[15px] font-black uppercase leading-none tracking-tight sm:block">
              <span className="text-txt-hi">Creator</span> <span className="grad-text">Fund</span>
            </span>
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                    isActive ? 'bg-white/[0.07] text-txt-hi' : 'text-txt-mid hover:text-txt-hi',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <ClusterSwitch compact />
            </div>
            <Link to="/create" className="hidden sm:block">
              <Button variant="ghost" size="md" icon={<Plus className="size-4" />}>
                <span className="hidden lg:inline">Создать проект</span>
                <span className="lg:hidden">Создать</span>
              </Button>
            </Link>
            <WalletButton />
            <button
              className="grid size-10 place-items-center rounded-xl border border-white/[0.09] text-txt-mid lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Меню"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/[0.07] bg-ink-850 px-4 py-3 lg:hidden animate-fade-in">
            <div className="grid gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
                      isActive ? 'bg-white/[0.07] text-txt-hi' : 'text-txt-mid',
                    )
                  }
                >
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
              <span className="text-[12px] text-txt-lo">Режим сети</span>
              <ClusterSwitch compact />
            </div>
          </div>
        )}
      </header>
      {pathname !== '/about' && <SubBar />}
    </>
  )
}

/** Тонкая строка-статус под хедером: живая сводка платформы. */
function SubBar() {
  const projects = useLedger((s) => s.projects)
  const txs = useLedger((s) => s.txs)
  const live = projects.filter((p) => p.state === 'live').length
  const lastTx = txs[0]

  return (
    <div className="hidden border-b border-white/[0.05] bg-ink-950/40 md:block">
      <div className="mx-auto flex h-9 max-w-[1240px] items-center gap-5 overflow-hidden px-6 text-[11.5px] text-txt-lo">
        <span className="flex items-center gap-1.5">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sol-teal opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-sol-teal" />
          </span>
          {live} активных кампаний
        </span>
        <span className="text-white/10">•</span>
        <span>Комиссия платформы 5% только с успешных сборов</span>
        {lastTx && (
          <>
            <span className="text-white/10">•</span>
            <span className="num truncate">
              последняя транзакция · slot {lastTx.slot.toLocaleString('ru-RU')}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/** Нижняя навигация мобильного приложения. */
export function MobileNav() {
  const items = [
    { to: '/', label: 'Проекты', icon: Compass, exact: true },
    { to: '/passes', label: 'Pass', icon: BadgeCheck },
    { to: '/create', label: 'Создать', icon: Plus, accent: true },
    { to: '/studio', label: 'Кабинет', icon: LayoutDashboard },
    { to: '/transparency', label: 'On-chain', icon: ScrollText },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="flex items-stretch justify-around">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition-colors',
                isActive ? 'text-txt-hi' : 'text-txt-lo',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-lg transition-all',
                    item.accent
                      ? 'bg-sol-grad text-ink-950'
                      : isActive
                        ? 'bg-white/[0.09] text-txt-hi'
                        : 'text-txt-lo',
                  )}
                >
                  <item.icon className="size-4" strokeWidth={2.3} />
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/[0.07] bg-ink-950/60">
      <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="text-xl font-black tracking-tight sm:text-2xl">
              From followers to <span className="grad-text">co-creators.</span>
            </div>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-txt-mid">
              CoCreate — платформа на Solana: блогеры собирают финансирование на контент-проекты,
              а аудитория становится частью их создания.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <div className="text-[12px] leading-tight text-txt-lo">
              <div className="font-semibold text-txt-mid">CoCreate</div>
              <div>Powered by Solana</div>
            </div>
          </div>
        </div>
        <div className="divider my-7" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-txt-lo">
          <span>SocialFi · Powered by Solana</span>
          <Link to="/about" className="link">
            Концепция и роль Solana
          </Link>
          <Link to="/transparency" className="link">
            On-chain история
          </Link>
          <span className="ml-auto">Демо-продукт: не финансовая услуга и не оферта</span>
        </div>
      </div>
    </footer>
  )
}
