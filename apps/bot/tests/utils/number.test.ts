import {NumberUtils} from "@gandhi/core/utils/number";

describe('NumberUtils', () => {
    describe('getPercentage', () => {
        it('computes a percentage', () => {
            expect(NumberUtils.getPercentage(50, 200)).toBe(25);
        });
        it('returns 0 when the total is 0', () => {
            expect(NumberUtils.getPercentage(5, 0)).toBe(0);
        });
        it('returns 0 when an argument is NaN', () => {
            expect(NumberUtils.getPercentage(NaN, 100)).toBe(0);
            expect(NumberUtils.getPercentage(10, NaN)).toBe(0);
        });
    });

    describe('getPercentageString', () => {
        it('formats a percentage with two decimals', () => {
            expect(NumberUtils.getPercentageString(1, 3)).toBe('33.33%');
        });
        it('returns 0.00% when the total is 0', () => {
            expect(NumberUtils.getPercentageString(5, 0)).toBe('0.00%');
        });
    });
});
