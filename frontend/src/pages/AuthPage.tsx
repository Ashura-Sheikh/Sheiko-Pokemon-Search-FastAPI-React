import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router'

import { useRegister, useSignIn } from '../auth/useAuth'
import { returnPath } from '../lib/returnPath'

export function AuthPage({ mode }: { mode: 'signin' | 'register' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useSignIn()
  const registerUser = useRegister()
  const action = mode === 'signin' ? signIn : registerUser

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    action.mutate([username, password], {
      onSuccess: (me) => {
        const next = returnPath(location.state)
        // New accounts (and anyone without one yet) choose a nickname first.
        if (me && !me.nickname) navigate('/nickname', { replace: true, state: { from: next } })
        else navigate(next, { replace: true })
      },
    })
  }

  const isSignIn = mode === 'signin'
  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 420, mx: 'auto' }}>
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        <Typography variant="h5" component="h1">
          {isSignIn ? 'Sign in' : 'Create an account'}
        </Typography>
        {action.isError && <Alert severity="error">{action.error.message}</Alert>}
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          helperText={isSignIn ? undefined : '3–30 characters: lowercase letters, numbers or _'}
          required
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignIn ? 'current-password' : 'new-password'}
          helperText={isSignIn ? undefined : '8–64 characters'}
          required
        />
        <Button type="submit" variant="contained" disabled={action.isPending}>
          {isSignIn ? 'Sign in' : 'Create account'}
        </Button>
        <Typography variant="body2">
          {isSignIn ? 'New here? ' : 'Already have an account? '}
          <Link
            component={RouterLink}
            to={isSignIn ? '/register' : '/signin'}
            state={location.state}
          >
            {isSignIn ? 'Create an account' : 'Sign in'}
          </Link>
        </Typography>
        <Divider />
        <Button component={RouterLink} to="/">
          Continue as guest
        </Button>
      </Stack>
    </Paper>
  )
}
