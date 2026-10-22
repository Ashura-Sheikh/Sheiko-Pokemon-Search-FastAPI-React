import { describe, expect, it } from 'vitest'

import { levelLabel, methodLabel } from './moves'

describe('moves labels', () => {
  it('names learn methods', () => {
    expect(methodLabel('level-up')).toBe('Level-up')
    expect(methodLabel('machine')).toBe('TM')
    expect(methodLabel('egg')).toBe('Egg')
    expect(methodLabel('tutor')).toBe('Tutor')
    expect(methodLabel('form-change')).toBe('Form Change')
  })

  it('labels levels, with 0 as learned on evolution', () => {
    expect(levelLabel(12)).toBe('Lv. 12')
    expect(levelLabel(0)).toBe('Evo.')
    expect(levelLabel(null)).toBe('')
  })
})
