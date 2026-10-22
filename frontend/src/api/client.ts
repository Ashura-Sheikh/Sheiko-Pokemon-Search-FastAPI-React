import type { Pokemon, PokemonMoves, PokemonPage, SearchParams } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    throw new ApiError(response.status, `${response.status} ${response.statusText} for ${path}`)
  }
  return (await response.json()) as T
}

/** Builds the query string, leaving out anything empty. */
export function searchQuery(params: SearchParams): string {
  const query = new URLSearchParams()
  const q = params.q?.trim()
  if (q) query.set('q', q)
  if (params.generation) query.set('generation', String(params.generation))
  if (params.type) query.set('type', params.type)
  query.set('limit', String(params.limit))
  query.set('offset', String(params.offset))
  return query.toString()
}

export function searchPokemon(params: SearchParams, signal?: AbortSignal) {
  return getJson<PokemonPage>(`/api/pokemon?${searchQuery(params)}`, signal)
}

export function getPokemon(id: number, signal?: AbortSignal) {
  return getJson<Pokemon>(`/api/pokemon/${id}`, signal)
}

export function getPokemonMoves(id: number, signal?: AbortSignal) {
  return getJson<PokemonMoves>(`/api/pokemon/${id}/moves`, signal)
}

export function listTypes(signal?: AbortSignal) {
  return getJson<string[]>('/api/types', signal)
}

export function listGenerations(signal?: AbortSignal) {
  return getJson<number[]>('/api/generations', signal)
}
