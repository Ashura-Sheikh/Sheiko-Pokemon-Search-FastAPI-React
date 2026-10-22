export type Changes = Record<string, string | number | undefined>

/** Applies filter changes to the URL's query string. Empty values are removed,
 *  and any change other than the page itself goes back to page 1. */
export function applyChanges(current: URLSearchParams, changes: Changes): URLSearchParams {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
  }
  if (!('page' in changes)) next.delete('page')
  return next
}

/** "3" -> 3; anything that isn't a whole number above 0 -> undefined. */
export function positiveInt(value: string | null): number | undefined {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : undefined
}
