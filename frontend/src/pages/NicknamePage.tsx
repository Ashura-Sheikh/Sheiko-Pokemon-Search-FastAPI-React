import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { useMe, useSetNickname } from '../auth/useAuth'
import { returnPath } from '../lib/returnPath'

function NicknameForm({ current }: { current: string | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const save = useSetNickname()
  const [nickname, setNickname] = useState(current ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate([nickname], {
      onSuccess: () => navigate(returnPath(location.state), { replace: true }),
    })
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 420, mx: 'auto' }}>
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        <Typography variant="h5" component="h1">
          {current ? 'Change your nickname' : 'Choose a nickname'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your nickname is shown to other users. Your username stays private.
        </Typography>
        {save.isError && <Alert severity="error">{save.error.message}</Alert>}
        <TextField
          label="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          helperText="3–20 characters: letters, numbers, spaces, _ or -"
          required
          autoFocus
        />
        <Button type="submit" variant="contained" disabled={save.isPending}>
          Save nickname
        </Button>
      </Stack>
    </Paper>
  )
}

export function NicknamePage() {
  const location = useLocation()
  const me = useMe()
  if (me.isPending) return <CircularProgress aria-label="Loading" />
  if (!me.data) return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  return <NicknameForm current={me.data.nickname} />
}
