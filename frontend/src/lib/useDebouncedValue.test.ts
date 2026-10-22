import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedValue } from './useDebouncedValue'

// Simulated clock: exact timing, independent of how busy the machine is.
beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('only updates once the value has been still for the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    })
    rerender({ value: 'pika' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('pika')
  })

  it('restarts the wait on every change, so fast typing gives one update', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    })
    for (const text of ['p', 'pi', 'pik', 'pika']) {
      rerender({ value: text })
      act(() => vi.advanceTimersByTime(200)) // each key arrives before the 300ms is up
      expect(result.current).toBe('')
    }
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('pika')
  })
})
