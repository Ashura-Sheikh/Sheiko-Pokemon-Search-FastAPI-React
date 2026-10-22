// Shapes returned by the FastAPI backend (see backend/app/models.py).

export interface Pokemon {
  id: number
  name: string
  generation: number
  types: string[]
  sprite_url: string
  favourite_count: number // how many users have it in their favourites
  comment_count: number
}

export interface PokemonPage {
  total: number
  limit: number
  offset: number
  items: Pokemon[]
}

export interface MoveGroup {
  method: string // "level-up", "machine" (TM), "egg", "tutor", ...
  moves: { name: string; level: number | null }[]
}

export interface PokemonMoves {
  game: string
  groups: MoveGroup[] // empty if the Pokémon isn't in this game
}

/** The signed-in user. `nickname` is null until they choose one. */
export interface Me {
  id: number
  username: string
  nickname: string | null
}

export interface CommentRead {
  id: number
  pokemon_id: number
  author: string // the author's public nickname
  body: string
  created_at: string // ISO timestamp (UTC)
  updated_at: string | null // set if the author edited it
  mine: boolean // written by the signed-in user
}

export const COMMENT_MAX = 500

export interface SearchParams {
  q?: string
  generation?: number
  type?: string
  limit: number
  offset: number
}
