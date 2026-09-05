import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import type { ClusterId, Currency } from '../lib/types'
import { DEVNET_USD_TO_SOL } from '../lib/format'
import { fakeSignature, sleep } from '../lib/utils'
import { MEMO_PROGRAM_ID, devnetVaultFor } from './addresses'

export interface PayRequest {
  amountUsd: number
  currency: Currency
  projectId: string
  memo: string
  cluster: ClusterId
  wallet: PublicKey
  connection: Connection
  sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>
  onStep?: (index: number) => void
}

export interface PayResult {
  signature: string
  real: boolean
  lamports?: number
}

export const PAY_STEPS = [
  'Формируем инструкцию программы',
  'Подпись в кошельке',
  'Отправка в кластер Solana',
  'Подтверждение блока',
]

/** Ошибка, понятная пользователю (показывается в оверлее транзакции). */
export class PayError extends Error {}

/**
 * Единая точка «оплаты». simnet — детерминированная симуляция эскроу-инструкции,
 * devnet — настоящая транзакция: перевод на PDA-хранилище кампании + memo.
 */
export async function executePayment(req: PayRequest): Promise<PayResult> {
  const step = req.onStep ?? (() => {})

  if (req.cluster === 'simnet') {
    step(0)
    await sleep(420)
    step(1)
    await sleep(520)
    step(2)
    await sleep(460)
    step(3)
    await sleep(380)
    return { signature: fakeSignature(), real: false }
  }

  if (!req.sendTransaction) throw new PayError('Кошелёк не поддерживает отправку транзакций')

  step(0)
  const vault = devnetVaultFor(req.projectId)
  const tx = new Transaction()

  const lamports = Math.max(0, Math.round(req.amountUsd * DEVNET_USD_TO_SOL * LAMPORTS_PER_SOL))
  if (lamports > 0) {
    tx.add(SystemProgram.transfer({ fromPubkey: req.wallet, toPubkey: vault, lamports }))
  }
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: req.wallet, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(`creator-fund:${req.projectId}:${req.memo}`, 'utf8'),
    }),
  )

  const { blockhash, lastValidBlockHeight } = await req.connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = req.wallet

  if (lamports > 0) {
    const balance = await req.connection.getBalance(req.wallet)
    if (balance < lamports + 10_000)
      throw new PayError(
        `Недостаточно devnet SOL: нужно ~${((lamports + 10_000) / LAMPORTS_PER_SOL).toFixed(4)} SOL. Запросите airdrop в меню кошелька.`,
      )
  }

  step(1)
  let signature: string
  try {
    signature = await req.sendTransaction(tx, req.connection)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new PayError(msg.includes('User rejected') ? 'Пользователь отклонил подпись' : msg)
  }

  step(2)
  await sleep(120)
  step(3)
  await req.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed')
  return { signature, real: true, lamports }
}

export async function requestDevnetAirdrop(connection: Connection, wallet: PublicKey, sols = 1) {
  const signature = await connection.requestAirdrop(wallet, sols * LAMPORTS_PER_SOL)
  const latest = await connection.getLatestBlockhash('confirmed')
  await connection.confirmTransaction({ signature, ...latest }, 'confirmed')
  return signature
}
