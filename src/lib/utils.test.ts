import { formatCurrency } from "./utils"

describe("formatCurrency", () => {
    
    const currency = "CUR";
    /** For testing decimals */
    const partialAmount = 1.23;
    /** For testing small full amounts */
    const smallAmount = 1;
    /** For testing large full amounts */
    const largeAmount = 10000;

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
            result: new RegExp(`${currency}1\.23`),
        },
        {
            amount: smallAmount,
            locale: `en-US`,
            result: new RegExp(`${currency}1\.00`),
        },
        {
            amount: largeAmount,
            locale: `en-US`,
            result: new RegExp(`${currency}10,000`),
        },
        {
            amount: partialAmount,
            locale: `de-DE`,
            result: new RegExp(`1,23\\W${currency}`),
        },
        {
            amount: smallAmount,
            locale: `de-DE`,
            result: new RegExp(`1,00\\W${currency}`),
        },
        {
            amount: largeAmount,
            locale: `de-DE`,
            result: new RegExp(`10\.000,00\\W${currency}`),
        },
    ]

    for (const variation of variations) {
        it(`formats ${variation.amount} in ${variation.locale}`, () => {
            expect(formatCurrency(currency, variation.amount, variation.locale)).toMatch(variation.result);
        })
    }

})
