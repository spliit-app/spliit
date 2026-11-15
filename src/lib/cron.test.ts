import { isValidBearerAuthorization } from './cron'

describe('isValidBearerAuthorization', () => {
  it('accepts the bearer secret', () => {
    expect(isValidBearerAuthorization('Bearer s3cret', 's3cret')).toBe(true)
  })

  it('rejects a wrong secret, including one of a different length', () => {
    expect(isValidBearerAuthorization('Bearer nope00', 's3cret')).toBe(false)
    expect(isValidBearerAuthorization('Bearer s3cre', 's3cret')).toBe(false)
  })

  it('rejects the secret without the Bearer scheme', () => {
    expect(isValidBearerAuthorization('s3cret', 's3cret')).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isValidBearerAuthorization(null, 's3cret')).toBe(false)
  })
})
