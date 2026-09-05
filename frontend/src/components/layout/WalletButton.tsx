import { useEffect, useRef, useState } from 'react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import {
  ChevronDown,
  Download,
  ExternalLink,
  LogOut,
  Plus,
  RefreshCw,
  Wallet as WalletIcon,
} from 'lucide-react'
import { useWalletCtx } from '../../hooks/useWalletCtx'
import { useUi } from '../../store/ui'
import { usd, sol as fmtSol } from '../../lib/format'
import { cn, explorerUrl, short } from '../../lib/utils'
import { Button, CopyButton } from '../ui/primitives'
import { SolanaMark } from '../ui/art'

export function WalletButton({ className }: { className?: string }) {
  const { setVisible } = useWalletModal()
  const {
    address,
    connected,
    connecting,
    disconnect,
    walletName,
    isDemoWallet,
    cluster,
    balance,
    airdrop,
    refreshDevnetBalance,
    loadingBalance,
  } = useWalletCtx()
  const toast = useUi((s) => s.toast)
  const dismiss = useUi((s) => s.dismiss)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!connected || !address)
    return (
      <Button
        variant="solana"
        size="md"
        loading={connecting}
        onClick={() => setVisible(true)}
        className={className}
        icon={<SolanaMark size={15} className="brightness-0" />}
      >
        Подключить кошелёк
      </Button>
    )

  const topUp = async () => {
    setBusy(true)
    // web3.js повторяет запрос к faucet с задержками, поэтому сразу показываем
    // прогресс: иначе кнопка «крутится» до десяти секунд без объяснений.
    const pendingId =
      cluster === 'devnet'
        ? toast({ tone: 'pending', title: 'Запрашиваем airdrop в devnet', body: 'Публичный faucet может отвечать не сразу.' })
        : null
    try {
      const sig = await airdrop()
      if (pendingId) dismiss(pendingId)
      toast({
        tone: 'success',
        title: cluster === 'simnet' ? 'Демо-баланс пополнен' : 'Airdrop 1 devnet SOL получен',
        body: cluster === 'simnet' ? '+500 USDC и +4 SOL на демо-кошелёк.' : undefined,
        signature: sig === 'simnet-faucet' ? undefined : sig,
      })
    } catch (e) {
      if (pendingId) dismiss(pendingId)
      const msg = e instanceof Error ? e.message : String(e)
      const rateLimited = /429|airdrop limit|faucet has run dry/i.test(msg)
      toast({
        tone: 'error',
        title: rateLimited ? 'Devnet-faucet ограничил запросы' : 'Не удалось пополнить',
        body: rateLimited
          ? 'Лимит airdrop на сегодня исчерпан. Возьмите тестовый SOL на faucet.solana.com или продолжите в демо-режиме.'
          : msg,
        ttl: 9000,
      })
    } finally {
      setBusy(false)
    }
  }

  const exportKey = () => {
    const raw = localStorage.getItem('cf.demo-wallet.secret')
    if (!raw) return
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'creator-fund-demo-keypair.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({
      tone: 'info',
      title: 'Ключ демо-кошелька сохранён',
      body: 'Можно импортировать в Phantom (devnet) или использовать с solana CLI.',
    })
  }

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.09] bg-ink-850/90 pl-2.5 pr-2 text-sm transition hover:border-white/20"
      >
        <span className="grid size-6 place-items-center rounded-md bg-sol-grad">
          <WalletIcon className="size-3.5 text-ink-950" strokeWidth={2.6} />
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="num text-[12.5px] font-semibold">{short(address, 4)}</span>
          <span className="num text-[10.5px] text-txt-lo">
            {cluster === 'simnet' ? usd(balance.usdc) : fmtSol(balance.sol)}
          </span>
        </span>
        <span className="num text-[12px] font-semibold sm:hidden">{short(address, 3)}</span>
        <ChevronDown className={cn('size-3.5 text-txt-lo transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[300px] overflow-hidden rounded-xl2 border border-white/[0.09] bg-ink-800 shadow-2xl animate-scale-in">
          <div className="border-b border-white/[0.07] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-lo">
                {walletName ?? 'Кошелёк'}
              </span>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase',
                  cluster === 'devnet'
                    ? 'border-sol-teal/30 bg-sol-teal/10 text-sol-teal'
                    : 'border-sol-purple/30 bg-sol-purple/10 text-sol-violet',
                )}
              >
                {cluster === 'devnet' ? 'devnet' : 'simnet'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              <a
                href={explorerUrl(address, cluster === 'devnet' ? 'devnet' : 'simnet', 'address')}
                target="_blank"
                rel="noreferrer"
                className="num flex items-center gap-1 text-[12.5px] text-txt-hi hover:text-sol-cyan"
              >
                {short(address, 8)}
                <ExternalLink className="size-3 opacity-60" />
              </a>
              <CopyButton text={address} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2">
                <div className="text-[10px] uppercase tracking-wider text-txt-lo">USDC</div>
                <div className="num text-sm font-bold">
                  {cluster === 'devnet' ? '—' : balance.usdc.toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-txt-lo">
                  SOL
                  {cluster === 'devnet' && (
                    <button onClick={() => void refreshDevnetBalance()} title="Обновить">
                      <RefreshCw className={cn('size-2.5', loadingBalance && 'animate-spin')} />
                    </button>
                  )}
                </div>
                <div className="num text-sm font-bold">{balance.sol.toFixed(4)}</div>
              </div>
            </div>
          </div>

          <div className="p-2">
            <MenuItem icon={<Plus className="size-3.5" />} onClick={topUp} busy={busy}>
              {cluster === 'simnet' ? 'Пополнить демо-баланс' : 'Airdrop 1 SOL (devnet)'}
            </MenuItem>
            {isDemoWallet && (
              <MenuItem icon={<Download className="size-3.5" />} onClick={exportKey}>
                Скачать ключ демо-кошелька
              </MenuItem>
            )}
            <MenuItem
              icon={<LogOut className="size-3.5" />}
              onClick={() => {
                void disconnect()
                setOpen(false)
              }}
              danger
            >
              Отключить
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({
  icon,
  children,
  onClick,
  danger,
  busy,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
  busy?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition disabled:opacity-50',
        danger ? 'text-bad hover:bg-bad/10' : 'text-txt-mid hover:bg-white/[0.06] hover:text-txt-hi',
      )}
    >
      {icon}
      {children}
    </button>
  )
}
