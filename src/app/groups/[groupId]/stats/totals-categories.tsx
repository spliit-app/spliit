'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupExpensesByCategory } from '@/lib/api'
import { LineSegment, VictoryPie, VictoryTheme } from 'victory'

type Props = {
  expenseByCategory: NonNullable<
    Awaited<ReturnType<typeof getGroupExpensesByCategory>>
  >
}

export function CategorySummary({ expenseByCategory }: Props) {
  const maxCategories = 12
  const data = expenseByCategory.slice(
    0,
    Math.min(expenseByCategory.length, maxCategories),
  )

  if (expenseByCategory.length > maxCategories) {
    data.push({
      category: 'Other Categories',
      amount: expenseByCategory
        .slice(maxCategories, expenseByCategory.length)
        .reduce((p, d) => p + (d.amount ?? 0), 0),
    })
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>Total spending in each category.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        <VictoryPie
          theme={VictoryTheme.material}
          name="expenseByCategory"
          data={data}
          x="category"
          y="amount"
          colorScale="qualitative"
          labelIndicator={
            <LineSegment
              style={{ stroke: 'red', strokeDasharray: 1, fill: 'none' }}
            />
          }
          labelIndicatorInnerOffset={10}
          labelIndicatorOuterOffset={5}
          style={{
            labels: {
              fontSize: 6,
            },
          }}
        />
      </CardContent>
    </Card>
  )
}
