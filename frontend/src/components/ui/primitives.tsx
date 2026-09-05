import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, ExternalLink, Loader2, X } from 'lucide-react'
import { cn, explorerUrl, short } from '../../lib/utils'

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'solana' | 'ghost' | 'outline' | 'danger' | 'success' | 'subtle'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-sol-purple text-white hover:bg-[#8a3af0] active:bg-[#7c31da] shadow-[0_10px_30px_-12px_rgba(153,69,255,.7)]',
  solana:
    'bg-sol-grad text-ink-950 font-semibold hover:brightness-110 active:brightness-95 shadow-[0_10px_30px_-12px_rgba(20,241,149,.55)]',
  ghost: 'bg-white/[0.04] text-txt-hi hover:bg-white/[0.08] border border-white/[0.07]',
  outline: 'border border-white/15 text-txt-hi hover:bg-white/[0.06] hover:border-white/25',
  danger: 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25',
  success: 'bg-good/15 text-good border border-good/30 hover:bg-good/25',
  subtle: 'text-txt-mid hover:text-txt-hi hover:bg-white/[0.05]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-5 text-[15px] rounded-xl gap-2.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  full?: boolean
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', loading, full, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sol-purple/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
})

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  as: As = 'div',
  hover,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { as?: 'div' | 'section' | 'article'; hover?: boolean }) {
  return (
    <As
      className={cn(
        'panel p-5',
        hover && 'transition-all duration-200 hover:border-white/[0.14] hover:bg-ink-800/80',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  hint,
  right,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  hint?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
        {hint && <p className="mt-1 text-[13px] leading-relaxed text-txt-mid">{hint}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

/* ----------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: ReactNode
  tone?: 'neutral' | 'live' | 'good' | 'bad' | 'warn' | 'purple' | 'cyan'
  className?: string
  icon?: ReactNode
}) {
  const tones: Record<string, string> = {
    neutral: 'border-white/10 bg-white/[0.05] text-txt-mid',
    live: 'border-sol-teal/25 bg-sol-teal/10 text-sol-teal',
    good: 'border-good/25 bg-good/10 text-good',
    bad: 'border-bad/25 bg-bad/10 text-bad',
    warn: 'border-warn/25 bg-warn/10 text-warn',
    purple: 'border-sol-purple/30 bg-sol-purple/12 text-sol-violet',
    cyan: 'border-sol-cyan/30 bg-sol-cyan/12 text-sol-cyan',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/* -------------------------------------------------------------- Progress */

export function Progress({
  value,
  className,
  showGlow = true,
  height = 'h-2',
}: {
  value: number
  className?: string
  showGlow?: boolean
  height?: string
}) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('relative w-full overflow-hidden rounded-full bg-white/[0.07]', height, className)}>
      <div
        className="h-full rounded-full bg-sol-grad transition-[width] duration-700 ease-out"
        style={{ width: `${v}%` }}
      />
      {showGlow && v > 0 && (
        <div
          className="pointer-events-none absolute top-0 h-full w-8 rounded-full bg-white/25 blur-[6px] transition-all duration-700"
          style={{ left: `calc(${v}% - 32px)` }}
        />
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  dismissable = true,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  dismissable?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissable && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, dismissable])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-md animate-fade-in"
        onClick={() => dismissable && onClose()}
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden border border-white/[0.09] bg-ink-850 shadow-2xl animate-scale-in',
          'rounded-t-3xl sm:rounded-2xl',
          widths[size],
        )}
      >
        {(title || dismissable) && (
          <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div className="min-w-0">
              {title && <h3 className="truncate text-[15px] font-semibold">{title}</h3>}
              {subtitle && <p className="mt-0.5 truncate text-xs text-txt-mid">{subtitle}</p>}
            </div>
            {dismissable && (
              <button
                onClick={onClose}
                className="-mr-1 -mt-1 rounded-lg p-1.5 text-txt-lo transition hover:bg-white/5 hover:text-txt-hi"
                aria-label="Закрыть"
              >
                <X className="size-4" />
              </button>
            )}
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-white/[0.07] px-5 py-4">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ Tabs */

const TabsCtx = createContext<{ value: string; set: (v: string) => void } | null>(null)

export function Tabs({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <TabsCtx.Provider value={{ value, set: onChange }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  )
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'hide-scroll flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-ink-850/70 p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Tab({ id, children, count }: { id: string; children: ReactNode; count?: number }) {
  const ctx = useContext(TabsCtx)!
  const active = ctx.value === id
  return (
    <button
      onClick={() => ctx.set(id)}
      className={cn(
        'relative shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all',
        active ? 'bg-white/[0.09] text-txt-hi shadow-sm' : 'text-txt-mid hover:text-txt-hi',
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn('ml-1.5 num text-[11px]', active ? 'text-sol-teal' : 'text-txt-lo')}>{count}</span>
      )}
    </button>
  )
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)!
  if (ctx.value !== id) return null
  return <div className="animate-fade-in">{children}</div>
}

/* ---------------------------------------------------------------- Utils */

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1600)
        } catch {
          /* clipboard недоступен */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-txt-lo transition hover:bg-white/5 hover:text-txt-hi"
      title="Скопировать"
    >
      {done ? <Check className="size-3 text-good" /> : <Copy className="size-3" />}
      {label}
    </button>
  )
}

export function AddressChip({
  address,
  cluster = 'devnet',
  kind = 'address',
  className,
  size = 4,
}: {
  address: string
  cluster?: 'devnet' | 'simnet'
  kind?: 'address' | 'tx'
  className?: string
  size?: number
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <a
        href={explorerUrl(address, cluster, kind === 'tx' ? 'tx' : 'address')}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="num inline-flex items-center gap-1 text-[11px] text-txt-mid transition hover:text-sol-cyan"
        title={address}
      >
        {short(address, size)}
        <ExternalLink className="size-2.5 opacity-60" />
      </a>
      <CopyButton text={address} />
    </span>
  )
}

export function Stat({
  label,
  value,
  sub,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: 'good' | 'purple' | 'cyan'
  className?: string
}) {
  const toneCls =
    tone === 'good' ? 'text-good' : tone === 'purple' ? 'text-sol-violet' : tone === 'cyan' ? 'text-sol-cyan' : ''
  return (
    <div className={cn('panel-flat p-3.5', className)}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-txt-lo">{label}</div>
      <div className={cn('num mt-1.5 text-lg font-bold leading-none', toneCls)}>{value}</div>
      {sub && <div className="mt-1 text-[11px] leading-tight text-txt-lo">{sub}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-white/[0.09] px-6 py-12 text-center">
      {icon && <div className="mb-3 text-txt-lo">{icon}</div>}
      <h4 className="text-sm font-semibold">{title}</h4>
      {body && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-txt-mid">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-txt-hi">
          {label}
          {required && <span className="ml-0.5 text-sol-violet">*</span>}
        </span>
        {hint && <span className="text-[11px] text-txt-lo">{hint}</span>}
      </div>
      {children}
      {error && <div className="mt-1.5 text-[11.5px] text-bad">{error}</div>}
    </label>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-white/[0.08] bg-ink-850/80 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
            value === o.value ? 'bg-white/[0.1] text-txt-hi' : 'text-txt-mid hover:text-txt-hi',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-1 left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-ink-700 px-2.5 py-1.5 text-[11.5px] leading-snug text-txt-hi opacity-0 shadow-xl transition-opacity group-hover/tt:opacity-100">
        {label}
      </span>
    </span>
  )
}
