import { formatCurrency } from "./utils"

describe("formatCurrency", () => {
    
    const currency = "CUR";
    const partialAmount = 1.23;
    const fullAmount = 1;

    interface variation {
        amount: number,
        locale: string,
        result: RegExp,
    }

    /**
     * Variations to be tested, chosen as follows
     * - `en-US` is a very common i18n fallback
     * - `de-DE` exhibited faulty behavior in previous versions 
     */
    const variations: variation[] = [
        {
            amount: partialAmount,
            locale: `en-US`,
            result: new RegExp(`${currency}1.23`),
        },
        {
            amount: fullAmount,
            locale: `en-US`,
            result: new RegExp(`${currency}1.00`),
        },
        {
            amount: partialAmount,
            locale: `de-DE`,
            result: new RegExp(`1,23\\W${currency}`),
        },
        {
            amount: fullAmount,
            locale: `de-DE`,
            result: new RegExp(`1,00\\W${currency}`),
        },
    ]

    for (const variation of variations) {
        it(`formats ${variation.amount} in ${variation.locale}`, () => {
            expect(formatCurrency(currency, variation.amount, variation.locale)).toMatch(variation.result);
        })
    }

})
