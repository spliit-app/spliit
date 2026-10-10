/**
 * Segments that follow `/groups/` or `/expenses/` without being an identifier.
 * Everything else in that position is a group or expense ID.
 */
const GROUP_ROUTES = new Set(['create'])
const EXPENSE_ROUTES = new Set(['create', 'export'])

/**
 * Replaces group and expense IDs in a path with placeholders, so they are never
 * sent to analytics. Those IDs are the capability to read someone's group, and
 * they are unique per document, which also turns the pages report into thousands
 * of one-visitor rows.
 *
 * `/groups/exampleGroupId0000000/expenses` → `/groups/[groupId]/expenses`
 */
export function anonymizePath(path: string): string {
  const [pathname, ...rest] = path.split(/(?=[?#])/)
  const segments = pathname.split('/')

  return (
    segments
      .map((segment, index) => {
        if (!segment) return segment
        const parent = segments[index - 1]
        if (parent === 'groups' && !GROUP_ROUTES.has(segment))
          return '[groupId]'
        if (parent === 'expenses' && !EXPENSE_ROUTES.has(segment))
          return '[expenseId]'
        return segment
      })
      .join('/') + rest.join('')
  )
}
