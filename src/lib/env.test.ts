/**
 * `env` is parsed once, when the module loads, so each case loads a fresh copy
 * with its own `process.env`.
 */
function loadEnv(vars: Record<string, string>) {
  const original = process.env
  process.env = {
    ...original,
    POSTGRES_URL_NON_POOLING: 'postgresql://localhost/spliit',
    POSTGRES_PRISMA_URL: 'postgresql://localhost/spliit',
    ANALYTICS_PROVIDER: '',
    ...vars,
  }
  try {
    let env: typeof import('./env').env | undefined
    jest.isolateModules(() => {
      env = require('./env').env
    })
    return env!
  } finally {
    process.env = original
  }
}

describe('ANALYTICS_PROVIDER', () => {
  it('is disabled when unset or blank', () => {
    expect(loadEnv({}).ANALYTICS_PROVIDER).toEqual([])
    expect(loadEnv({ ANALYTICS_PROVIDER: '  ' }).ANALYTICS_PROVIDER).toEqual([])
  })

  it('accepts a single provider', () => {
    expect(
      loadEnv({ ANALYTICS_PROVIDER: 'console' }).ANALYTICS_PROVIDER,
    ).toEqual(['console'])
  })

  it('accepts several, comma-separated, in order and without repeats', () => {
    expect(
      loadEnv({
        ANALYTICS_PROVIDER: ' plausible, console ,plausible, ',
        PLAUSIBLE_DOMAIN: 'example.com',
      }).ANALYTICS_PROVIDER,
    ).toEqual(['plausible', 'console'])
  })

  it('rejects an unknown provider', () => {
    expect(() => loadEnv({ ANALYTICS_PROVIDER: 'console,nope' })).toThrow()
  })

  it('requires each listed provider’s own variables', () => {
    expect(() => loadEnv({ ANALYTICS_PROVIDER: 'plausible' })).toThrow(
      /PLAUSIBLE_DOMAIN/,
    )
    expect(() =>
      loadEnv({ ANALYTICS_PROVIDER: 'umami', PLAUSIBLE_DOMAIN: 'example.com' }),
    ).toThrow(/UMAMI_WEBSITE_ID/)
    expect(() =>
      loadEnv({
        ANALYTICS_PROVIDER: 'plausible,umami',
        PLAUSIBLE_DOMAIN: 'example.com',
        UMAMI_WEBSITE_ID: 'website-id',
      }),
    ).not.toThrow()
  })
})
