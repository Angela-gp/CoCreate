import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency } from '../lib/types'
import { SOL_USD } from '../lib/format'

export interface Balance {
  usdc: number
  sol: number
}

const START: Balance = { usdc: 500, sol: 4 }
export const FAUCET_USDC = 500
export const FAUCET_SOL = 4

interface BalancesState {
  map: Record<string, Balance>
  ensure: (wallet: string) => Balance
  get: (wallet: string) => Balance
  faucet: (wallet: string) => Balance
  canPay: (wallet: string, amountUsd: number, currency: Currency) => boolean
  debit: (wallet: string, amountUsd: number, currency: Currency) => boolean
  credit: (wallet: string, amountUsd: number, currency: Currency) => void
  reset: () => void
}

/** Балансы simnet-кошельков: без них «оплата» была бы бутафорией. */
export const useBalances = create<BalancesState>()(
  persist(
    (set, get) => ({
      map: {},

      ensure: (wallet) => {
        const existing = get().map[wallet]
        if (existing) return existing
        const fresh = { ...START }
        set((s) => ({ map: { ...s.map, [wallet]: fresh } }))
        return fresh
      },

      get: (wallet) => get().map[wallet] ?? START,

      faucet: (wallet) => {
        const cur = get().map[wallet] ?? { usdc: 0, sol: 0 }
        const next = { usdc: cur.usdc + FAUCET_USDC, sol: cur.sol + FAUCET_SOL }
        set((s) => ({ map: { ...s.map, [wallet]: next } }))
        return next
      },

      canPay: (wallet, amountUsd, currency) => {
        const b = get().map[wallet] ?? START
        return currency === 'USDC' ? b.usdc >= amountUsd : b.sol >= amountUsd / SOL_USD
      },

      debit: (wallet, amountUsd, currency) => {
        const b = get().map[wallet] ?? { ...START }
        if (currency === 'USDC') {
          if (b.usdc < amountUsd) return false
          set((s) => ({ map: { ...s.map, [wallet]: { ...b, usdc: b.usdc - amountUsd } } }))
        } else {
          const needed = amountUsd / SOL_USD
          if (b.sol < needed) return false
          set((s) => ({ map: { ...s.map, [wallet]: { ...b, sol: b.sol - needed } } }))
        }
        return true
      },

      credit: (wallet, amountUsd, currency) => {
        const b = get().map[wallet] ?? { ...START }
        const next =
          currency === 'USDC'
            ? { ...b, usdc: b.usdc + amountUsd }
            : { ...b, sol: b.sol + amountUsd / SOL_USD }
        set((s) => ({ map: { ...s.map, [wallet]: next } }))
      },

      reset: () => set({ map: {} }),
    }),
    { name: 'creator-fund.balances.v1' },
  ),
)
