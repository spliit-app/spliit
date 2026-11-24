import { z } from 'zod'

export const TAG_NAME_MAX = 50
export const EXPENSE_TAGS_MAX = 10

export function normalizeTagName(name: string) {
  return name.trim().normalize('NFKC').toLowerCase()
}

export function getTagColor(name: string, opacity = 1) {
  let hash = 2166136261
  for (const character of normalizeTagName(name)) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619) >>> 0
  }
  return `hsl(var(--chart-${(hash % 5) + 1}) / ${opacity})`
}

export const tagNameSchema = z
  .string()
  .max(TAG_NAME_MAX * 2, 'invalidTagName')
  .refine((name) => !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(name), 'invalidTagName')
  .transform((name) => name.trim())
  .refine(
    (name) => [...name].length > 0 && [...name].length <= TAG_NAME_MAX,
    'invalidTagName',
  )

export const expenseTagSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  name: tagNameSchema,
})

export type ExpenseTag = z.infer<typeof expenseTagSchema>

export const expenseTagsSchema = z
  .array(expenseTagSchema)
  .max(EXPENSE_TAGS_MAX, 'tooManyTags')
  .transform((tags) => {
    const unique = new Map<string, ExpenseTag>()
    for (const tag of tags) {
      const key = tag.id ? `id:${tag.id}` : `name:${normalizeTagName(tag.name)}`
      if (!unique.has(key)) unique.set(key, tag)
    }
    return [...unique.values()]
  })

export function resolveExpenseTagSelection(
  names: string[],
  selected: ExpenseTag[],
  options: ExpenseTag[],
): ExpenseTag[] {
  return names.map(
    (name) =>
      selected.find(
        (tag) => normalizeTagName(tag.name) === normalizeTagName(name),
      ) ??
      options.find(
        (tag) => normalizeTagName(tag.name) === normalizeTagName(name),
      ) ?? { name },
  )
}

type TaggedExpense = {
  id: string
  amount: number
  isReimbursement: boolean
  tags: { id: string; name: string }[]
}

export type TagSpending = {
  tagId: string | null
  name: string
  total: number
}

export function getSpendingByTag(expenses: TaggedExpense[]): TagSpending[] {
  const totals = new Map<string | null, TagSpending>()
  for (const expense of expenses) {
    if (expense.isReimbursement) continue
    const tags = expense.tags.length ? expense.tags : [{ id: null, name: '' }]
    for (const tag of tags) {
      const existing = totals.get(tag.id)
      if (existing) existing.total += expense.amount
      else
        totals.set(tag.id, {
          tagId: tag.id,
          name: tag.name,
          total: expense.amount,
        })
    }
  }
  return [...totals.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  )
}

export function getExpensesByTag<T extends TaggedExpense>(
  expenses: T[],
  tagId: string | null,
): T[] {
  return expenses.filter(
    (expense) =>
      !expense.isReimbursement &&
      (tagId === null
        ? expense.tags.length === 0
        : expense.tags.some((tag) => tag.id === tagId)),
  )
}

export function getExportTagNames(tags: { name: string }[]) {
  return tags.map((tag) => tag.name).sort()
}
