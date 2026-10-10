import { isValidCronAuthorization } from './cron'

describe('isValidCronAuthorization', () => {
  it('accepts the bearer secret', () => {
    expect(isValidCronAuthorization('Bearer s3cret', 's3cret')).toBe(true)
  })

  it('rejects a wrong secret, including one of a different length', () => {
    expect(isValidCronAuthorization('Bearer nope00', 's3cret')).toBe(false)
    expect(isValidCronAuthorization('Bearer s3cre', 's3cret')).toBe(false)
  })

  it('rejects the secret without the Bearer scheme', () => {
    expect(isValidCronAuthorization('s3cret', 's3cret')).toBe(false)
  })

  it('rejects a missing header', () => {
    expect(isValidCronAuthorization(null, 's3cret')).toBe(false)
  })
})
