import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { applyChanges } from '../lib/searchParams'
import { mockBackend, renderAt } from '../test/render'

describe('SearchPage', () => {
  it('lists Pokémon from the API with names, numbers and types', async () => {
    mockBackend()
    renderAt('/')
    expect(await screen.findByText('Bulbasaur')).toBeInTheDocument()
    expect(screen.getByText('#0001')).toBeInTheDocument()
    expect(screen.getByText('Mr Mime')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('4 Pokémon')
    const card = screen.getByText('Bulbasaur').closest('a')!
    expect(card).toHaveAttribute('href', '/pokemon/1')
    expect(within(card).getByText('Grass')).toBeInTheDocument()
    expect(within(card).getByText('Poison')).toBeInTheDocument()
  })

  // The exact typing delay is tested with a simulated clock in useDebouncedValue.test.ts.
  // Here: typing ends in a search request and the results change.
  it('searches once the user stops typing', async () => {
    const { requests } = mockBackend()
    renderAt('/')
    expect(await screen.findByRole('status')).toHaveTextContent('4 Pokémon')
    await userEvent.type(screen.getByLabelText('Search by name or number'), 'pika')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 Pokémon'))
    expect(screen.getByText('Pikachu')).toBeInTheDocument()
    expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument()
    expect(requests).toContain('/api/pokemon?q=pika&limit=24&offset=0')
  })

  it('reads filters from the URL and sends them to the API', async () => {
    const { requests } = mockBackend()
    renderAt('/?generation=2&type=grass')
    expect(await screen.findByText('Chikorita')).toBeInTheDocument()
    expect(screen.queryByText('Bulbasaur')).not.toBeInTheDocument()
    expect(requests).toContain('/api/pokemon?generation=2&type=grass&limit=24&offset=0')
  })

  it('shows URL filters in the dropdowns once options load, without MUI warnings', async () => {
    mockBackend()
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    renderAt('/?generation=2&type=grass')
    expect(await screen.findByText('Chikorita')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Generation' })).toHaveTextContent('Gen II'))
    expect(screen.getByRole('combobox', { name: 'Type' })).toHaveTextContent('Grass')
    const messages = [...warn.mock.calls, ...error.mock.calls].map((args) => String(args[0]))
    expect(messages.filter((m) => m.includes('out-of-range'))).toEqual([])
  })

  it('shows a message when nothing matches', async () => {
    mockBackend()
    renderAt('/?q=zzz')
    expect(await screen.findByText('No Pokémon match this search.')).toBeInTheDocument()
  })

  it('shows an error when the backend is unreachable', async () => {
    const { fetchMock } = mockBackend()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderAt('/')
    expect(await screen.findByText(/Couldn't load Pokémon/)).toBeInTheDocument()
  })
})

describe('applyChanges', () => {
  it('removes empty values and resets to page 1 on a new filter', () => {
    const next = applyChanges(new URLSearchParams('q=pika&type=grass&page=3'), { type: '' })
    expect(next.toString()).toBe('q=pika')
  })

  it('keeps other filters when only the page changes', () => {
    const next = applyChanges(new URLSearchParams('q=pika'), { page: 2 })
    expect(next.toString()).toBe('q=pika&page=2')
  })
})
