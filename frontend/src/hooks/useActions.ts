import { useCallback } from 'react'
import type { Currency, MerchItem, Poll, Project, TierKey } from '../lib/types'
import { TIERS, tierAtLeast } from '../lib/tiers'
import { fakeSignature, uid } from '../lib/utils'
import { PAY_STEPS, PayError, executePayment } from '../chain/pay'
import { useLedger } from '../store/ledger'
import { useBalances } from '../store/balances'
import { useTxFlow } from '../store/txflow'
import { useUi } from '../store/ui'
import { useWalletCtx } from './useWalletCtx'

interface PayArgs {
  amountUsd: number
  currency: Currency
  projectId: string
  memo: string
  title: string
  subtitle?: string
  steps?: string[]
}

/** Продуктовые действия: вклад, выплата, возврат, голос, сообщение, мерч. */
export function useActions() {
  const { address, publicKey, connected, cluster, connection, sendTransaction } = useWalletCtx()
  const ledger = useLedger()
  const balances = useBalances()
  const flow = useTxFlow()
  const toast = useUi((s) => s.toast)

  const runPayment = useCallback(
    async ({ amountUsd, currency, projectId, memo, title, subtitle, steps }: PayArgs) => {
      if (!connected || !publicKey || !address) {
        toast({ tone: 'error', title: 'Подключите кошелёк', body: 'Нужен кошелёк, чтобы подписать транзакцию.' })
        throw new PayError('wallet-not-connected')
      }

      if (cluster === 'simnet' && amountUsd > 0 && !balances.canPay(address, amountUsd, currency)) {
        flow.start({ title, subtitle, steps: steps ?? PAY_STEPS, amountUsd, currency })
        flow.fail(
          `Недостаточно средств в demo-кошельке. Пополните баланс кнопкой «Пополнить» в меню кошелька.`,
        )
        throw new PayError('insufficient-funds')
      }

      flow.start({ title, subtitle, steps: steps ?? PAY_STEPS, amountUsd, currency })
      try {
        const res = await executePayment({
          amountUsd,
          currency,
          projectId,
          memo,
          cluster,
          wallet: publicKey,
          connection,
          sendTransaction: sendTransaction
            ? (tx, conn) => sendTransaction(tx, conn)
            : undefined,
          onStep: (i) => flow.advance(i),
        })
        if (cluster === 'simnet' && amountUsd > 0) balances.debit(address, amountUsd, currency)
        flow.finish(res.signature)
        return { ...res, wallet: address }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        flow.fail(msg)
        throw e
      }
    },
    [address, balances, cluster, connected, connection, flow, publicKey, sendTransaction, toast],
  )

  /** Поддержать проект: перевод в эскроу + выпуск / апгрейд Creator Pass. */
  const support = useCallback(
    async (project: Project, amountUsd: number, currency: Currency, anonymous = false) => {
      const res = await runPayment({
        amountUsd,
        currency,
        projectId: project.id,
        memo: `contribute:${amountUsd}`,
        title: 'Поддержка проекта',
        subtitle: project.title,
      })
      const { pass, upgraded } = ledger.recordContribution({
        projectId: project.id,
        wallet: res.wallet,
        amountUsd,
        currency,
        signature: res.signature,
        anonymous,
        real: res.real,
      })
      if (pass)
        toast({
          tone: 'success',
          title: upgraded ? `Pass обновлён: ${TIERS[pass.tier].name}` : `Получен Creator Pass · ${TIERS[pass.tier].name}`,
          body: 'Уровень доступа обновлён, привилегии уже активны.',
          signature: res.signature,
        })
      else
        toast({
          tone: 'success',
          title: 'Вклад заблокирован в смарт-контракте',
          body: 'Pass выдаётся с суммы $5.',
          signature: res.signature,
        })
      return { pass, upgraded, signature: res.signature }
    },
    [ledger, runPayment, toast],
  )

  /** Permissionless-кранк: любой участник может исполнить выплату успешной кампании. */
  const settle = useCallback(
    async (project: Project) => {
      const res = await runPayment({
        amountUsd: 0,
        currency: project.currency,
        projectId: project.id,
        memo: 'settle_campaign',
        title: 'Исполнение выплаты',
        subtitle: project.title,
        steps: ['Проверка условий кампании', 'Подпись в кошельке', 'Отправка в кластер', 'Распределение средств'],
      })
      const out = ledger.settleCampaign(project.id, res.wallet)
      if (out)
        toast({
          tone: 'success',
          title: 'Средства выплачены',
          body: `Автору и команде — $${Math.round(out.paidUsd).toLocaleString('en-US')}, платформе — $${out.feeUsd.toFixed(2)} (5%).`,
          signature: res.signature,
        })
      return out
    },
    [ledger, runPayment, toast],
  )

  /** Возврат средств участнику после провала кампании. */
  const refund = useCallback(
    async (project: Project) => {
      const res = await runPayment({
        amountUsd: 0,
        currency: project.currency,
        projectId: project.id,
        memo: 'claim_refund',
        title: 'Возврат средств',
        subtitle: project.title,
        steps: ['Проверка вклада в PDA', 'Подпись в кошельке', 'Отправка в кластер', 'Возврат на кошелёк'],
      })
      const total = ledger.refundContributions(project.id, res.wallet)
      if (total > 0) {
        if (cluster === 'simnet') balances.credit(res.wallet, total, project.currency)
        toast({
          tone: 'success',
          title: `Возвращено $${total.toLocaleString('en-US')}`,
          body: 'Смарт-контракт вернул вклад целиком, без комиссии платформы.',
          signature: res.signature,
        })
      } else {
        toast({ tone: 'info', title: 'Нечего возвращать', body: 'В этой кампании нет активного вклада.' })
      }
      return total
    },
    [balances, cluster, ledger, runPayment, toast],
  )

  /** Голосование: вес голоса определяется уровнем Creator Pass. */
  const vote = useCallback(
    async (project: Project, poll: Poll, optionId: string, myTier: TierKey | null) => {
      if (!tierAtLeast(myTier, poll.minTier)) {
        toast({
          tone: 'error',
          title: `Нужен уровень ${TIERS[poll.minTier].name}`,
          body: 'Поддержите проект на нужную сумму, чтобы участвовать в голосовании.',
        })
        throw new PayError('tier-too-low')
      }
      const weight = TIERS[myTier as TierKey].voteWeight || 1
      const res = await runPayment({
        amountUsd: 0,
        currency: project.currency,
        projectId: project.id,
        memo: `vote:${poll.id}:${optionId}`,
        title: 'Голосование участников',
        subtitle: poll.question,
        steps: ['Проверка Creator Pass', 'Подпись в кошельке', 'Отправка в кластер', 'Голос записан on-chain'],
      })
      ledger.castVote({
        projectId: project.id,
        pollId: poll.id,
        optionId,
        wallet: res.wallet,
        weight,
        signature: res.signature,
      })
      toast({
        tone: 'success',
        title: 'Голос учтён',
        body: `Вес голоса ×${weight} по уровню ${TIERS[myTier as TierKey].name}.`,
        signature: res.signature,
      })
    },
    [ledger, runPayment, toast],
  )

  /** Платное сообщение автору (один из платежных сценариев из ТЗ). */
  const sendMessage = useCallback(
    async (project: Project, text: string, amountUsd: number, myTier: TierKey | null, handle: string) => {
      const res = await runPayment({
        amountUsd,
        currency: project.currency,
        projectId: project.id,
        memo: 'paid_message',
        title: 'Платное сообщение',
        subtitle: project.title,
      })
      ledger.addMessage({
        id: uid('msg_'),
        projectId: project.id,
        wallet: res.wallet,
        handle,
        text,
        amountUsd,
        createdAt: new Date().toISOString(),
        signature: res.signature,
        tier: myTier,
      })
      toast({ tone: 'success', title: 'Сообщение отправлено', signature: res.signature })
    },
    [ledger, runPayment, toast],
  )

  /** Покупка мерча или цифрового товара. */
  const buyMerch = useCallback(
    async (project: Project, item: MerchItem) => {
      const res = await runPayment({
        amountUsd: item.priceUsd,
        currency: project.currency,
        projectId: project.id,
        memo: `merch:${item.id}`,
        title: 'Покупка',
        subtitle: item.title,
      })
      ledger.addOrder({
        id: uid('o_'),
        projectId: project.id,
        itemId: item.id,
        wallet: res.wallet,
        amountUsd: item.priceUsd,
        createdAt: new Date().toISOString(),
        signature: res.signature,
      })
      toast({
        tone: 'success',
        title: 'Оплачено',
        body: item.kind === 'digital' ? 'Доступ открыт в разделе «Мои Pass».' : 'Автор получил заказ на отправку.',
        signature: res.signature,
      })
    },
    [ledger, runPayment, toast],
  )

  /** Публикация новой кампании автором. */
  const publishProject = useCallback(
    async (project: Project) => {
      const res = await runPayment({
        amountUsd: 0,
        currency: project.currency,
        projectId: project.id,
        memo: 'create_campaign',
        title: 'Создание кампании',
        subtitle: project.title,
        steps: [
          'Инициализация PDA кампании',
          'Подпись в кошельке',
          'Отправка в кластер',
          'Кампания открыта для поддержки',
        ],
      })
      ledger.addProject(project)
      ledger.pushTx({
        signature: res.signature,
        kind: 'create_campaign',
        projectId: project.id,
        wallet: res.wallet,
        memo: `Кампания создана · цель $${project.goalUsd.toLocaleString('en-US')}`,
        real: res.real,
      })
      toast({
        tone: 'success',
        title: 'Кампания опубликована',
        body: 'Средства аудитории будут блокироваться в смарт-контракте.',
        signature: res.signature,
      })
      return res.signature
    },
    [ledger, runPayment, toast],
  )

  const publishBackstage = useCallback(
    (project: Project, input: { title: string; body: string; minTier: TierKey }) => {
      ledger.addBackstage(project.id, {
        id: uid('bs_'),
        title: input.title,
        body: input.body,
        minTier: input.minTier,
        publishedAt: new Date().toISOString(),
        kind: 'update',
      })
      toast({ tone: 'success', title: 'Backstage-пост опубликован' })
    },
    [ledger, toast],
  )

  const publishPoll = useCallback(
    (project: Project, input: { question: string; options: string[]; minTier: TierKey; days: number }) => {
      ledger.addPoll(project.id, {
        id: uid('poll_'),
        question: input.question,
        options: input.options.filter(Boolean).map((label, i) => ({ id: `opt${i}_${uid('')}`, label })),
        minTier: input.minTier,
        closesAt: new Date(Date.now() + input.days * 86_400_000).toISOString(),
      })
      toast({ tone: 'success', title: 'Голосование запущено' })
    },
    [ledger, toast],
  )

  return {
    support,
    settle,
    refund,
    vote,
    sendMessage,
    buyMerch,
    publishProject,
    publishBackstage,
    publishPoll,
    fakeSignature,
  }
}
