import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'

import { getPokemonMoves } from '../api/client'
import type { MoveGroup } from '../api/types'
import { displayName } from '../lib/format'
import { levelLabel, methodLabel } from '../lib/moves'

function MoveList({ group }: { group: MoveGroup }) {
  const showLevel = group.method === 'level-up'
  return (
    <Box
      component="ul"
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gap: 0.5,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
      }}
    >
      {group.moves.map((move) => (
        <Box component="li" key={move.name} sx={{ display: 'flex', gap: 1 }}>
          {showLevel && (
            <Typography
              component="span"
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 48 }}
            >
              {levelLabel(move.level)}
            </Typography>
          )}
          <Typography component="span" variant="body2">
            {displayName(move.name)}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

/** The moves a Pokémon learns in Scarlet/Violet, one collapsible block per method.
 *  Loaded separately from the main details, so those show without waiting. */
export function MovesSection({ pokemonId }: { pokemonId: number }) {
  const query = useQuery({
    queryKey: ['pokemon', pokemonId, 'moves'],
    queryFn: ({ signal }) => getPokemonMoves(pokemonId, signal),
  })

  return (
    <Stack spacing={1.5} component="section" aria-labelledby="moves-heading">
      <Typography id="moves-heading" variant="h6" component="h2">
        Moves{query.data ? ` in ${query.data.game}` : ''}
      </Typography>

      {query.isError ? (
        <Alert severity="error">Couldn't load moves.</Alert>
      ) : query.isPending ? (
        <Skeleton variant="rounded" height={120} aria-label="Loading moves" />
      ) : query.data.groups.length === 0 ? (
        <Typography color="text.secondary">
          This Pokémon isn't in {query.data.game}, so no moves are listed.
        </Typography>
      ) : (
        <Box>
          {query.data.groups.map((group, index) => (
            <Accordion key={group.method} defaultExpanded={index === 0} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 600 }}>
                  {methodLabel(group.method)} ({group.moves.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <MoveList group={group} />
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Stack>
  )
}
