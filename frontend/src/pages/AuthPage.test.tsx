import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { mockBackend, renderAt } from '../test/render'
import { returnPath } from '../lib/returnPath'

async function fillAndSubmit(username: string, password: string, button: string) {
  await userEvent.type(screen.getByLabelText(/Username/), username)
  await userEvent.type(screen.getByLabelText(/Password/), password)
  await userEvent.click(screen.getByRole('button', { name: button }))
}

describe('Sign-in flow', () => {
  it('guests see a Sign in button and can keep browsing', async () => {
    mockBackend()
    renderAt('/')
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(await screen.findByText('Bulbasaur')).toBeInTheDocument()
  })

  it('"Continue as guest" goes back to search', async () => {
    mockBackend()
    renderAt('/signin')
    await userEvent.click(await screen.findByRole('link', { name: 'Continue as guest' }))
    expect(await screen.findByText('Bulbasaur')).toBeInTheDocument()
  })

  it('register, choose a nickname, then see it in the top bar', async () => {
    const { sent } = mockBackend()
    renderAt('/register')
    await screen.findByRole('heading', { name: 'Create an account' })
    await fillAndSubmit('misty', 'starmie123', 'Create account')

    // New accounts are sent to choose a nickname.
    expect(await screen.findByRole('heading', { name: 'Choose a nickname' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Nickname/), 'Cerulean Misty')
    await userEvent.click(screen.getByRole('button', { name: 'Save nickname' }))

    expect(await screen.findByRole('link', { name: 'Cerulean Misty' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    // Every change request carried the header the backend's cross-site check needs.
    const changes = sent.filter((r) => r.method !== 'GET')
    expect(changes.map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /api/auth/register',
      'PATCH /api/me',
    ])
    expect(changes.every((r) => r.headers['x-requested-by'] === 'pokemon-app')).toBe(true)
  })

  it('shows the backend\'s message for a wrong password, and stays on the page', async () => {
    const { users } = mockBackend()
    users.push({ id: 1, username: 'ash', password: 'pikachu123', nickname: 'Ash' })
    renderAt('/signin')
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit('ash', 'wrong-pass', 'Sign in')
    expect(await screen.findByText('Incorrect username or password')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('signing in returns to the page that sent you there', async () => {
    const { users } = mockBackend()
    users.push({ id: 1, username: 'ash', password: 'pikachu123', nickname: 'Ash' })
    renderAt('/pokemon/25')
    await userEvent.click(await screen.findByRole('link', { name: 'Sign in' }))
    await screen.findByRole('heading', { name: 'Sign in' })
    await fillAndSubmit('ash', 'pikachu123', 'Sign in')
    expect(await screen.findByRole('heading', { name: 'Pikachu' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ash' })).toBeInTheDocument()
  })

  it('sign out returns to guest', async () => {
    mockBackend({ signedInAs: { nickname: 'Ash' } })
    renderAt('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ash' })).not.toBeInTheDocument()
  })

  it('the nickname page sends guests to sign in', async () => {
    mockBackend()
    renderAt('/nickname')
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('a taken nickname shows the backend\'s message', async () => {
    const { users } = mockBackend({ signedInAs: { nickname: null } })
    users.push({ id: 2, username: 'misty', password: 'x'.repeat(8), nickname: 'Champion' })
    renderAt('/nickname')
    await userEvent.type(await screen.findByLabelText(/Nickname/), 'champion')
    await userEvent.click(screen.getByRole('button', { name: 'Save nickname' }))
    expect(await screen.findByText('That nickname is taken')).toBeInTheDocument()
  })

  it('a signed-in user without a nickname is shown by username', async () => {
    mockBackend({ signedInAs: { username: 'ash', nickname: null } })
    renderAt('/')
    await waitFor(() => expect(screen.getByRole('link', { name: 'ash' })).toBeInTheDocument())
  })
})

describe('returnPath', () => {
  it('only returns same-site paths', () => {
    expect(returnPath({ from: '/pokemon/25' })).toBe('/pokemon/25')
    expect(returnPath({ from: '//evil.example' })).toBe('/')
    expect(returnPath({ from: 'https://evil.example' })).toBe('/')
    expect(returnPath(null)).toBe('/')
  })
})
