import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** Псевдо-base58 строка нужной длины (для simnet-подписей и адресов). */
export function b58(len: number) {
  let out = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) out += B58[bytes[i] % B58.length]
  return out
}

export const fakeSignature = () => b58(88)
export const fakeAddress = () => b58(44)
export const uid = (prefix = '') => prefix + b58(10)

/** Детерминированный PDA-подобный адрес: одинаковые seeds → одинаковый адрес. */
export function derivePda(...seeds: (string | number)[]) {
  const input = seeds.join(':')
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < input.length; i++) {
    h1 = (h1 ^ input.charCodeAt(i)) * 0x01000193
    h2 = (h2 + input.charCodeAt(i) * (i + 7)) * 0x85ebca6b
    h1 >>>= 0
    h2 >>>= 0
  }
  let out = ''
  let x = h1
  let y = h2
  for (let i = 0; i < 44; i++) {
    x = (x * 1103515245 + 12345) >>> 0
    y = (y ^ (x >>> 7)) >>> 0
    out += B58[((x ^ y) >>> 0) % B58.length]
  }
  return out
}

export const short = (addr: string, size = 4) =>
  addr.length <= size * 2 + 3 ? addr : `${addr.slice(0, size)}…${addr.slice(-size)}`

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const sum = <T,>(arr: T[], get: (x: T) => number) => arr.reduce((a, x) => a + get(x), 0)

export function groupBy<T, K extends string>(arr: T[], key: (x: T) => K) {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    ;(acc[k] ||= []).push(item)
    return acc
  }, {})
}

export const explorerUrl = (signature: string, cluster: 'devnet' | 'simnet', kind: 'tx' | 'address' = 'tx') =>
  cluster === 'devnet'
    ? `https://explorer.solana.com/${kind}/${signature}?cluster=devnet`
    : `https://explorer.solana.com/${kind}/${signature}?cluster=devnet`

export function hueGradient(hue: number) {
  return `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 60) % 360} 85% 55%))`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
