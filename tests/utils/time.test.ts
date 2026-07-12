import {TimeUtils} from "@utils/time";

describe('TimeUtils', () => {
    describe('getDuration', () => {
        it('returns end - start for a normal interval', () => {
            expect(TimeUtils.getDuration(10, 30)).toBe(20);
        });
        it('returns 0 when start is 0 (no active session)', () => {
            expect(TimeUtils.getDuration(0, 5000)).toBe(0);
        });
    });

    describe('msToMinutes', () => {
        it('converts milliseconds to rounded minutes', () => {
            expect(TimeUtils.msToMinutes(120000)).toBe(2);
            expect(TimeUtils.msToMinutes(90000)).toBe(2); // 1.5 -> round up
        });
    });

    describe('msToDays', () => {
        it('converts milliseconds to rounded days', () => {
            expect(TimeUtils.msToDays(86400000)).toBe(1);
            expect(TimeUtils.msToDays(2 * 86400000)).toBe(2);
        });
    });

    describe('durationAsPercentage', () => {
        it('computes the percentage of a duration', () => {
            expect(TimeUtils.durationAsPercentage(50, 200)).toBe(25);
        });
    });

    describe('tsRoundDownToDay', () => {
        it('rounds a timestamp down to UTC midnight', () => {
            const ts = Date.UTC(2024, 0, 15, 13, 20, 5);
            expect(TimeUtils.tsRoundDownToDay(ts)).toBe(Date.UTC(2024, 0, 15));
        });
    });

    describe('tsToYYYYMMDD', () => {
        it('formats a timestamp as YYYY-MM-DD', () => {
            expect(TimeUtils.tsToYYYYMMDD(Date.UTC(2024, 0, 15))).toBe('2024-01-15');
        });
    });

    describe('getDaysDifference', () => {
        it('returns the number of whole days between two timestamps', () => {
            const start = Date.UTC(2024, 0, 1, 10);
            const end = Date.UTC(2024, 0, 2, 5);
            expect(TimeUtils.getDaysDifference(start, end)).toBe(1);
        });
        it('returns 0 for two timestamps on the same day', () => {
            const start = Date.UTC(2024, 0, 1, 1);
            const end = Date.UTC(2024, 0, 1, 23);
            expect(TimeUtils.getDaysDifference(start, end)).toBe(0);
        });
    });

    describe('formatDuration', () => {
        it('formats zero as 00s', () => {
            expect(TimeUtils.formatDuration(0)).toBe('00s');
        });
        it('formats a single second', () => {
            expect(TimeUtils.formatDuration(1000)).toBe('01s');
        });
        it('formats minutes and seconds', () => {
            expect(TimeUtils.formatDuration(61000)).toBe('01m 01s');
        });
        it('pads intermediate zero units once a larger unit is present', () => {
            expect(TimeUtils.formatDuration(3600000)).toBe('01h 00m 00s');
        });
        it('formats sub-second durations as fractional seconds', () => {
            expect(TimeUtils.formatDuration(500)).toBe('0.500s');
        });
    });

    describe('formatDate', () => {
        it('formats a date as DD/MM/YYYY, HHhMMmSSs in UTC', () => {
            const date = new Date(Date.UTC(2024, 0, 5, 9, 3, 7));
            expect(TimeUtils.formatDate(date)).toBe('05/01/2024, 09h03m07s');
        });
    });
});
