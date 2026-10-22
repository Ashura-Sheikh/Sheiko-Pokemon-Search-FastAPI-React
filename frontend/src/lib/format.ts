/** "mr-mime" -> "Mr Mime" (PokeAPI names are lowercase and hyphenated). */
export function displayName(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** 25 -> "#0025" */
export function pokedexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** 3 -> "Gen III" (falls back to digits beyond the table). */
export function generationLabel(generation: number): string {
  return `Gen ${ROMAN[generation] ?? generation}`
}

/** Colours per type, used for the type chips. */
export const TYPE_COLOURS: Record<string, string> = {
  normal: '#9FA19F',
  fire: '#E62829',
  water: '#2980EF',
  grass: '#3FA129',
  electric: '#FAC000',
  ice: '#3DCEF3',
  fighting: '#FF8000',
  poison: '#9141CB',
  ground: '#915121',
  flying: '#81B9EF',
  psychic: '#EF4179',
  bug: '#91A119',
  rock: '#AFA981',
  ghost: '#704170',
  dragon: '#5060E1',
  dark: '#624D4E',
  steel: '#60A1B8',
  fairy: '#EF70EF',
}

export function typeColour(type: string): string {
  return TYPE_COLOURS[type] ?? '#9FA19F'
}
