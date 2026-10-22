import { describe, expect, it } from 'vitest'

import { displayName, generationLabel, pokedexNumber, typeColour } from './format'

describe('format', () => {
  it('turns PokeAPI names into display names', () => {
    expect(displayName('bulbasaur')).toBe('Bulbasaur')
    expect(displayName('mr-mime')).toBe('Mr Mime')
    expect(displayName('tapu-koko')).toBe('Tapu Koko')
  })

  it('pads Pokédex numbers to 4 digits', () => {
    expect(pokedexNumber(1)).toBe('#0001')
    expect(pokedexNumber(1025)).toBe('#1025')
  })

  it('labels generations in Roman numerals', () => {
    expect(generationLabel(1)).toBe('Gen I')
    expect(generationLabel(9)).toBe('Gen IX')
    expect(generationLabel(13)).toBe('Gen 13')
  })

  it('falls back to a neutral colour for an unknown type', () => {
    expect(typeColour('fire')).toBe('#E62829')
    expect(typeColour('stellar')).toBe('#9FA19F')
  })
})
