'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupExpensesByCategory } from '@/lib/api'
import { VictoryPie, VictoryTheme } from 'victory'

type Props = {
  expenseByCategory: NonNullable<
    Awaited<ReturnType<typeof getGroupExpensesByCategory>>
  >
}

export function CategorySummary({ expenseByCategory }: Props) {
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
          data={expenseByCategory}
          x="category"
          y="amount"
          sortKey="amount"
          sortOrder="descending"
          colorScale="qualitative"
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
