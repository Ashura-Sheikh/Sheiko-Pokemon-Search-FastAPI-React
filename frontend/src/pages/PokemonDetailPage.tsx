import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'

import { ApiError, getPokemon } from '../api/client'
import { CommentsSection } from '../components/CommentsSection'
import { CountPills } from '../components/CountPills'
import { FavouriteButton } from '../components/FavouriteButton'
import { MovesSection } from '../components/MovesSection'
import { TypeChip } from '../components/TypeChip'
import { displayName, generationLabel, pokedexNumber } from '../lib/format'

export function PokemonDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const pokemonId = Number(id)
  const validId = Number.isInteger(pokemonId) && pokemonId > 0

  const query = useQuery({
    queryKey: ['pokemon', pokemonId],
    queryFn: ({ signal }) => getPokemon(pokemonId, signal),
    enabled: validId,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  })

  const notFound =
    !validId || (query.error instanceof ApiError && query.error.status === 404)

  return (
    <Stack spacing={3}>
      <Box>
        {/* Go back to the search the user came from (keeping its filters). If they
            opened this page directly, there's no in-app history, so go to search. */}
        <Button
          onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
          startIcon={<ArrowBackIcon />}
        >
          Back to search
        </Button>
      </Box>

      {notFound ? (
        <Alert severity="warning">No Pokémon with number {id}.</Alert>
      ) : query.isError ? (
        <Alert severity="error">Couldn't load this Pokémon. Is the backend running?</Alert>
      ) : query.isPending ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress aria-label="Loading" />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'center' }}>
            <Box
              component="img"
              src={query.data.sprite_url}
              alt={displayName(query.data.name)}
              sx={{ width: 192, height: 192, imageRendering: 'pixelated' }}
            />
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {pokedexNumber(query.data.id)} · {generationLabel(query.data.generation)}
              </Typography>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                {displayName(query.data.name)}
              </Typography>
              <Stack direction="row" spacing={1}>
                {query.data.types.map((type) => (
                  <TypeChip key={type} type={type} />
                ))}
              </Stack>
              <CountPills
                favourites={query.data.favourite_count}
                comments={query.data.comment_count}
                align="flex-start"
              />
              <div>
                <FavouriteButton pokemonId={query.data.id} />
              </div>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Moves load separately, only once the Pokémon itself has loaded. */}
      {query.data && <MovesSection pokemonId={query.data.id} />}
      {query.data && <CommentsSection pokemonId={query.data.id} />}
    </Stack>
  )
}
