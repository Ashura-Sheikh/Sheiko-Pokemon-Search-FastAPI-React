import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addComment,
  addFavourite,
  deleteComment,
  editComment,
  listComments,
  listFavourites,
  removeFavourite,
} from '../api/client'
import { useMe } from '../auth/useAuth'

// Cached per user (the key includes their id), so signing out or switching
// accounts never shows the previous person's favourites or "edit" buttons.

export function useFavourites() {
  const me = useMe()
  const userId = me.data?.id
  return useQuery({
    queryKey: ['favourites', userId],
    queryFn: ({ signal }) => listFavourites(signal),
    enabled: userId !== undefined,
  })
}

export function useToggleFavourite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ pokemonId, on }: { pokemonId: number; on: boolean }) =>
      on ? addFavourite(pokemonId) : removeFavourite(pokemonId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favourites'] })
      queryClient.invalidateQueries({ queryKey: ['pokemon'] }) // favourite counts
    },
  })
}

export function useComments(pokemonId: number) {
  const me = useMe()
  return useQuery({
    queryKey: ['comments', pokemonId, me.data?.id ?? 'guest'],
    queryFn: ({ signal }) => listComments(pokemonId, signal),
    enabled: !me.isPending, // wait to know who's viewing, so `mine` is right
  })
}

/** Add, edit or delete a comment, then refresh that Pokémon's comments. */
export function useCommentActions(pokemonId: number) {
  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['comments', pokemonId] })
    queryClient.invalidateQueries({ queryKey: ['pokemon'] }) // comment counts
  }
  return {
    add: useMutation({ mutationFn: (body: string) => addComment(pokemonId, body), onSuccess: refresh }),
    edit: useMutation({
      mutationFn: ({ id, body }: { id: number; body: string }) => editComment(id, body),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: number) => deleteComment(id), onSuccess: refresh }),
  }
}
