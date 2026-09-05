import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useLedger } from '../store/ledger'
import { useBalances } from '../store/balances'
import { requestDevnetAirdrop } from '../chain/pay'
import { SOL_USD } from '../lib/format'

/**
 * Единое представление кошелька для UI: адрес, баланс (simnet или настоящий devnet),
 * airdrop и признак того, что подключён локальный демо-ключ.
 */
export function useWalletCtx() {
  const { publicKey, connected, connecting, disconnect, wallet, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const cluster = useLedger((s) => s.cluster)
  const simBalances = useBalances((s) => s.map)
  const ensure = useBalances((s) => s.ensure)
  const faucet = useBalances((s) => s.faucet)

  const address = publicKey?.toBase58() ?? null
  const [devnetSol, setDevnetSol] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    if (address) ensure(address)
  }, [address, ensure])

  const refreshDevnetBalance = useCallback(async () => {
    if (!publicKey || cluster !== 'devnet') return
    setLoadingBalance(true)
    try {
      const lamports = await connection.getBalance(publicKey, 'confirmed')
      setDevnetSol(lamports / LAMPORTS_PER_SOL)
    } catch {
      setDevnetSol(null)
    } finally {
      setLoadingBalance(false)
    }
  }, [connection, publicKey, cluster])

  useEffect(() => {
    if (cluster !== 'devnet' || !publicKey) return
    void refreshDevnetBalance()
    const id = setInterval(() => void refreshDevnetBalance(), 20_000)
    return () => clearInterval(id)
  }, [cluster, publicKey, refreshDevnetBalance])

  const sim = address ? simBalances[address] ?? { usdc: 500, sol: 4 } : { usdc: 0, sol: 0 }

  const balance =
    cluster === 'devnet'
      ? { usdc: 0, sol: devnetSol ?? 0, usdEquivalent: (devnetSol ?? 0) * SOL_USD }
      : { usdc: sim.usdc, sol: sim.sol, usdEquivalent: sim.usdc + sim.sol * SOL_USD }

  const airdrop = useCallback(async () => {
    if (!publicKey || !address) throw new Error('Кошелёк не подключён')
    if (cluster === 'simnet') {
      faucet(address)
      return 'simnet-faucet'
    }
    const sig = await requestDevnetAirdrop(connection, publicKey, 1)
    await refreshDevnetBalance()
    return sig
  }, [publicKey, address, cluster, connection, faucet, refreshDevnetBalance])

  const isDemoWallet = (wallet?.adapter.name ?? '').startsWith('Demo Wallet')

  return {
    address,
    publicKey,
    connected,
    connecting,
    disconnect,
    walletName: wallet?.adapter.name ?? null,
    walletIcon: wallet?.adapter.icon ?? null,
    isDemoWallet,
    sendTransaction,
    connection,
    cluster,
    balance,
    loadingBalance,
    refreshDevnetBalance,
    airdrop,
  }
}
