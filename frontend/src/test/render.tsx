import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import { AppRoutes } from '../App'
import type { Pokemon, PokemonMoves } from '../api/types'

export const SAMPLE: Pokemon[] = [
  { id: 1, name: 'bulbasaur', generation: 1, types: ['grass', 'poison'], sprite_url: '/s/1.png' },
  { id: 25, name: 'pikachu', generation: 1, types: ['electric'], sprite_url: '/s/25.png' },
  { id: 122, name: 'mr-mime', generation: 1, types: ['psychic', 'fairy'], sprite_url: '/s/122.png' },
  { id: 152, name: 'chikorita', generation: 2, types: ['grass'], sprite_url: '/s/152.png' },
]

/** Moves per Pokémon id, already grouped and sorted the way the backend returns them.
 *  Pokémon not listed here (e.g. Chikorita) have none, like one missing from SV. */
export const SAMPLE_MOVES: Record<number, PokemonMoves['groups']> = {
  25: [
    {
      method: 'level-up',
      moves: [
        { name: 'thunder-punch', level: 0 },
        { name: 'thunder-shock', level: 1 },
        { name: 'thunderbolt', level: 26 },
      ],
    },
    { method: 'machine', moves: [{ name: 'protect', level: null }] },
  ],
}

/** A fake backend: answers the same paths as FastAPI, from SAMPLE, and records
 *  every URL requested so tests can check what the app asked for. */
export function mockBackend() {
  const requests: string[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost')
    requests.push(url.pathname + url.search)
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })

    if (url.pathname === '/api/types') return json(['electric', 'fairy', 'grass', 'poison', 'psychic'])
    if (url.pathname === '/api/generations') return json([1, 2])
    if (url.pathname === '/api/pokemon') {
      const p = url.searchParams
      const q = p.get('q') ?? ''
      let items = SAMPLE.filter((x) => (/^\d+$/.test(q) ? x.id === Number(q) : x.name.includes(q)))
      if (p.get('generation')) items = items.filter((x) => x.generation === Number(p.get('generation')))
      if (p.get('type')) items = items.filter((x) => x.types.includes(p.get('type')!))
      const limit = Number(p.get('limit'))
      const offset = Number(p.get('offset'))
      return json({ total: items.length, limit, offset, items: items.slice(offset, offset + limit) })
    }
    const moves = url.pathname.match(/^\/api\/pokemon\/(\d+)\/moves$/)
    if (moves) {
      const id = Number(moves[1])
      if (!SAMPLE.some((x) => x.id === id)) return json({ detail: 'Pokémon not found' }, 404)
      return json({ game: 'Scarlet/Violet', groups: SAMPLE_MOVES[id] ?? [] })
    }
    const one = url.pathname.match(/^\/api\/pokemon\/(\d+)$/)
    if (one) {
      const found = SAMPLE.find((x) => x.id === Number(one[1]))
      return found ? json(found) : json({ detail: 'Pokémon not found' }, 404)
    }
    return json({ detail: 'Not Found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { requests, fetchMock }
}

/** Renders the app's routes at a given URL, with a fresh query cache. */
export function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
