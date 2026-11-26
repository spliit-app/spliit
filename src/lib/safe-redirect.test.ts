import { safeNextPath } from './safe-redirect'

describe('safeNextPath', () => {
  it('keeps an in-app path', () => {
    expect(safeNextPath('/groups/abc/balances')).toBe('/groups/abc/balances')
    expect(safeNextPath('/groups?x=1')).toBe('/groups?x=1')
    expect(safeNextPath('/groups/abc#top')).toBe('/groups/abc#top')
  })

  it('refuses every shape that leaves the site', () => {
    // Protocol-relative, absolute, backslash-relative (WHATWG reads "\" as "/")
    // and non-http schemes: all of these are open redirects.
    expect(safeNextPath('//evil.example/groups')).toBe('/groups')
    expect(safeNextPath('/\\evil.example')).toBe('/groups')
    expect(safeNextPath('\\\\evil.example')).toBe('/groups')
    expect(safeNextPath('/\\/evil.example')).toBe('/groups')
    expect(safeNextPath('https://evil.example')).toBe('/groups')
    expect(safeNextPath('javascript:alert(1)')).toBe('/groups')
    expect(safeNextPath('http://user:pass@spliit.invalid/')).toBe('/groups')
  })

  it('falls back when there is no next at all', () => {
    expect(safeNextPath(null)).toBe('/groups')
    expect(safeNextPath(undefined)).toBe('/groups')
    expect(safeNextPath('')).toBe('/groups')
  })

  it('normalises to a path, so the fallback is a path too', () => {
    expect(safeNextPath('groups')).toBe('/groups')
    expect(safeNextPath('groups', '/home')).toBe('/groups')
  })
})
