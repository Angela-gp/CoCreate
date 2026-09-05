import {
  BaseSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  type SupportedTransactionVersions,
} from '@solana/wallet-adapter-base'
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'

const STORAGE_KEY = 'cf.demo-wallet.secret'

const ICON =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9945FF"/><stop offset="1" stop-color="#14F195"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="#0b0b12"/><rect x="12" y="19" width="40" height="26" rx="7" fill="none" stroke="url(#g)" stroke-width="4"/><circle cx="41" cy="32" r="4" fill="url(#g)"/></svg>`,
  )

function loadKeypair(): Keypair {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = Uint8Array.from(JSON.parse(raw) as number[])
      if (arr.length === 64) return Keypair.fromSecretKey(arr)
    }
  } catch {
    /* игнорируем повреждённое хранилище */
  }
  const kp = Keypair.generate()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(kp.secretKey)))
  return kp
}

/**
 * Демо-кошелёк: настоящая пара ключей ed25519, живущая в localStorage.
 * Нужен, чтобы весь продукт (эскроу, Pass, голосования, выплаты) можно было
 * пройти без установки расширения. Подписывает реальные транзакции —
 * в devnet-режиме их можно отправить в сеть после airdrop.
 */
export class DemoWalletAdapter extends BaseSignerWalletAdapter {
  name = 'Demo Wallet (локальный ключ)' as WalletName<'Demo Wallet (локальный ключ)'>
  url = 'https://solana.com/developers'
  icon = ICON
  supportedTransactionVersions: SupportedTransactionVersions = new Set(['legacy', 0])

  private _keypair: Keypair | null = null
  private _connecting = false

  get connecting() {
    return this._connecting
  }

  get publicKey(): PublicKey | null {
    return this._keypair?.publicKey ?? null
  }

  get readyState() {
    return WalletReadyState.Installed
  }

  get keypair() {
    return this._keypair
  }

  async connect(): Promise<void> {
    if (this.connecting) return
    this._connecting = true
    try {
      if (!this._keypair) this._keypair = loadKeypair()
      // событие отправляем всегда: при повторном монтировании (StrictMode)
      // провайдер подписывается заново и иначе не узнает про publicKey
      this.emit('connect', this._keypair.publicKey)
    } finally {
      this._connecting = false
    }
  }

  async disconnect(): Promise<void> {
    this._keypair = null
    this.emit('disconnect')
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    const kp = this._keypair
    if (!kp) throw new Error('Кошелёк не подключён')
    if (tx instanceof VersionedTransaction) tx.sign([kp])
    else tx.partialSign(kp)
    return tx
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const kp = this._keypair
    if (!kp) throw new Error('Кошелёк не подключён')
    const nacl = await import('tweetnacl')
    return nacl.default.sign.detached(message, kp.secretKey)
  }

  /** Экспорт секретного ключа для импорта в Phantom (только демо-режим). */
  exportSecret(): number[] | null {
    return this._keypair ? Array.from(this._keypair.secretKey) : null
  }
}
