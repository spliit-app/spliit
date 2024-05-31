'use client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getGroupExpensesByParticipant } from '@/lib/api'
import { LineSegment, VictoryPie, VictoryTheme } from 'victory'

type Props = {
  expensesByParticipant: NonNullable<
    Awaited<ReturnType<typeof getGroupExpensesByParticipant>>
  >
}

export function ParticipantSummary({ expensesByParticipant }: Props) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Spending by Participant</CardTitle>
        <CardDescription>Total spending by each participant.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col space-y-4">
        <VictoryPie
          theme={VictoryTheme.material}
          name="expenseByCategory"
          data={expensesByParticipant}
          x="participant"
          y="amount"
          sortKey="amount"
          sortOrder="descending"
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
              fontSize: 4,
            },
          }}
        />
      </CardContent>
    </Card>
  )
}
