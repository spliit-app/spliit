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

describe('ENABLE_GROUP_DELETION', () => {
  it('is disabled by default', () => {
    expect(
      loadEnv({ ENABLE_GROUP_DELETION: '', CRON_SECRET: '' })
        .ENABLE_GROUP_DELETION,
    ).toBe(false)
  })

  it('requires CRON_SECRET, as groups are only purged by the cron job', () => {
    expect(() =>
      loadEnv({ ENABLE_GROUP_DELETION: 'true', CRON_SECRET: '' }),
    ).toThrow(/CRON_SECRET/)
    expect(
      loadEnv({ ENABLE_GROUP_DELETION: 'true', CRON_SECRET: 's3cret' })
        .ENABLE_GROUP_DELETION,
    ).toBe(true)
  })
})

describe('BACKUP_S3_BUCKET', () => {
  const noUploadCredentials = {
    S3_UPLOAD_KEY: '',
    S3_UPLOAD_SECRET: '',
    S3_UPLOAD_REGION: '',
  }

  it('is optional', () => {
    expect(loadEnv({ BACKUP_S3_BUCKET: '' }).BACKUP_S3_BUCKET).toBeUndefined()
  })

  it('requires CRON_SECRET, as backups are only taken by the cron job', () => {
    expect(() =>
      loadEnv({
        BACKUP_S3_BUCKET: 'backups',
        BACKUP_S3_KEY: 'k',
        BACKUP_S3_SECRET: 's',
        BACKUP_S3_REGION: 'auto',
        CRON_SECRET: '',
      }),
    ).toThrow(/CRON_SECRET/)
  })

  it('requires credentials, from BACKUP_S3_* or S3_UPLOAD_*', () => {
    expect(() =>
      loadEnv({
        ...noUploadCredentials,
        BACKUP_S3_BUCKET: 'backups',
        CRON_SECRET: 's3cret',
      }),
    ).toThrow(/BACKUP_S3_KEY, BACKUP_S3_SECRET, BACKUP_S3_REGION/)
    expect(
      loadEnv({
        S3_UPLOAD_KEY: 'k',
        S3_UPLOAD_SECRET: 's',
        S3_UPLOAD_REGION: 'eu-north-1',
        BACKUP_S3_BUCKET: 'backups',
        CRON_SECRET: 's3cret',
      }).BACKUP_S3_BUCKET,
    ).toBe('backups')
  })
})
