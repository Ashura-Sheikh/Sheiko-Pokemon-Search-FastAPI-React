import type { Me, Pokemon, PokemonMoves, PokemonPage, SearchParams } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** The backend refuses change requests without this header (its cross-site check).
 *  Another website can't add it without the browser asking first, which we never allow. */
export const CSRF_HEADER = { 'X-Requested-By': 'pokemon-app' }

/** The backend's error message: `detail` is a string, or a list for validation errors. */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0] as { msg?: string }
      if (first.msg) return first.msg
    }
  } catch {
    // not JSON
  }
  return `${response.status} ${response.statusText}`
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  // Cookies go with same-origin requests by default, which is how the session travels.
  const response = await fetch(path, init)
  if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { signal, headers: { Accept: 'application/json' } })
}

function sendJson<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) {
  return request<T>(path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...CSRF_HEADER },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

// --- Sign-in -------------------------------------------------------------------

/** The signed-in user, or null for a guest. */
export async function getMe(signal?: AbortSignal): Promise<Me | null> {
  try {
    return await getJson<Me>('/api/me', signal)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export function register(username: string, password: string) {
  return sendJson<Me>('POST', '/api/auth/register', { username, password })
}

export function login(username: string, password: string) {
  return sendJson<Me>('POST', '/api/auth/login', { username, password })
}

export function logout() {
  return sendJson<void>('POST', '/api/auth/logout')
}

export function setNickname(nickname: string) {
  return sendJson<Me>('PATCH', '/api/me', { nickname })
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
