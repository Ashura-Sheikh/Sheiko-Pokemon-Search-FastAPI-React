import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

import type { Pokemon } from '../api/types'
import { displayName, pokedexNumber } from '../lib/format'
import { CountPills } from './CountPills'
import { TypeChip } from './TypeChip'

export function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea component={Link} to={`/pokemon/${pokemon.id}`} sx={{ height: '100%' }}>
        <CardMedia
          component="img"
          image={pokemon.sprite_url}
          alt={displayName(pokemon.name)}
          loading="lazy"
          sx={{ width: 96, height: 96, mx: 'auto', mt: 1, imageRendering: 'pixelated' }}
        />
        <CardContent sx={{ pt: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {pokedexNumber(pokemon.id)}
          </Typography>
          <Typography variant="subtitle1" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            {displayName(pokemon.name)}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
            {pokemon.types.map((type) => (
              <TypeChip key={type} type={type} />
            ))}
          </Stack>
          <Box sx={{ mt: 1 }}>
            <CountPills favourites={pokemon.favourite_count} comments={pokemon.comment_count} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
