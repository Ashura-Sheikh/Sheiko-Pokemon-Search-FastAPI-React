import { describe, expect, it, vi } from 'vitest'

import { ApiError, getPokemon, searchQuery } from './client'

describe('searchQuery', () => {
  it('leaves out empty filters and trims the search text', () => {
    expect(searchQuery({ q: '  pika ', limit: 24, offset: 0 })).toBe('q=pika&limit=24&offset=0')
    expect(searchQuery({ q: '   ', type: '', limit: 24, offset: 48 })).toBe('limit=24&offset=48')
  })

  it('includes generation and type when set', () => {
    expect(searchQuery({ generation: 2, type: 'grass', limit: 10, offset: 0 })).toBe(
      'generation=2&type=grass&limit=10&offset=0',
    )
  })
})

describe('getJson errors', () => {
  it('throws ApiError with the HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"detail":"Pokémon not found"}', { status: 404 })),
    )
    const error = await getPokemon(9999).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
  })
})
