import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" component="section" sx={{ p: 2.5 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Paper>
  )
}

function Steps({ children }: { children: ReactNode }) {
  return (
    <Box component="ol" sx={{ m: 0, pl: 3, '& li': { mb: 0.5 } }}>
      {children}
    </Box>
  )
}

function Example({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1 }}>
      <Typography variant="body2">
        <strong>Example: </strong>
        {children}
      </Typography>
    </Box>
  )
}

const to = (path: string, label: string) => (
  <Link component={RouterLink} to={path}>
    {label}
  </Link>
)

/** A short user guide: what you can do, step by step, with examples to try.
 *  The example results were checked against the seeded data. */
export function GuidePage() {
  return (
    <Stack spacing={2} sx={{ maxWidth: 820 }}>
      <Typography variant="h4" component="h1">
        User guide
      </Typography>
      <Typography color="text.secondary">
        Search every Pokémon from Generation I to IX (1,025 in all), see their Scarlet/Violet
        moves, keep a list of favourites and comment on any Pokémon. You can browse without an
        account; signing in adds favourites and comments.
      </Typography>

      <Section title="1. Search and browse">
        <Steps>
          <li>Go to {to('/', 'Search')} (or click "Pokémon Search" in the top bar).</li>
          <li>Type part of a name, or a Pokédex number, in the search box. Results update when you stop typing.</li>
          <li>Narrow the list with the <strong>Generation</strong> and <strong>Type</strong> filters.</li>
          <li>Use the page numbers at the bottom to see more (24 per page).</li>
        </Steps>
        <Example>
          type <code>char</code> → 7 Pokémon whose names contain "char": Charmander, Charmeleon,
          Charizard, Chimchar, Charjabug, Charcadet and Pecharunt.
        </Example>
        <Example>
          type <code>25</code> → Pikachu (#0025).
        </Example>
        <Example>
          choose Generation <strong>Gen II</strong> and Type <strong>Grass</strong> → 10 Pokémon,
          starting with Chikorita, Bayleef and Meganium.
        </Example>
        <Typography variant="body2" color="text.secondary">
          Tip: your search is part of the page address, so you can bookmark or share it, and the
          browser's Back button returns to it.
        </Typography>
      </Section>

      <Section title="2. Look at a Pokémon">
        <Steps>
          <li>Click any card to open its page: number, generation, types and sprite.</li>
          <li>
            Under <strong>Moves in Scarlet/Violet</strong>, open a group (Level-up, TM, Egg,
            Tutor) to see the moves. Level-up moves show the level; <strong>Evo.</strong> means
            the move is learned when the Pokémon evolves.
          </li>
          <li>Use <strong>Back to search</strong> to return to your results.</li>
        </Steps>
        <Example>
          open {to('/pokemon/6', 'Charizard (#6)')} → Air Slash is listed as <strong>Evo.</strong>
        </Example>
        <Example>
          open {to('/pokemon/718', 'Zygarde (#718)')} → no moves are listed, because Zygarde isn't
          in Scarlet/Violet.
        </Example>
      </Section>

      <Section title="3. Create an account or sign in">
        <Steps>
          <li>Click <strong>Sign in</strong> (top right), then <strong>Create an account</strong>.</li>
          <li>
            Choose a username (3–30 characters: lowercase letters, numbers or _) and a password
            (8–64 characters).
          </li>
          <li>
            Choose a <strong>nickname</strong>. It's shown next to your comments; your username
            stays private.
          </li>
          <li>Your nickname now appears top right. Click it to change it, or <strong>Sign out</strong> when you're done.</li>
        </Steps>
        <Example>
          username <code>ash_k</code>, password <code>pikachu123</code>, nickname{' '}
          <code>Ash Ketchum</code>.
        </Example>
        <Typography variant="body2" color="text.secondary">
          Prefer not to sign in? Choose <strong>Continue as guest</strong>: you can still search,
          view every Pokémon and read comments. After 5 wrong passwords in a minute, sign-in for that
          username pauses for a minute.
        </Typography>
      </Section>

      <Section title="4. Favourites">
        <Steps>
          <li>While signed in, open a Pokémon and press <strong>Add to favourites</strong> (♡).</li>
          <li>The button turns solid (♥ Favourite). Press it again to remove it.</li>
          <li>See them all under {to('/favourites', 'Favourites')} in the top bar.</li>
        </Steps>
        <Example>
          add Pikachu and Bulbasaur → My favourites shows both, in Pokédex order.
        </Example>
      </Section>

      <Section title="5. Comments">
        <Steps>
          <li>Open any Pokémon and scroll to <strong>Comments</strong>. Anyone can read them.</li>
          <li>
            Signed in with a nickname? Type in <strong>Add a comment</strong> (up to 500
            characters) and press <strong>Post comment</strong>. Newest comments appear first.
          </li>
          <li>
            On your own comments, use <strong>Edit</strong> to change it (it's then marked "edited"),
            or <strong>Delete</strong> → <strong>Yes, delete</strong> to remove it. You can't change
            other people's comments.
          </li>
        </Steps>
        <Example>
          on Pikachu, post <em>"My first partner!"</em> → it appears at the top as{' '}
          <strong>Ash Ketchum</strong> with the date and time.
        </Example>
      </Section>
    </Stack>
  )
}
