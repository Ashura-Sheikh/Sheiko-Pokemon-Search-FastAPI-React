import { displayName } from './format'

const METHOD_LABELS: Record<string, string> = {
  'level-up': 'Level-up',
  machine: 'TM',
  egg: 'Egg',
  tutor: 'Tutor',
}

/** "machine" -> "TM"; unknown methods fall back to a readable name. */
export function methodLabel(method: string): string {
  return METHOD_LABELS[method] ?? displayName(method)
}

/** 12 -> "Lv. 12"; 0 -> "Evo." (learned on evolution).
 *  Checked in the seeded data: first-stage Pokémon (Bulbasaur, Charmander, Squirtle,
 *  Pichu, Eevee) have no level-0 moves, while evolved ones have exactly their known
 *  evolution move at 0 (Charizard: Air Slash, Raichu: Thunder Punch, Jolteon:
 *  Thunder Shock). */
export function levelLabel(level: number | null): string {
  if (level === null) return ''
  return level === 0 ? 'Evo.' : `Lv. ${level}`
}
