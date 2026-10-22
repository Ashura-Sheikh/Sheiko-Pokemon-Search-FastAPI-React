import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import App from './App.tsx'
import { theme } from './theme'

const queryClient = new QueryClient({
  // Names, types and moves only change on a re-seed, but favourite/comment counts
  // change as people use the app, so data is re-checked after 30 s. Your own
  // actions refresh the counts straight away (see social/hooks.ts).
  defaultOptions: { queries: { staleTime: 30 * 1000 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* defaultMode "system": follow the computer's setting until the user picks one. */}
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
