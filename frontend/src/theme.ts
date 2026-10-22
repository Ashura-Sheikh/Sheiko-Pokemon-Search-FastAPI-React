import { createTheme } from '@mui/material/styles'

/** Light and dark colour schemes. MUI switches between them with CSS variables,
 *  and remembers the user's choice in localStorage (see ThemeToggle). */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: { palette: { primary: { main: '#D32F2F' } } },
    dark: { palette: { primary: { main: '#EF5350' } } },
  },
})
