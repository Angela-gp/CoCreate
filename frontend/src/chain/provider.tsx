import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { DemoWalletAdapter } from './DemoWalletAdapter'
import '../styles/wallet-adapter.css'

/**
 * Кошельки: Phantom / Backpack / Solflare подхватываются автоматически через
 * Wallet Standard, плюс всегда доступен локальный демо-кошелёк.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet'),
    [],
  )
  const wallets = useMemo(() => [new DemoWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
