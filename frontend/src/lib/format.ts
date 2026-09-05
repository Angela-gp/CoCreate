/** Курс для демонстрации: 1 SOL = 150 USD (в реальном продукте — оракул Pyth). */
export const SOL_USD = 150

/** Множитель для devnet-платежей: 1 USD демо-вклада = 0.001 SOL,
 *  чтобы airdrop devnet хватало на полноценный сценарий. */
export const DEVNET_USD_TO_SOL = 0.001

export const usd = (n: number, opts: { cents?: boolean } = {}) =>
  '$' +
  n.toLocaleString('en-US', {
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : n < 100 ? 2 : 0,
  })

export const usdCompact = (n: number) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M'
  if (n >= 10_000) return '$' + Math.round(n / 1000) + 'K'
  return usd(n)
}

export const sol = (n: number) => n.toFixed(n < 1 ? 4 : 2) + ' SOL'

export const usdToSol = (n: number) => n / SOL_USD

export const compactNum = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace('.0', '') + 'K'
  return String(n)
}

export const pct = (a: number, b: number) => (b <= 0 ? 0 : Math.min(999, (a / b) * 100))

const RU_PLURAL = (n: number, forms: [string, string, string]) => {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

export function timeLeft(deadlineIso: string, now = Date.now()) {
  const ms = new Date(deadlineIso).getTime() - now
  if (ms <= 0) return { over: true, label: 'срок истёк', days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 }
  const s = Math.floor(ms / 1000)
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  const seconds = s % 60
  const label = days > 0 ? days + ' ' + RU_PLURAL(days, ['день', 'дня', 'дней']) : hours + ' ч ' + minutes + ' мин'
  return { over: false, label, days, hours, minutes, seconds, ms }
}

export function daysLeft(deadlineIso: string, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - now) / 86_400_000))
}

export function plural(n: number, forms: [string, string, string]) {
  return `${n} ${RU_PLURAL(n, forms)}`
}

export function relTime(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч назад`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ${RU_PLURAL(d, ['день', 'дня', 'дней'])} назад`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export const dateRu = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export const dateShortRu = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

export const timeRu = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

/** «1 участник / 2 участника / 214 участников», для больших чисел — компактно. */
export const backersLabel = (n: number) =>
  n < 1000 ? plural(n, ['участник', 'участника', 'участников']) : compactNum(n) + ' участников'
