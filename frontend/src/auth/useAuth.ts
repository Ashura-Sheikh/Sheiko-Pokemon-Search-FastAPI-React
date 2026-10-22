import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getMe, login, logout, register, setNickname } from '../api/client'
import type { Me } from '../api/types'

/** Who's signed in. The server is the source of truth (the session is an HttpOnly
 *  cookie JavaScript can't read), so we ask it, and share the answer through the
 *  TanStack Query cache under the key ['me'] instead of a separate React Context. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: ({ signal }) => getMe(signal),
    staleTime: Infinity, // only changes when we sign in/out or change the nickname
  })
}

/** Signing in, registering, signing out and nickname changes all replace ['me']. */
function useSetsMe<A extends unknown[]>(fn: (...args: A) => Promise<Me | null | void>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => fn(...args),
    onSuccess: (me) => queryClient.setQueryData(['me'], me ?? null),
  })
}

export const useSignIn = () => useSetsMe(login)
export const useRegister = () => useSetsMe(register)
export const useSetNickname = () => useSetsMe(setNickname)
export const useSignOut = () => useSetsMe(logout)
