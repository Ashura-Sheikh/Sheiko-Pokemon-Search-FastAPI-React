import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'

/** Switches between light and dark mode. Starts from the computer's setting;
 *  MUI saves the user's choice in localStorage so it's kept on the next visit. */
export function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()
  if (!mode) return null // not known yet on the very first render
  const current = mode === 'system' ? systemMode : mode
  const next = current === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next} mode`
  return (
    <Tooltip title={label}>
      <IconButton color="inherit" aria-label={label} onClick={() => setMode(next)}>
        {current === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
