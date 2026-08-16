/**
 * @jest-environment node
 */
import { GET } from './route'

/**
 * iOS never reports why it rejected an association file, so the failures worth
 * catching here are the silent ones: a wrong content type, a body that isn’t
 * JSON, or an app ID missing its team prefix.
 */
describe('apple-app-site-association', () => {
  it('is served as JSON on a plain 200', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')
    await expect(response.json()).resolves.toBeDefined()
  })

  it('names the iOS app, team prefix included', async () => {
    const { applinks } = await (await GET()).json()

    const appIDs = applinks.details.flatMap(
      (detail: { appIDs: string[] }) => detail.appIDs,
    )
    expect(appIDs).toContain('VKY5EKKU47.app.spliit.spliitmobile')
    for (const appID of appIDs) {
      expect(appID).toMatch(/^[A-Z0-9]{10}\.[a-z0-9.-]+$/)
    }
  })

  it('claims group links and nothing else', async () => {
    const { applinks } = await (await GET()).json()

    const paths = applinks.details.flatMap(
      (detail: { components: { '/': string }[] }) =>
        detail.components.map((component) => component['/']),
    )
    expect(paths).toEqual(['/groups/*'])
  })
})
