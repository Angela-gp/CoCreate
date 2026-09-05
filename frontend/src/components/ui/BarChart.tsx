import { useState } from 'react'
import { cn } from '../../lib/utils'
import { usd, usdCompact } from '../../lib/format'

export interface BarDatum {
  date: string
  usd: number
}

/**
 * Дневной сбор кампании: одна серия величин во времени → столбики.
 * Один оттенок (серия одна — легенда не нужна), тонкие метки, скруглённые
 * концы у базовой линии, ховер-подсказка на каждом столбике и таблица-дубль
 * для доступности.
 */
export function DailyFundingChart({
  data,
  height = 132,
  className,
}: {
  data: BarDatum[]
  height?: number
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const max = Math.max(1, ...data.map((d) => d.usd))
  const peak = data.reduce((best, d, i) => (d.usd > data[best].usd ? i : best), 0)
  const total = data.reduce((a, d) => a + d.usd, 0)
  const width = 100 // проценты, вёрстка тянется по контейнеру
  const gap = 2
  const barW = (width - gap * (data.length - 1)) / data.length

  const fmtDay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className={cn('relative', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[12.5px] font-semibold">Сбор по дням · 14 дней</div>
          <div className="num text-[11px] text-txt-lo">
            всего за период {usd(total)} · пик {usdCompact(max)}
          </div>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="text-[11px] text-txt-lo transition hover:text-txt-mid"
        >
          {showTable ? 'скрыть таблицу' : 'таблицей'}
        </button>
      </div>

      <div className="relative" style={{ height }}>
        {/* верхняя отметка масштаба */}
        <div className="absolute inset-x-0 top-0 flex items-center gap-2">
          <span className="num shrink-0 text-[9.5px] text-txt-lo">{usdCompact(max)}</span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
          role="img"
          aria-label="Сбор средств по дням за последние 14 дней"
        >
          {data.map((d, i) => {
            const h = d.usd > 0 ? Math.max(3, (d.usd / max) * (height - 14)) : 1.5
            const x = i * (barW + gap)
            const y = height - h
            const active = hover === i
            return (
              <g key={d.date}>
                {/* увеличенная зона наведения */}
                <rect
                  x={x - gap / 2}
                  y={0}
                  width={barW + gap}
                  height={height}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={Math.min(2, barW / 2)}
                  fill={d.usd > 0 ? '#b583ff' : 'rgba(255,255,255,.12)'}
                  opacity={hover === null || active ? 1 : 0.45}
                  className="transition-opacity duration-150"
                />
              </g>
            )
          })}
          <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,.1)" strokeWidth="0.6" />
        </svg>

        {/* прямая подпись только у пика */}
        {data[peak]?.usd > 0 && hover === null && (
          <div
            className="num pointer-events-none absolute -translate-x-1/2 text-[10px] font-bold text-sol-violet"
            style={{
              left: `${((peak * (barW + gap) + barW / 2) / width) * 100}%`,
              bottom: `${((data[peak].usd / max) * (height - 14) / height) * 100 + 2}%`,
            }}
          >
            {usdCompact(data[peak].usd)}
          </div>
        )}

        {/* подсказка при наведении */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-white/[0.12] bg-ink-700 px-2 py-1.5 shadow-xl"
            style={{
              left: `${Math.min(88, Math.max(12, ((hover * (barW + gap) + barW / 2) / width) * 100))}%`,
              bottom: '100%',
            }}
          >
            <div className="num text-[11.5px] font-bold text-txt-hi">{usd(data[hover].usd, { cents: true })}</div>
            <div className="num text-[10px] text-txt-lo">{fmtDay(data[hover].date)}</div>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[9.5px] text-txt-lo">
        <span className="num">{fmtDay(data[0]?.date ?? '')}</span>
        <span className="num">{fmtDay(data[data.length - 1]?.date ?? '')}</span>
      </div>

      {showTable && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-white/[0.07]">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-ink-800">
              <tr className="text-txt-lo">
                <th className="px-2.5 py-1.5 text-left font-medium">Дата</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Собрано</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-white/[0.05]">
                  <td className="num px-2.5 py-1 text-txt-mid">{fmtDay(d.date)}</td>
                  <td className="num px-2.5 py-1 text-right text-txt-hi">{usd(d.usd, { cents: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
