import { create } from 'zustand'
import { uid } from '../lib/utils'

export interface Toast {
  id: string
  title: string
  body?: string
  tone: 'success' | 'error' | 'info' | 'pending'
  signature?: string
  ttl?: number
}

interface UiState {
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => string
  update: (id: string, patch: Partial<Toast>) => void
  dismiss: (id: string) => void
  onboardingSeen: boolean
  setOnboardingSeen: (v: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  toasts: [],
  toast: (t) => {
    const id = uid('t_')
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    const ttl = t.ttl ?? (t.tone === 'pending' ? 0 : 5200)
    if (ttl > 0) setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), ttl)
    return id
  },
  update: (id, patch) =>
    set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  onboardingSeen: localStorage.getItem('cf.onboarding') === '1',
  setOnboardingSeen: (v) => {
    localStorage.setItem('cf.onboarding', v ? '1' : '0')
    set({ onboardingSeen: v })
  },
}))
