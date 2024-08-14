import { formatCurrency } from "./utils"

describe("formatCurrency", () => {
    
    const mockCurrency = "CUR";
    const mockAmount = 1.23;

    it("formats for US-en", () => {
        const mockLocale = "US-en";
        const expectedResult = "CUR1.23";
        const result = formatCurrency(mockCurrency, mockAmount, mockLocale);
        expect(result).toBe(expectedResult);
    })

    it("formats for DE-de", () => {
        const mockLocale = "DE-de";
        const expectedResult = "1,23 CUR";
        const result = formatCurrency(mockCurrency, mockAmount, mockLocale);
        expect(result).toBe(expectedResult);
    })
})
