import {DatabaseUtils} from "@gandhi/core/utils/database";

describe('DatabaseUtils', () => {
    it('unwraps a generated number value', () => {
        // Values come back from Kysely wrapped as Generated<number>; unwrap returns the raw number.
        expect(DatabaseUtils.unwrapGeneratedNumber(DatabaseUtils.newGenerated(42))).toBe(42);
    });

    it('round-trips through newGenerated', () => {
        const gen = DatabaseUtils.newGenerated(7);
        expect(DatabaseUtils.unwrapGeneratedNumber(gen)).toBe(7);
    });
});
