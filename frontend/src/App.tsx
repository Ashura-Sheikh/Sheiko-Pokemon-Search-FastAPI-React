import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Link, Route, Routes } from 'react-router'

import { ThemeToggle } from './components/ThemeToggle'
import { UserMenu } from './components/UserMenu'
import { AuthPage } from './pages/AuthPage'
import { FavouritesPage } from './pages/FavouritesPage'
import { GuidePage } from './pages/GuidePage'
import { NicknamePage } from './pages/NicknamePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PokemonDetailPage } from './pages/PokemonDetailPage'
import { SearchPage } from './pages/SearchPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/pokemon/:id" element={<PokemonDetailPage />} />
      <Route path="/signin" element={<AuthPage mode="signin" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/nickname" element={<NicknamePage />} />
      <Route path="/favourites" element={<FavouritesPage />} />
      <Route path="/guide" element={<GuidePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
          >
            Pokémon Search
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <ThemeToggle />
          <Button color="inherit" component={Link} to="/guide">
            Guide
          </Button>
          <UserMenu />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <AppRoutes />
      </Container>
    </>
  )
}
