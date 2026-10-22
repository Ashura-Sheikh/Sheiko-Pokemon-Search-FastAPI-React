import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link, Navigate, useLocation } from 'react-router'

import { useMe } from '../auth/useAuth'
import { PokemonCard } from '../components/PokemonCard'
import { useFavourites } from '../social/hooks'

export function FavouritesPage() {
  const me = useMe()
  const favourites = useFavourites()
  const location = useLocation()

  if (me.isPending) return <CircularProgress aria-label="Loading" />
  if (!me.data) return <Navigate to="/signin" replace state={{ from: location.pathname }} />

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">
        My favourites
      </Typography>
      {favourites.isError ? (
        <Alert severity="error">Couldn't load your favourites.</Alert>
      ) : favourites.isPending ? (
        <CircularProgress aria-label="Loading favourites" />
      ) : favourites.data.length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">
            No favourites yet. Open a Pokémon and press "Add to favourites".
          </Typography>
          <Button component={Link} to="/" variant="outlined">
            Find Pokémon
          </Button>
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {favourites.data.map((pokemon) => (
            <Grid key={pokemon.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <PokemonCard pokemon={pokemon} />
            </Grid>
          ))}
        </Grid>
      )}
    </Stack>
  )
}
