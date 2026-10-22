import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { Link, useLocation, useNavigate } from 'react-router'

import { useMe, useSignOut } from '../auth/useAuth'

/** Top-right of the app bar: "Sign in" for guests; nickname + "Sign out" when signed in. */
export function UserMenu() {
  const me = useMe()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const location = useLocation()

  if (me.isPending) return null
  if (!me.data) {
    const onAuthPage = ['/signin', '/register'].includes(location.pathname)
    if (onAuthPage) return null
    return (
      <Button color="inherit" component={Link} to="/signin" state={{ from: location.pathname }}>
        Sign in
      </Button>
    )
  }
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Button
        color="inherit"
        component={Link}
        to="/nickname"
        state={{ from: location.pathname }}
        title="Change nickname"
      >
        {me.data.nickname ?? me.data.username}
      </Button>
      <Button
        color="inherit"
        variant="outlined"
        size="small"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate([], { onSuccess: () => navigate('/') })}
      >
        Sign out
      </Button>
    </Stack>
  )
}
