import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockBackend, renderAt } from '../test/render'

const MISTY = { id: 2, username: 'misty', password: 'starmie123', nickname: 'Misty' }

describe('Light / dark mode', () => {
  it('switches mode, updates the page and remembers the choice', async () => {
    mockBackend()
    renderAt('/')
    const toDark = await screen.findByRole('button', { name: 'Switch to dark mode' })
    await userEvent.click(toDark)

    const toLight = await screen.findByRole('button', { name: 'Switch to light mode' })
    // MUI marks the page with the active scheme (theme.ts: colorSchemeSelector 'data').
    await waitFor(() =>
      expect(document.documentElement).toHaveAttribute('data-dark'),
    )
    expect(Object.values({ ...localStorage })).toContain('dark') // kept for next visit

    await userEvent.click(toLight)
    expect(await screen.findByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-light'))
  })
})

describe('Favourite and comment pills', () => {
  it('no pills while nobody has favourited or commented', async () => {
    mockBackend()
    renderAt('/')
    await screen.findByText('Pikachu')
    expect(screen.queryByLabelText(/favourite/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/comment/)).not.toBeInTheDocument()
  })

  it('cards and the detail page show counts once there are some', async () => {
    const backend = mockBackend()
    backend.seedComment(25, MISTY, 'one')
    backend.seedComment(25, MISTY, 'two')
    renderAt('/')
    const card = (await screen.findByText('Pikachu')).closest('a')!
    expect(within(card).getByLabelText('2 comments')).toHaveTextContent('2')
    expect(within(card).queryByLabelText(/favourite/)).not.toBeInTheDocument()

    await userEvent.click(card)
    expect(await screen.findByRole('heading', { name: 'Pikachu' })).toBeInTheDocument()
    expect(screen.getByLabelText('2 comments')).toBeInTheDocument()
  })

  it('favouriting and commenting update the pills straight away', async () => {
    mockBackend({ signedInAs: { nickname: 'Ash' } })
    renderAt('/pokemon/25')
    await userEvent.click(await screen.findByRole('button', { name: 'Add to favourites' }))
    expect(await screen.findByLabelText('1 favourite')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Add a comment'), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByLabelText('1 comment')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Favourite' }))
    await waitFor(() => expect(screen.queryByLabelText('1 favourite')).not.toBeInTheDocument())
  })
})
