import { create } from 'zustand'
import type { TxStep } from '../lib/types'

interface TxFlowState {
  open: boolean
  title: string
  subtitle?: string
  steps: TxStep[]
  signature?: string
  error?: string
  amountUsd?: number
  currency?: string
  done: boolean
  start: (input: { title: string; subtitle?: string; steps: string[]; amountUsd?: number; currency?: string }) => void
  advance: (index: number) => void
  finish: (signature: string) => void
  fail: (error: string) => void
  close: () => void
}

export const useTxFlow = create<TxFlowState>((set, get) => ({
  open: false,
  title: '',
  steps: [],
  done: false,

  start: ({ title, subtitle, steps, amountUsd, currency }) =>
    set({
      open: true,
      title,
      subtitle,
      amountUsd,
      currency,
      signature: undefined,
      error: undefined,
      done: false,
      steps: steps.map((label, i) => ({ label, status: i === 0 ? 'active' : 'pending' })),
    }),

  advance: (index) =>
    set({
      steps: get().steps.map((s, i) => ({
        ...s,
        status: i < index ? 'done' : i === index ? 'active' : 'pending',
      })),
    }),

  finish: (signature) =>
    set({ signature, done: true, steps: get().steps.map((s) => ({ ...s, status: 'done' })) }),

  fail: (error) =>
    set({
      error,
      done: true,
      steps: get().steps.map((s) => (s.status === 'active' ? { ...s, status: 'error' } : s)),
    }),

  close: () => set({ open: false }),
}))
