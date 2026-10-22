// Shapes returned by the FastAPI backend (see backend/app/models.py).

export interface Pokemon {
  id: number
  name: string
  generation: number
  types: string[]
  sprite_url: string
}

export interface PokemonPage {
  total: number
  limit: number
  offset: number
  items: Pokemon[]
}

export interface SearchParams {
  q?: string
  generation?: number
  type?: string
  limit: number
  offset: number
}
