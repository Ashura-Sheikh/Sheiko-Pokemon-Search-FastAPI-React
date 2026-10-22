import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { mockBackend, renderAt } from '../test/render'

describe('PokemonDetailPage', () => {
  it('shows the Pokémon with number, generation and types', async () => {
    mockBackend()
    renderAt('/pokemon/122')
    expect(await screen.findByRole('heading', { name: 'Mr Mime' })).toBeInTheDocument()
    expect(screen.getByText('#0122 · Gen I')).toBeInTheDocument()
    expect(screen.getByText('Psychic')).toBeInTheDocument()
    expect(screen.getByText('Fairy')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Mr Mime' })).toHaveAttribute('src', '/s/122.png')
  })

  it('says so when the number does not exist', async () => {
    mockBackend()
    renderAt('/pokemon/9999')
    expect(await screen.findByText('No Pokémon with number 9999.')).toBeInTheDocument()
  })

  it('does not call the API for an invalid number', async () => {
    const { requests } = mockBackend()
    renderAt('/pokemon/abc')
    expect(await screen.findByText('No Pokémon with number abc.')).toBeInTheDocument()
    expect(requests.filter((r) => r.startsWith('/api/pokemon/'))).toEqual([])
  })

  it('shows a not-found page for unknown routes', async () => {
    mockBackend()
    renderAt('/nowhere')
    expect(await screen.findByText('Page not found')).toBeInTheDocument()
  })
})
