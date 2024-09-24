import { formatCurrency } from "./utils"

describe("formatCurrency", () => {
    
    const currency = "CUR";
    const partialAmount = 1.23;
    const fullAmount = 1;

    interface variant {
        amount: number,
        locale: string,
        result: RegExp,
    }

    const variants: variant[] = [
        {
            amount: partialAmount,
            locale: `US-en`,
            result: new RegExp(`${currency}1.23`),
        },
        {
            amount: fullAmount,
            locale: `US-en`,
            result: new RegExp(`${currency}1.00`),
        },
        {
            amount: partialAmount,
            locale: `DE-de`,
            result: new RegExp(`1,23\\W${currency}`),
        },
        {
            amount: fullAmount,
            locale: `DE-de`,
            result: new RegExp(`1,00\\W${currency}`),
        },
    ]

    for (const variant of variants) {
        it(`formats ${variant.amount} in ${variant.locale}`, () => {
            expect(formatCurrency(currency, variant.amount, variant.locale)).toMatch(variant.result);
        })
    }

})
