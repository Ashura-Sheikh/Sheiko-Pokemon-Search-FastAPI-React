import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockBackend, renderAt } from '../test/render'

const MISTY = { id: 2, username: 'misty', password: 'starmie123', nickname: 'Misty' }

describe('Favourites', () => {
  it('guests are asked to sign in instead of seeing the button', async () => {
    mockBackend()
    renderAt('/pokemon/25')
    expect(await screen.findByRole('link', { name: 'Sign in to add favourites' })).toBeInTheDocument()
  })

  it('add a favourite, see it on My favourites, then remove it', async () => {
    mockBackend({ signedInAs: { nickname: 'Ash' } })
    renderAt('/pokemon/25')
    const add = await screen.findByRole('button', { name: 'Add to favourites' })
    expect(add).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(add)
    const on = await screen.findByRole('button', { name: 'Favourite' })
    expect(on).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('link', { name: 'Favourites' }))
    expect(await screen.findByRole('heading', { name: 'My favourites' })).toBeInTheDocument()
    expect(await screen.findByText('Pikachu')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Pikachu'))
    await userEvent.click(await screen.findByRole('button', { name: 'Favourite' }))
    expect(await screen.findByRole('button', { name: 'Add to favourites' })).toBeInTheDocument()
  })

  it('My favourites says so when empty', async () => {
    mockBackend({ signedInAs: { nickname: 'Ash' } })
    renderAt('/favourites')
    expect(await screen.findByText(/No favourites yet/)).toBeInTheDocument()
  })

  it('guests on My favourites are sent to sign in', async () => {
    mockBackend()
    renderAt('/favourites')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })
})

describe('Comments', () => {
  it('guests can read comments and are invited to sign in', async () => {
    const backend = mockBackend()
    backend.seedComment(25, MISTY, 'Pikachu is the best')
    renderAt('/pokemon/25')
    expect(await screen.findByText('Pikachu is the best')).toBeInTheDocument()
    expect(screen.getByText('Misty')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in to comment' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('signed in without a nickname: asked to choose one first', async () => {
    mockBackend({ signedInAs: { nickname: null } })
    renderAt('/pokemon/25')
    expect(await screen.findByRole('link', { name: 'Choose a nickname' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Add a comment')).not.toBeInTheDocument()
  })

  it('post, edit and delete your own comment', async () => {
    mockBackend({ signedInAs: { nickname: 'Ash' } })
    renderAt('/pokemon/25')
    const box = await screen.findByLabelText('Add a comment')
    await userEvent.type(box, 'My first partner!')
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))

    const section = screen.getByRole('region', { name: /Comments/ })
    expect(await within(section).findByText('My first partner!')).toBeInTheDocument()
    expect(within(section).getByText('Ash')).toBeInTheDocument()
    expect(box).toHaveValue('') // cleared after posting

    await userEvent.click(within(section).getByRole('button', { name: 'Edit' }))
    const editBox = within(section).getByLabelText('Edit your comment')
    await userEvent.clear(editBox)
    await userEvent.type(editBox, 'Still my favourite')
    await userEvent.click(within(section).getByRole('button', { name: 'Save' }))
    expect(await within(section).findByText('Still my favourite')).toBeInTheDocument()
    expect(within(section).getByText(/edited/)).toBeInTheDocument()

    await userEvent.click(within(section).getByRole('button', { name: 'Delete' }))
    await userEvent.click(within(section).getByRole('button', { name: 'Yes, delete' }))
    expect(await within(section).findByText('No comments yet.')).toBeInTheDocument()
  })

  it("others' comments have no Edit or Delete", async () => {
    const backend = mockBackend({ signedInAs: { nickname: 'Ash' } })
    backend.seedComment(25, MISTY, 'Not yours to change')
    renderAt('/pokemon/25')
    expect(await screen.findByText('Not yours to change')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows HTML in a comment as text, never runs it', async () => {
    const backend = mockBackend()
    backend.seedComment(25, MISTY, '<img src=x onerror="alert(1)">')
    renderAt('/pokemon/25')
    expect(await screen.findByText('<img src=x onerror="alert(1)">')).toBeInTheDocument()
    const section = screen.getByRole('region', { name: /Comments/ })
    expect(section.querySelector('img[src="x"]')).toBeNull()
  })

  it('Post is disabled until something is typed', async () => {
    mockBackend({ signedInAs: { nickname: 'Ash' } })
    renderAt('/pokemon/25')
    await screen.findByLabelText('Add a comment')
    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Add a comment'), '   ')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled())
  })
})

describe('User guide', () => {
  it('is linked from the top bar and covers each feature with examples', async () => {
    mockBackend()
    renderAt('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Guide' }))
    expect(await screen.findByRole('heading', { name: 'User guide' })).toBeInTheDocument()
    for (const title of [
      '1. Search and browse',
      '2. Look at a Pokémon',
      '3. Create an account or sign in',
      '4. Favourites',
      '5. Comments',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
    expect(screen.getAllByText('Example:').length).toBeGreaterThanOrEqual(7)
    expect(screen.getByRole('link', { name: 'Charizard (#6)' })).toHaveAttribute('href', '/pokemon/6')
  })
})
