import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Lock, Sparkles, Wallet, Zap } from 'lucide-react'
import { SolanaProvider } from './chain/provider'
import { Footer, Header, MobileNav } from './components/layout/shell'
import { Toasts, TxFlowOverlay } from './components/layout/feedback'
import { Button, Modal } from './components/ui/primitives'
import { Logo } from './components/ui/art'
import { useLedger } from './store/ledger'
import { useUi } from './store/ui'
import Feed from './pages/Feed'
import ProjectPage from './pages/ProjectPage'
import MyPasses from './pages/MyPasses'
import Studio from './pages/Studio'
import CreateCampaign from './pages/CreateCampaign'
import Transparency from './pages/Transparency'
import About from './pages/About'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function WebMcpTools() {
  const navigate = useNavigate()

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return

    const lifecycle = new AbortController()
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_campaign_creation',
          title: 'Создать кампанию',
          description: 'Открыть рабочий мастер создания новой краудфандинговой кампании CoCreate.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: () => {
            navigate('/create')
            return { status: 'ready', route: '/create' }
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined)

    return () => lifecycle.abort()
  }, [navigate])

  return null
}

/** Следит за дедлайнами кампаний: переводит их в successful / failed. */
function StateSync() {
  const syncStates = useLedger((s) => s.syncStates)
  useEffect(() => {
    // фиксируем сгенерированный сид в localStorage, иначе история кампаний
    // (подписи, слоты) пересоздавалась бы при каждой перезагрузке
    useLedger.setState((s) => ({ slot: s.slot }))
    syncStates()
    const id = setInterval(syncStates, 30_000)
    return () => clearInterval(id)
  }, [syncStates])
  return null
}

function Onboarding() {
  const seen = useUi((s) => s.onboardingSeen)
  const setSeen = useUi((s) => s.setOnboardingSeen)
  const { wallets, select, connected } = useWallet()
  const { setVisible } = useWalletModal()

  const demo = wallets.find((w) => w.adapter.name.startsWith('Demo Wallet'))

  return (
    <Modal
      open={!seen}
      onClose={() => setSeen(true)}
      size="sm"
      title={null}
      footer={
        <div className="space-y-2">
          <Button
            variant="solana"
            size="lg"
            full
            icon={<Wallet className="size-4" />}
            onClick={() => {
              if (demo && !connected) select(demo.adapter.name)
              else if (!connected) setVisible(true)
              setSeen(true)
            }}
          >
            Начать с демо-кошельком
          </Button>
          <Button
            variant="subtle"
            size="md"
            full
            onClick={() => {
              setSeen(true)
              setVisible(true)
            }}
          >
            Подключить Phantom / Backpack
          </Button>
        </div>
      }
    >
      <div className="text-center">
        <Logo size={46} className="mx-auto" />
        <h2 className="mt-3.5 text-lg font-black uppercase tracking-tight">
          Creator <span className="grad-text">Fund</span>
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-txt-mid">
          Соберите финансирование на контент-проект или станьте со-создателем чужого. Средства блокируются в
          смарт-контракте Solana до достижения цели.
        </p>
        <div className="mt-4 space-y-2 text-left">
          {[
            {
              icon: <Lock className="size-3.5 text-sol-cyan" />,
              t: 'Эскроу вместо доверия',
              d: 'Цель достигнута — выплата автору. Нет — возврат участникам.',
            },
            {
              icon: <Sparkles className="size-3.5 text-sol-violet" />,
              t: 'Creator Pass',
              d: 'Уровень доступа за вклад: backstage, голосования, титры, премьера.',
            },
            {
              icon: <Zap className="size-3.5 text-sol-teal" />,
              t: 'Демо и devnet',
              d: 'По умолчанию транзакции симулируются. Переключатель «Devnet» отправляет их в реальную сеть.',
            },
          ].map((r) => (
            <div key={r.t} className="flex gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <span className="mt-0.5">{r.icon}</span>
              <div>
                <div className="text-[12.5px] font-semibold">{r.t}</div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-txt-mid">{r.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

export default function App() {
  return (
    <SolanaProvider>
      <HashRouter>
        <ScrollToTop />
        <WebMcpTools />
        <StateSync />
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/p/:slug" element={<ProjectPage />} />
              <Route path="/passes" element={<MyPasses />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/create" element={<CreateCampaign />} />
              <Route path="/transparency" element={<Transparency />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Feed />} />
            </Routes>
          </main>
          <Footer />
          <div className="h-[62px] lg:hidden" />
        </div>
        <MobileNav />
        <Toasts />
        <TxFlowOverlay />
        <Onboarding />
      </HashRouter>
    </SolanaProvider>
  )
}
