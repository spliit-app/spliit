import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Prisma can't express DEFERRABLE and ignores it when diffing, so a future
 * migration that touches these relations would recreate the foreign keys
 * without it, and deleting a group (which removes its participants before its
 * expenses) would start failing. The latest migration defining each one must
 * keep it.
 */
const dir = join(__dirname, 'migrations')
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
  .map((name) => readFileSync(join(dir, name, 'migration.sql'), 'utf8'))

test.each(['Expense_paidById_fkey', 'ExpensePaidFor_participantId_fkey'])(
  '%s stays DEFERRABLE INITIALLY DEFERRED',
  (constraint) => {
    const definitions = migrations
      .flatMap((sql) => sql.split(';'))
      .filter((statement) =>
        statement.includes(`ADD CONSTRAINT "${constraint}"`),
      )
    expect(definitions.at(-1)).toContain('DEFERRABLE INITIALLY DEFERRED')
  },
)
