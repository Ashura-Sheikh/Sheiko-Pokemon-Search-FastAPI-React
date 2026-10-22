import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import FavoriteIcon from '@mui/icons-material/Favorite'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Small ♥ and 💬 pills with counts. A pill only shows when its count is above 0. */
export function CountPills({
  favourites,
  comments,
  align = 'center',
}: {
  favourites: number
  comments: number
  align?: 'center' | 'flex-start'
}) {
  if (favourites <= 0 && comments <= 0) return null
  return (
    <Stack direction="row" spacing={0.5} sx={{ justifyContent: align }}>
      {favourites > 0 && (
        <Chip
          size="small"
          variant="outlined"
          color="error"
          icon={<FavoriteIcon />}
          label={favourites}
          aria-label={plural(favourites, 'favourite')}
          title={plural(favourites, 'favourite')}
        />
      )}
      {comments > 0 && (
        <Chip
          size="small"
          variant="outlined"
          icon={<ChatBubbleIcon />}
          label={comments}
          aria-label={plural(comments, 'comment')}
          title={plural(comments, 'comment')}
        />
      )}
    </Stack>
  )
}
