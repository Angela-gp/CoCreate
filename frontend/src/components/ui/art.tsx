import { cn, hueGradient, initials } from '../../lib/utils'
import type { ArtScene } from '../../lib/types'

/** Логотип Solana — три скошенные полосы с брендовым градиентом. */
export function SolanaMark({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 100 78" width={size} height={(size * 78) / 100} className={cn('shrink-0', className)}>
      <defs>
        <linearGradient id="solmark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="0.5" stopColor="#00d1ff" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <g fill="url(#solmark)">
        <path d="M17 60.6c.8-.8 1.9-1.3 3-1.3h76.2c1.9 0 2.8 2.3 1.5 3.6L84.3 76.6c-.8.8-1.9 1.3-3 1.3H5.1c-1.9 0-2.8-2.3-1.5-3.6L17 60.6Z" />
        <path d="M17 1.4C17.8.5 18.9 0 20 0h76.2c1.9 0 2.8 2.3 1.5 3.6L84.3 17.4c-.8.8-1.9 1.3-3 1.3H5.1c-1.9 0-2.8-2.3-1.5-3.6L17 1.4Z" />
        <path d="M84.3 30.8c-.8-.8-1.9-1.3-3-1.3H5.1c-1.9 0-2.8 2.3-1.5 3.6L17 46.9c.8.8 1.9 1.3 3 1.3h76.2c1.9 0 2.8-2.3 1.5-3.6L84.3 30.8Z" />
      </g>
    </svg>
  )
}

export function Logo({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="cflogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00e0ff" />
          <stop offset="0.55" stopColor="#7c6bff" />
          <stop offset="1" stopColor="#c46bff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="16" fill="#0b0b12" stroke="rgba(255,255,255,.08)" />
      <path
        d="M43 19a17 17 0 1 0 0 26"
        fill="none"
        stroke="url(#cflogo)"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <rect x="34" y="28.5" width="17" height="7" rx="3.5" fill="url(#cflogo)" />
    </svg>
  )
}

export function Avatar({
  name,
  hue,
  size = 40,
  className,
  ring,
}: {
  name: string
  hue: number
  size?: number
  className?: string
  ring?: boolean
}) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-ink-950',
        ring && 'ring-2 ring-white/15',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: hueGradient(hue),
        fontSize: size * 0.36,
      }}
    >
      {initials(name)}
    </div>
  )
}

/* --------------------------------------------------------- Обложки проектов */

const SCENES: Record<ArtScene, { sky: [string, string]; accent: string; body: (id: string) => JSX.Element }> = {
  mountains: {
    sky: ['#1a1040', '#0b3a3f'],
    accent: '#ffb86b',
    body: (id) => (
      <>
        <circle cx="600" cy="150" r="46" fill="#ffb86b" opacity=".92" />
        <circle cx="600" cy="150" r="76" fill="#ffb86b" opacity=".14" />
        <path d="M0 330 L170 190 L280 280 L400 150 L560 330 Z" fill="#0c1330" opacity=".95" />
        <path d="M330 330 L470 170 L600 260 L720 165 L800 250 L800 330 Z" fill="#131a3d" opacity=".9" />
        <path d="M0 340 L120 265 L250 340 L420 240 L560 340 L700 270 L800 330 L800 450 L0 450 Z" fill="#080a1c" />
        <path d="M400 150 L430 178 L400 195 L372 178 Z" fill="#ffffff" opacity=".55" />
        <path d="M170 190 L192 212 L170 225 L148 212 Z" fill="#ffffff" opacity=".4" />
        <rect x="0" y="300" width="800" height="150" fill={`url(#haze-${id})`} />
      </>
    ),
  },
  city: {
    sky: ['#170e35', '#0a1230'],
    accent: '#00d1ff',
    body: (id) => (
      <>
        <circle cx="150" cy="120" r="34" fill="#e7e9ff" opacity=".85" />
        <circle cx="150" cy="120" r="60" fill="#e7e9ff" opacity=".1" />
        {[
          [60, 250, 70, 200],
          [140, 210, 54, 240],
          [205, 275, 62, 175],
          [280, 180, 74, 270],
          [365, 240, 58, 210],
          [432, 150, 80, 300],
          [522, 265, 66, 185],
          [598, 205, 60, 245],
          [668, 255, 78, 195],
        ].map(([x, y, w2, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w2} height={h} fill={i % 2 ? '#111a3c' : '#0c142f'} />
            {Array.from({ length: Math.floor(h / 34) }).map((_, r) =>
              Array.from({ length: Math.floor(w2 / 22) }).map((_, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={x + 8 + c * 22}
                  y={y + 12 + r * 34}
                  width="9"
                  height="13"
                  rx="1.5"
                  fill="#ffd48a"
                  opacity={(i * 7 + r * 3 + c * 5) % 4 === 0 ? 0.75 : 0.13}
                />
              )),
            )}
          </g>
        ))}
        <rect x="0" y="330" width="800" height="120" fill={`url(#haze-${id})`} />
      </>
    ),
  },
  studio: {
    sky: ['#2a0f3d', '#0d1030'],
    accent: '#ff7ab8',
    body: () => (
      <>
        <rect x="352" y="120" width="96" height="150" rx="48" fill="#1a2148" stroke="#3b3f7a" strokeWidth="3" />
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={i}
            x1="366"
            y1={142 + i * 20}
            x2="434"
            y2={142 + i * 20}
            stroke="#5b60a8"
            strokeWidth="3"
            opacity=".8"
          />
        ))}
        <rect x="393" y="270" width="14" height="60" fill="#2a3060" />
        <rect x="352" y="330" width="96" height="10" rx="5" fill="#2a3060" />
        {Array.from({ length: 26 }).map((_, i) => {
          const h = 20 + Math.abs(Math.sin(i * 1.7)) * 120
          return (
            <rect
              key={i}
              x={40 + i * 12}
              y={330 - h / 2}
              width="5"
              height={h}
              rx="2.5"
              fill={i % 3 === 0 ? '#ff7ab8' : '#7c6bff'}
              opacity={i > 6 && i < 20 ? 0.28 : 0.7}
            />
          )
        })}
        {Array.from({ length: 26 }).map((_, i) => {
          const h = 20 + Math.abs(Math.cos(i * 1.3)) * 110
          return (
            <rect
              key={`r${i}`}
              x={472 + i * 12}
              y={330 - h / 2}
              width="5"
              height={h}
              rx="2.5"
              fill={i % 4 === 0 ? '#14f195' : '#00d1ff'}
              opacity=".55"
            />
          )
        })}
      </>
    ),
  },
  desert: {
    sky: ['#3a1030', '#12163a'],
    accent: '#ff9f6b',
    body: (id) => (
      <>
        <circle cx="420" cy="185" r="58" fill="#ff9f6b" opacity=".95" />
        <path d="M0 300 Q200 240 380 300 T800 285 L800 450 L0 450 Z" fill="#2a1738" />
        <path d="M0 350 Q240 295 460 350 T800 340 L800 450 L0 450 Z" fill="#1a1030" />
        <g fill="#0b0a1e">
          <path d="M600 330 l14 -60 l6 60 z" />
          <path d="M614 272 q22 -18 40 -6 q-24 2 -40 12 z" />
          <path d="M614 272 q-24 -14 -42 -2 q24 0 42 8 z" />
        </g>
        <rect x="0" y="290" width="800" height="160" fill={`url(#haze-${id})`} />
      </>
    ),
  },
  stage: {
    sky: ['#20103c', '#0a0d28'],
    accent: '#c46bff',
    body: () => (
      <>
        <path d="M120 60 L300 330 L60 330 Z" fill="#c46bff" opacity=".16" />
        <path d="M680 60 L740 330 L500 330 Z" fill="#00d1ff" opacity=".14" />
        <rect x="0" y="330" width="800" height="120" fill="#0a0c22" />
        {Array.from({ length: 22 }).map((_, i) => (
          <circle key={i} cx={30 + i * 36} cy={358 + (i % 3) * 8} r={16 + (i % 4) * 3} fill="#05060f" />
        ))}
        <rect x="290" y="230" width="220" height="100" rx="10" fill="#161b40" />
        <rect x="316" y="252" width="168" height="56" rx="6" fill="#0d1130" />
      </>
    ),
  },
  space: {
    sky: ['#160c33', '#070a1e'],
    accent: '#7c6bff',
    body: () => (
      <>
        {Array.from({ length: 70 }).map((_, i) => (
          <circle
            key={i}
            cx={(i * 97) % 800}
            cy={(i * 53) % 330}
            r={i % 9 === 0 ? 2.4 : 1.2}
            fill="#ffffff"
            opacity={i % 5 === 0 ? 0.85 : 0.35}
          />
        ))}
        <circle cx="560" cy="180" r="82" fill="#7c6bff" opacity=".85" />
        <ellipse cx="560" cy="180" rx="130" ry="26" fill="none" stroke="#00d1ff" strokeWidth="7" opacity=".6" />
        <circle cx="200" cy="120" r="26" fill="#14f195" opacity=".55" />
      </>
    ),
  },
  code: {
    sky: ['#0f1236', '#0a1b2e'],
    accent: '#14f195',
    body: () => (
      <>
        <rect x="90" y="90" width="620" height="250" rx="16" fill="#080b20" stroke="#232a55" strokeWidth="2" />
        <rect x="90" y="90" width="620" height="34" rx="16" fill="#111634" />
        <circle cx="116" cy="107" r="5" fill="#ff5f57" />
        <circle cx="134" cy="107" r="5" fill="#febc2e" />
        <circle cx="152" cy="107" r="5" fill="#28c840" />
        {[
          [40, 200, '#7c6bff'],
          [70, 300, '#14f195'],
          [100, 240, '#00d1ff'],
          [130, 360, '#5b60a8'],
          [160, 180, '#14f195'],
          [190, 280, '#7c6bff'],
        ].map(([dy, w2, color], i) => (
          <rect key={i} x="120" y={104 + Number(dy)} width={Number(w2)} height="10" rx="5" fill={String(color)} opacity=".75" />
        ))}
      </>
    ),
  },
}

/**
 * Обложка проекта: рисуется вектором, поэтому не зависит от внешних картинок
 * и одинаково выглядит в любом окружении.
 */
export function ProjectArt({
  scene,
  className,
  id,
}: {
  scene: ArtScene
  className?: string
  id?: string
}) {
  const conf = SCENES[scene] ?? SCENES.mountains
  const gid = (id ?? scene).replace(/[^a-z0-9]/gi, '')
  return (
    <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)}>
      <defs>
        <linearGradient id={`sky-${gid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={conf.sky[0]} />
          <stop offset="1" stopColor={conf.sky[1]} />
        </linearGradient>
        <linearGradient id={`haze-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05060f" stopOpacity="0" />
          <stop offset="1" stopColor="#05060f" stopOpacity=".92" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill={`url(#sky-${gid})`} />
      {conf.body(gid)}
    </svg>
  )
}

export const sceneAccent = (scene: ArtScene) => (SCENES[scene] ?? SCENES.mountains).accent
