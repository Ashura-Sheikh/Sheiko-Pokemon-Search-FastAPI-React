import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// findBy*/waitFor give up after 1s by default. A full MUI page update can take
// longer on a busy machine, so wait up to 5s (they still finish as soon as the
// condition is met).
configure({ asyncUtilTimeout: 5000 })

afterEach(() => cleanup())
