import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ClusterId,
  Contribution,
  CreatorPass,
  Currency,
  MerchOrder,
  OnchainTx,
  PaidMessage,
  Project,
  TxKind,
  Vote,
} from '../lib/types'
import { TIERS, tierForAmount } from '../lib/tiers'
import { derivePda, fakeSignature, uid } from '../lib/utils'
import { SEED_PROJECTS, SEED_LEDGER } from '../data/seed'

/** Комиссия платформы с успешных кампаний — 5% (модель дохода из ТЗ). */
export const PLATFORM_FEE_BPS = 500
export const PLATFORM_TREASURY = derivePda('creator-fund', 'treasury')

const SEED_VERSION = 7

interface LedgerData {
  cluster: ClusterId
  projects: Project[]
  contributions: Contribution[]
  passes: CreatorPass[]
  txs: OnchainTx[]
  votes: Vote[]
  messages: PaidMessage[]
  orders: MerchOrder[]
  slot: number
  treasuryUsd: number
  seedVersion: number
}

interface LedgerActions {
  setCluster: (c: ClusterId) => void
  resetAll: () => void
  nextSlot: () => number
  pushTx: (
    tx: Omit<OnchainTx, 'slot' | 'ts' | 'cluster'> & Partial<Pick<OnchainTx, 'ts' | 'cluster'>>,
  ) => OnchainTx
  addProject: (p: Project) => void
  updateProject: (id: string, patch: Partial<Project>) => void
  recordContribution: (input: {
    projectId: string
    wallet: string
    amountUsd: number
    currency: Currency
    signature: string
    anonymous?: boolean
    real?: boolean
  }) => { contribution: Contribution; pass: CreatorPass | null; upgraded: boolean }
  syncStates: () => { finalized: string[] }
  settleCampaign: (projectId: string, byWallet: string) => { paidUsd: number; feeUsd: number } | null
  refundContributions: (projectId: string, wallet: string) => number
  castVote: (input: {
    projectId: string
    pollId: string
    optionId: string
    wallet: string
    weight: number
    signature: string
  }) => Vote
  addMessage: (m: PaidMessage) => void
  addOrder: (o: MerchOrder) => void
  addBackstage: (projectId: string, post: Project['backstage'][number]) => void
  addPoll: (projectId: string, poll: Project['polls'][number]) => void
}

export type LedgerStore = LedgerData & LedgerActions

const initialData = (): LedgerData => ({
  cluster: 'simnet',
  projects: SEED_PROJECTS,
  contributions: SEED_LEDGER.contributions,
  passes: [],
  txs: SEED_LEDGER.txs,
  votes: SEED_LEDGER.votes,
  messages: SEED_LEDGER.messages,
  orders: [],
  slot: 298_431_004,
  treasuryUsd: SEED_LEDGER.treasuryUsd,
  seedVersion: SEED_VERSION,
})

export const useLedger = create<LedgerStore>()(
  persist(
    (set, get) => ({
      ...initialData(),

      setCluster: (cluster) => set({ cluster }),

      resetAll: () => set({ ...initialData() }),

      nextSlot: () => {
        const slot = get().slot + Math.floor(2 + Math.random() * 6)
        set({ slot })
        return slot
      },

      pushTx: (input) => {
        const tx: OnchainTx = {
          ...input,
          slot: get().nextSlot(),
          ts: input.ts ?? new Date().toISOString(),
          cluster: input.cluster ?? get().cluster,
        }
        set((s) => ({ txs: [tx, ...s.txs].slice(0, 600) }))
        return tx
      },

      addProject: (p) => set((s) => ({ projects: [p, ...s.projects] })),

      updateProject: (id, patch) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),

      recordContribution: ({ projectId, wallet, amountUsd, currency, signature, anonymous, real }) => {
        const project = get().projects.find((p) => p.id === projectId)
        const contribution: Contribution = {
          id: uid('c_'),
          projectId,
          wallet,
          amountUsd,
          currency,
          tier: tierForAmount(amountUsd),
          createdAt: new Date().toISOString(),
          signature,
          anonymous,
        }
        set((s) => ({ contributions: [contribution, ...s.contributions] }))

        // суммарный вклад кошелька определяет уровень Pass
        const total = get()
          .contributions.filter((c) => c.projectId === projectId && c.wallet === wallet && !c.refunded)
          .reduce((a, c) => a + c.amountUsd, 0)
        const tier = tierForAmount(total)
        let pass: CreatorPass | null = null
        let upgraded = false

        if (tier) {
          const existing = get().passes.find((p) => p.projectId === projectId && p.wallet === wallet)
          if (!existing) {
            const minted: CreatorPass = {
              id: uid('pass_'),
              projectId,
              projectTitle: project?.title ?? 'Проект',
              wallet,
              tier,
              mint: derivePda('pass', projectId, wallet),
              contributedUsd: total,
              issuedAt: new Date().toISOString(),
              signature: fakeSignature(),
            }
            pass = minted
            set((s) => ({ passes: [minted, ...s.passes] }))
            get().pushTx({
              signature: minted.signature,
              kind: 'mint_pass',
              projectId,
              wallet,
              memo: 'Creator Pass · ' + TIERS[tier].name,
              real: false,
            })
          } else {
            upgraded = TIERS[tier].order > TIERS[existing.tier].order
            const updated: CreatorPass = { ...existing, tier, contributedUsd: total }
            pass = updated
            set((s) => ({ passes: s.passes.map((p) => (p.id === existing.id ? updated : p)) }))
            if (upgraded)
              get().pushTx({
                signature: fakeSignature(),
                kind: 'mint_pass',
                projectId,
                wallet,
                memo: 'Pass обновлён → ' + TIERS[tier].name,
                real: false,
              })
          }
        }

        get().pushTx({
          signature,
          kind: 'contribute',
          projectId,
          wallet,
          amountUsd,
          currency,
          memo: tier ? 'Вклад · ' + TIERS[tier].name : 'Вклад',
          real,
        })

        get().syncStates()
        return { contribution, pass, upgraded }
      },

      /** Переводит кампании между состояниями: цель достигнута / срок истёк. */
      syncStates: () => {
        const now = Date.now()
        const finalized: string[] = []
        const { projects, contributions } = get()
        const next = projects.map((p) => {
          if (p.state !== 'live') return p
          const raised =
            p.seedRaisedUsd +
            contributions
              .filter((c) => c.projectId === p.id && !c.refunded)
              .reduce((a, c) => a + c.amountUsd, 0)
          if (raised >= p.goalUsd) {
            finalized.push(p.id)
            return { ...p, state: 'successful' as const }
          }
          if (new Date(p.deadline).getTime() <= now) {
            finalized.push(p.id)
            return { ...p, state: 'failed' as const }
          }
          return p
        })
        if (finalized.length) {
          set({ projects: next })
          for (const id of finalized) {
            const p = next.find((x) => x.id === id)!
            get().pushTx({
              signature: fakeSignature(),
              kind: 'finalize',
              projectId: id,
              wallet: PLATFORM_TREASURY,
              memo:
                p.state === 'successful'
                  ? 'Цель достигнута — средства разблокированы для выплаты'
                  : 'Срок истёк — открыт возврат участникам',
              real: false,
            })
          }
        }
        return { finalized }
      },

      /** Исполнение выплаты смарт-контрактом: 95% автору и команде, 5% платформе. */
      settleCampaign: (projectId, byWallet) => {
        const p = get().projects.find((x) => x.id === projectId)
        if (!p || p.state !== 'successful') return null
        const raised =
          p.seedRaisedUsd +
          get()
            .contributions.filter((c) => c.projectId === projectId && !c.refunded)
            .reduce((a, c) => a + c.amountUsd, 0)
        const feeUsd = (raised * PLATFORM_FEE_BPS) / 10_000
        const netUsd = raised - feeUsd

        const shares: { wallet: string; label: string; bps: number }[] = [
          ...p.team.map((t) => ({ wallet: t.wallet, label: t.name + ' · ' + t.role, bps: t.shareBps })),
          ...p.partners.map((t) => ({ wallet: t.wallet, label: 'Партнёр · ' + t.name, bps: t.shareBps })),
        ]
        const usedBps = shares.reduce((a, s) => a + s.bps, 0)
        const creatorBps = Math.max(0, 10_000 - usedBps)

        get().pushTx({
          signature: fakeSignature(),
          kind: 'claim_funds',
          projectId,
          wallet: byWallet,
          amountUsd: raised,
          currency: p.currency,
          memo: 'Смарт-контракт исполнил выплату кампании',
          real: false,
        })
        if (creatorBps > 0)
          get().pushTx({
            signature: fakeSignature(),
            kind: 'payout',
            projectId,
            wallet: p.creator.wallet,
            amountUsd: (netUsd * creatorBps) / 10_000,
            currency: p.currency,
            memo: 'Блогер · ' + p.creator.name,
            real: false,
          })
        for (const s of shares)
          get().pushTx({
            signature: fakeSignature(),
            kind: 'payout',
            projectId,
            wallet: s.wallet,
            amountUsd: (netUsd * s.bps) / 10_000,
            currency: p.currency,
            memo: s.label,
            real: false,
          })
        get().pushTx({
          signature: fakeSignature(),
          kind: 'platform_fee',
          projectId,
          wallet: PLATFORM_TREASURY,
          amountUsd: feeUsd,
          currency: p.currency,
          memo: 'Комиссия платформы 5%',
          real: false,
        })

        set((s) => ({
          treasuryUsd: s.treasuryUsd + feeUsd,
          projects: s.projects.map((x) => (x.id === projectId ? { ...x, state: 'claimed' } : x)),
        }))
        return { paidUsd: netUsd, feeUsd }
      },

      refundContributions: (projectId, wallet) => {
        const mine = get().contributions.filter(
          (c) => c.projectId === projectId && c.wallet === wallet && !c.refunded,
        )
        if (!mine.length) return 0
        const total = mine.reduce((a, c) => a + c.amountUsd, 0)
        const ids = new Set(mine.map((c) => c.id))
        set((s) => ({
          contributions: s.contributions.map((c) => (ids.has(c.id) ? { ...c, refunded: true } : c)),
          passes: s.passes.filter((p) => !(p.projectId === projectId && p.wallet === wallet)),
        }))
        get().pushTx({
          signature: fakeSignature(),
          kind: 'refund',
          projectId,
          wallet,
          amountUsd: total,
          currency: get().projects.find((p) => p.id === projectId)?.currency ?? 'USDC',
          memo: 'Возврат средств из смарт-контракта',
          real: false,
        })
        const rest = get().contributions.filter((c) => c.projectId === projectId && !c.refunded)
        if (!rest.length) get().updateProject(projectId, { state: 'refunded' })
        return total
      },

      castVote: ({ projectId, pollId, optionId, wallet, weight, signature }) => {
        const vote: Vote = {
          id: uid('v_'),
          pollId,
          projectId,
          wallet,
          optionId,
          weight,
          createdAt: new Date().toISOString(),
          signature,
        }
        set((s) => ({
          votes: [vote, ...s.votes.filter((v) => !(v.pollId === pollId && v.wallet === wallet))],
        }))
        get().pushTx({
          signature,
          kind: 'vote',
          projectId,
          wallet,
          memo: 'Голос · вес ×' + weight,
          real: false,
        })
        return vote
      },

      addMessage: (m) => {
        set((s) => ({ messages: [m, ...s.messages] }))
        get().pushTx({
          signature: m.signature,
          kind: 'message',
          projectId: m.projectId,
          wallet: m.wallet,
          amountUsd: m.amountUsd,
          memo: 'Платное сообщение автору',
          real: false,
        })
      },

      addOrder: (o) => {
        set((s) => ({ orders: [o, ...s.orders] }))
        get().pushTx({
          signature: o.signature,
          kind: 'merch',
          projectId: o.projectId,
          wallet: o.wallet,
          amountUsd: o.amountUsd,
          memo: 'Покупка мерча / цифрового товара',
          real: false,
        })
      },

      addBackstage: (projectId, post) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId ? { ...p, backstage: [post, ...p.backstage] } : p,
          ),
        })),

      addPoll: (projectId, poll) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === projectId ? { ...p, polls: [poll, ...p.polls] } : p)),
        })),
    }),
    {
      name: 'creator-fund.ledger.v1',
      version: SEED_VERSION,
      migrate: (state) => {
        const s = state as LedgerData | undefined
        if (!s || s.seedVersion !== SEED_VERSION) return initialData() as never
        return s as never
      },
    },
  ),
)

export const txKindLabel: Record<TxKind, string> = {
  create_campaign: 'Создание кампании',
  contribute: 'Вклад в проект',
  mint_pass: 'Выпуск Creator Pass',
  finalize: 'Финализация кампании',
  claim_funds: 'Выплата кампании',
  payout: 'Перевод получателю',
  refund: 'Возврат участнику',
  vote: 'Голосование',
  message: 'Платное сообщение',
  merch: 'Мерч / цифровой товар',
  platform_fee: 'Комиссия платформы',
  airdrop: 'Airdrop devnet',
}
