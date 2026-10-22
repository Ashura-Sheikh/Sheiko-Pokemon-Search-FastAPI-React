/** Where to go after signing in: back to the page that sent the user here, if any.
 *  Only same-site paths ("/..."), never "//host" or full URLs, so a crafted link
 *  can't use the sign-in page to send someone to another website. */
export function returnPath(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
}
