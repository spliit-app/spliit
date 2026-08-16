import { expect, test } from './fixtures'

/**
 * The unit test next to the route handler proves the payload; this proves the
 * server actually answers at that path. `.well-known` is a dot-directory in
 * `src/app`, so whether it becomes a route at all is up to Next's file-system
 * router — a build that quietly stopped emitting it would leave the unit test
 * green and Universal Links dead.
 */
test('serves the Apple app site association at the well-known path', async ({
  request,
}) => {
  // iOS refuses to follow redirects for this file, so a redirect is a failure
  // rather than something to chase.
  const response = await request.get(
    '/.well-known/apple-app-site-association',
    { maxRedirects: 0 },
  )

  expect(response.status()).toBe(200)
  // Served without an extension: a host that guesses the type from the name
  // hands back octet-stream and iOS ignores the file without saying why.
  expect(response.headers()['content-type']).toContain('application/json')

  const association = await response.json()
  expect(association.applinks.details[0].appIDs).toContain(
    'VKY5EKKU47.app.spliit.spliitmobile',
  )
})
