import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h5" component="h1">
        Page not found
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Go to search
      </Button>
    </Stack>
  )
}
