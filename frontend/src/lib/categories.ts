import type { ProjectCategory } from './types'

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  film: 'Документалистика',
  series: 'Веб-сериал',
  music: 'Музыка',
  game: 'Игра',
  podcast: 'Подкаст',
  education: 'Образование',
  merch: 'Мерч',
}

export const CATEGORY_EMOJI: Record<ProjectCategory, string> = {
  film: '🎬',
  series: '📺',
  music: '🎵',
  game: '🎮',
  podcast: '🎙️',
  education: '📚',
  merch: '👕',
}

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as ProjectCategory[]
