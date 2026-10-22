import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { listGenerations, listTypes, searchPokemon } from '../api/client'
import { PokemonCard } from '../components/PokemonCard'
import { displayName, generationLabel } from '../lib/format'
import { applyChanges, positiveInt, type Changes } from '../lib/searchParams'
import { useDebouncedValue } from '../lib/useDebouncedValue'

const PAGE_SIZE = 24
const SEARCH_DELAY_MS = 300

export function SearchPage() {
  // Search state lives in the URL (?q=&generation=&type=&page=), so results can be
  // bookmarked or shared, and the browser's back button returns to the same search.
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const generation = positiveInt(searchParams.get('generation'))
  const type = searchParams.get('type') ?? ''
  const page = positiveInt(searchParams.get('page')) ?? 1

  // The text box updates instantly; the URL (and the API call) follows after a pause.
  // If the URL's q changes from outside (back button, a shared link), the box follows it.
  const [text, setText] = useState(q)
  const [lastUrlQ, setLastUrlQ] = useState(q)
  if (q !== lastUrlQ) {
    setLastUrlQ(q)
    setText(q)
  }
  const settledText = useDebouncedValue(text, SEARCH_DELAY_MS)
  useEffect(() => {
    // settledText !== text: the user is still typing, or the URL just changed the
    // box (back button) and settledText is stale. Either way, don't touch the URL.
    if (settledText !== text || settledText.trim() === q) return
    setSearchParams((current) => applyChanges(current, { q: settledText.trim() }))
  }, [settledText, text, q, setSearchParams])

  function update(changes: Changes) {
    setSearchParams((current) => applyChanges(current, changes))
  }

  const results = useQuery({
    queryKey: ['pokemon', { q, generation, type, page }],
    queryFn: ({ signal }) =>
      searchPokemon(
        { q, generation, type, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
        signal,
      ),
    placeholderData: keepPreviousData, // keep showing the last page while the next loads
  })
  const types = useQuery({ queryKey: ['types'], queryFn: ({ signal }) => listTypes(signal) })
  const generations = useQuery({
    queryKey: ['generations'],
    queryFn: ({ signal }) => listGenerations(signal),
  })

  const pageCount = results.data ? Math.ceil(results.data.total / PAGE_SIZE) : 0

  // Only show a selected filter once its option exists. Until the options load (or
  // if the URL has a value that isn't an option), MUI would warn and show a blank.
  const generationValue = generation && generations.data?.includes(generation) ? generation : ''
  const typeValue = type && types.data?.includes(type) ? type : ''

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Search by name or number"
          value={text}
          onChange={(event) => setText(event.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
            htmlInput: { maxLength: 50 },
          }}
        />
        <TextField
          select
          label="Generation"
          value={generationValue}
          onChange={(event) => update({ generation: event.target.value })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {(generations.data ?? []).map((g) => (
            <MenuItem key={g} value={g}>
              {generationLabel(g)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Type"
          value={typeValue}
          onChange={(event) => update({ type: event.target.value })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {(types.data ?? []).map((t) => (
            <MenuItem key={t} value={t}>
              {displayName(t)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {results.isError ? (
        <Alert severity="error">
          Couldn't load Pokémon. Is the backend running on port 8000?
        </Alert>
      ) : results.isPending ? (
        <Grid container spacing={2}>
          {Array.from({ length: 12 }, (_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
              <Skeleton variant="rounded" height={190} />
            </Grid>
          ))}
        </Grid>
      ) : results.data.total === 0 ? (
        <Typography color="text.secondary">No Pokémon match this search.</Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" role="status">
            {results.data.total} Pokémon
          </Typography>
          <Grid container spacing={2} sx={{ opacity: results.isPlaceholderData ? 0.6 : 1 }}>
            {results.data.items.map((pokemon) => (
              <Grid key={pokemon.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <PokemonCard pokemon={pokemon} />
              </Grid>
            ))}
          </Grid>
          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={pageCount}
                page={Math.min(page, pageCount)}
                onChange={(_event, value) => update({ page: value === 1 ? undefined : value })}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Stack>
  )
}
