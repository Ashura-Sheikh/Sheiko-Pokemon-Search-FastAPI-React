import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import App from '../App'
import type { Pokemon, PokemonMoves } from '../api/types'
import { theme } from '../theme'

export const SAMPLE: Pokemon[] = [
  { id: 1, name: 'bulbasaur', generation: 1, types: ['grass', 'poison'], sprite_url: '/s/1.png', favourite_count: 0, comment_count: 0 },
  { id: 25, name: 'pikachu', generation: 1, types: ['electric'], sprite_url: '/s/25.png', favourite_count: 0, comment_count: 0 },
  { id: 122, name: 'mr-mime', generation: 1, types: ['psychic', 'fairy'], sprite_url: '/s/122.png', favourite_count: 0, comment_count: 0 },
  { id: 152, name: 'chikorita', generation: 2, types: ['grass'], sprite_url: '/s/152.png', favourite_count: 0, comment_count: 0 },
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

interface FakeUser {
  id: number
  username: string
  password: string
  nickname: string | null
}

export interface SentRequest {
  method: string
  path: string
  headers: Record<string, string>
  body: unknown
}

/** A fake backend: answers the same paths as FastAPI, from SAMPLE, and records
 *  every URL requested so tests can check what the app asked for. It also keeps
 *  accounts and "who's signed in", like the real session cookie would. */
export function mockBackend(options: { signedInAs?: Partial<FakeUser> } = {}) {
  const requests: string[] = []
  const sent: SentRequest[] = []
  const users: FakeUser[] = []
  const favourites = new Map<number, Set<number>>() // user id -> Pokémon ids
  const comments: { id: number; pokemon_id: number; user_id: number; body: string; edited: boolean }[] = []
  let nextCommentId = 1
  let current: FakeUser | null = null
  if (options.signedInAs) {
    current = { id: 1, username: 'ash', password: 'pikachu123', nickname: null, ...options.signedInAs }
    users.push(current)
  }
  const me = (u: FakeUser) => ({ id: u.id, username: u.username, nickname: u.nickname })
  /** A Pokémon with live counts, like the real backend's read_with_counts. */
  const withCounts = (p: Pokemon): Pokemon => ({
    ...p,
    favourite_count: [...favourites.values()].filter((set) => set.has(p.id)).length,
    comment_count: comments.filter((c) => c.pokemon_id === p.id).length,
  })

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const headers = Object.fromEntries(new Headers(init?.headers).entries())
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    requests.push(url.pathname + url.search)
    sent.push({ method, path: url.pathname, headers, body })
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })

    // Like the real backend: change requests without the frontend's header are refused.
    if (method !== 'GET' && headers['x-requested-by'] !== 'pokemon-app') {
      return json({ detail: 'Missing request header' }, 403)
    }
    if (url.pathname === '/api/me' && method === 'GET') {
      return current ? json(me(current)) : json({ detail: 'Sign in to do this' }, 401)
    }
    if (url.pathname === '/api/me' && method === 'PATCH') {
      if (!current) return json({ detail: 'Sign in to do this' }, 401)
      const wanted = String(body.nickname).trim()
      if (users.some((u) => u !== current && u.nickname?.toLowerCase() === wanted.toLowerCase())) {
        return json({ detail: 'That nickname is taken' }, 409)
      }
      current.nickname = wanted
      return json(me(current))
    }
    if (url.pathname === '/api/auth/register') {
      if (users.some((u) => u.username === body.username)) {
        return json({ detail: 'That username is taken' }, 409)
      }
      if (String(body.password).length < 8) {
        return json({ detail: 'Password must be 8–64 characters' }, 422)
      }
      current = { id: users.length + 1, username: body.username, password: body.password, nickname: null }
      users.push(current)
      return json(me(current), 201)
    }
    if (url.pathname === '/api/auth/login') {
      const user = users.find((u) => u.username === body.username && u.password === body.password)
      if (!user) return json({ detail: 'Incorrect username or password' }, 401)
      current = user
      return json(me(user))
    }
    if (url.pathname === '/api/auth/logout') {
      current = null
      return new Response(null, { status: 204 })
    }
    const noContent = () => new Response(null, { status: 204 })
    if (url.pathname === '/api/me/favourites') {
      if (!current) return json({ detail: 'Sign in to do this' }, 401)
      const ids = [...(favourites.get(current.id) ?? [])].sort((a, b) => a - b)
      return json(SAMPLE.filter((p) => ids.includes(p.id)).map(withCounts))
    }
    const fav = url.pathname.match(/^\/api\/me\/favourites\/(\d+)$/)
    if (fav) {
      if (!current) return json({ detail: 'Sign in to do this' }, 401)
      const set = favourites.get(current.id) ?? new Set<number>()
      favourites.set(current.id, set)
      if (method === 'PUT') set.add(Number(fav[1]))
      if (method === 'DELETE') set.delete(Number(fav[1]))
      return noContent()
    }
    const commentList = url.pathname.match(/^\/api\/pokemon\/(\d+)\/comments$/)
    if (commentList) {
      const pid = Number(commentList[1])
      if (method === 'POST') {
        if (!current) return json({ detail: 'Sign in to do this' }, 401)
        if (!current.nickname) return json({ detail: 'Choose a nickname before commenting' }, 403)
        const text = String(body.body).trim()
        if (!text || text.length > 500) return json({ detail: 'A comment must be 1–500 characters' }, 422)
        comments.push({ id: nextCommentId++, pokemon_id: pid, user_id: current.id, body: text, edited: false })
        return json({}, 201)
      }
      const viewer = current
      return json(
        comments
          .filter((c) => c.pokemon_id === pid)
          .reverse() // newest first
          .map((c) => ({
            id: c.id,
            pokemon_id: c.pokemon_id,
            author: users.find((u) => u.id === c.user_id)?.nickname ?? 'Unknown trainer',
            body: c.body,
            created_at: '2026-10-22T20:00:00Z',
            updated_at: c.edited ? '2026-10-22T20:05:00Z' : null,
            mine: viewer?.id === c.user_id,
          })),
      )
    }
    const oneComment = url.pathname.match(/^\/api\/comments\/(\d+)$/)
    if (oneComment) {
      const c = comments.find((x) => x.id === Number(oneComment[1]))
      if (!current) return json({ detail: 'Sign in to do this' }, 401)
      if (!c) return json({ detail: 'Comment not found' }, 404)
      if (c.user_id !== current.id) return json({ detail: 'You can only change your own comments' }, 403)
      if (method === 'DELETE') {
        comments.splice(comments.indexOf(c), 1)
        return noContent()
      }
      c.body = String(body.body).trim()
      c.edited = true
      return json({})
    }

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
      return json({ total: items.length, limit, offset, items: items.slice(offset, offset + limit).map(withCounts) })
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
      return found ? json(withCounts(found)) : json({ detail: 'Pokémon not found' }, 404)
    }
    return json({ detail: 'Not Found' }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  /** Add a comment directly, as if another user had posted it. */
  function seedComment(pokemonId: number, author: FakeUser, text: string) {
    if (!users.includes(author)) users.push(author)
    comments.push({ id: nextCommentId++, pokemon_id: pokemonId, user_id: author.id, body: text, edited: false })
  }
  return { requests, sent, fetchMock, users, seedComment }
}

/** Renders the whole app (top bar + routes) at a given URL, with a fresh query cache. */
export function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
    </ThemeProvider>,
  )
}
