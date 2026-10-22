import Chip from '@mui/material/Chip'
import { useTheme } from '@mui/material/styles'

import { displayName, typeColour } from '../lib/format'

export function TypeChip({ type }: { type: string }) {
  const theme = useTheme()
  const colour = typeColour(type)
  return (
    <Chip
      label={displayName(type)}
      size="small"
      sx={{ bgcolor: colour, color: theme.palette.getContrastText(colour), fontWeight: 600 }}
    />
  )
}
