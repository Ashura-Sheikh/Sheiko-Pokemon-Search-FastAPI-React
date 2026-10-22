import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import Button from '@mui/material/Button'
import { Link, useLocation } from 'react-router'

import { useMe } from '../auth/useAuth'
import { useFavourites, useToggleFavourite } from '../social/hooks'

/** ♥ toggle for one Pokémon. Guests get a link to sign in instead. */
export function FavouriteButton({ pokemonId }: { pokemonId: number }) {
  const me = useMe()
  const favourites = useFavourites()
  const toggle = useToggleFavourite()
  const location = useLocation()

  if (me.isPending) return null
  if (!me.data) {
    return (
      <Button component={Link} to="/signin" state={{ from: location.pathname }} size="small">
        Sign in to add favourites
      </Button>
    )
  }

  const isFavourite = favourites.data?.some((p) => p.id === pokemonId) ?? false
  return (
    <Button
      variant={isFavourite ? 'contained' : 'outlined'}
      startIcon={isFavourite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
      aria-pressed={isFavourite}
      disabled={favourites.isPending || toggle.isPending}
      onClick={() => toggle.mutate({ pokemonId, on: !isFavourite })}
    >
      {isFavourite ? 'Favourite' : 'Add to favourites'}
    </Button>
  )
}
