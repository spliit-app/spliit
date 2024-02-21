import { formatCurrency } from '@/lib/utils'

type Props = {
    totalGroupSpendings: number
    currency: string
}

export function TotalsGroupSpending({ totalGroupSpendings, currency }: Props) {
    return (
        <>  
            <div className="text-lg text-muted-foreground">
                Total group spendings
            </div>
            <div className="text-lg">
                {formatCurrency(currency, totalGroupSpendings)}
            </div>
        </>
    )
}