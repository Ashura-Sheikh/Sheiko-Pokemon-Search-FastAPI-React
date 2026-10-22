import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockBackend, renderAt } from '../test/render'

describe('MovesSection (on the detail page)', () => {
  it('shows Scarlet/Violet moves grouped by method, with levels for level-up', async () => {
    mockBackend()
    renderAt('/pokemon/25')
    const section = await screen.findByRole('region', { name: 'Moves in Scarlet/Violet' })
    expect(within(section).getByText('Level-up (3)')).toBeInTheDocument()
    expect(within(section).getByText('TM (1)')).toBeInTheDocument()
    expect(within(section).getByText('Thunder Shock')).toBeInTheDocument()
    expect(within(section).getByText('Lv. 26')).toBeInTheDocument()
    expect(within(section).getByText('Evo.')).toBeInTheDocument() // level 0
    expect(within(section).getByText('Protect')).toBeInTheDocument()
  })

  it('explains when the Pokémon is not in Scarlet/Violet', async () => {
    mockBackend()
    renderAt('/pokemon/152')
    expect(
      await screen.findByText("This Pokémon isn't in Scarlet/Violet, so no moves are listed."),
    ).toBeInTheDocument()
  })

  it('loads moves only after the Pokémon itself, and not for an unknown one', async () => {
    const { requests } = mockBackend()
    renderAt('/pokemon/9999')
    await screen.findByText('No Pokémon with number 9999.')
    expect(requests.some((r) => r.endsWith('/moves'))).toBe(false)
  })

  it('shows an error if the moves request fails, while the details still show', async () => {
    const { fetchMock } = mockBackend()
    const real = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input) =>
      String(input).endsWith('/moves') ? new Response('{}', { status: 500 }) : real(input),
    )
    renderAt('/pokemon/25')
    expect(await screen.findByText("Couldn't load moves.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument()
  })
})
