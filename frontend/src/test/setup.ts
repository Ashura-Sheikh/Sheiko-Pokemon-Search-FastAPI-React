import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// findBy*/waitFor give up after 1s by default. A full MUI page update can take
// longer on a busy machine, so wait up to 5s (they still finish as soon as the
// condition is met).
configure({ asyncUtilTimeout: 5000 })

// jsdom has no matchMedia; MUI uses it to read the computer's light/dark setting.
// Tests behave like a computer set to light mode.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

afterEach(() => {
  cleanup()
  localStorage.clear() // the saved light/dark choice mustn't leak between tests
})
