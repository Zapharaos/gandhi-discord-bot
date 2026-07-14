import {StartTimestampsModel, StartTsFields} from "@gandhi/core/models/database/start_timestamps";
import {UserStatsModel, UserStatsFields} from "@gandhi/core/models/database/user_stats";

describe('StartTimestampsModel', () => {
    describe('isActive', () => {
        it('is active when start_connected is non-zero', () => {
            expect(new StartTimestampsModel({start_connected: 123}).isActive()).toBe(true);
        });
        it('is inactive when start_connected is zero', () => {
            expect(new StartTimestampsModel({start_connected: 0}).isActive()).toBe(false);
        });
    });

    describe('getColNameFromUserStat', () => {
        it('maps time/max stats to their start_* column', () => {
            expect(StartTimestampsModel.getColNameFromUserStat(UserStatsFields.TimeMuted)).toBe(StartTsFields.StartMuted);
            expect(StartTimestampsModel.getColNameFromUserStat(UserStatsFields.MaxCamera)).toBe(StartTsFields.StartCamera);
            expect(StartTimestampsModel.getColNameFromUserStat(UserStatsFields.TimeConnected)).toBe(StartTsFields.StartConnected);
        });
        it('defaults to start_connected for unknown stats', () => {
            expect(StartTimestampsModel.getColNameFromUserStat('unknown')).toBe(StartTsFields.StartConnected);
        });
    });

    describe('combineAllWithUserStats', () => {
        it('leaves stats untouched when not active', () => {
            const stats = new UserStatsModel({time_connected: 1000});
            const ts = new StartTimestampsModel({start_connected: 0});
            const result = ts.combineAllWithUserStats(stats, Date.now());
            expect(result.time_connected).toBe(1000);
        });

        it('adds the live connected duration and updates the max', () => {
            const now = 10_000;
            const stats = new UserStatsModel({time_connected: 2000, max_connected: 500});
            const ts = new StartTimestampsModel({start_connected: now - 3000});
            const result = ts.combineAllWithUserStats(stats, now);
            expect(result.time_connected).toBe(2000 + 3000);
            expect(result.max_connected).toBe(3000); // 3000 > previous max 500
        });

        it('accumulates live sub-state durations too', () => {
            const now = 10_000;
            const stats = new UserStatsModel({});
            const ts = new StartTimestampsModel({
                start_connected: now - 5000,
                start_muted: now - 1000,
            });
            const result = ts.combineAllWithUserStats(stats, now);
            expect(result.time_connected).toBe(5000);
            expect(result.time_muted).toBe(1000);
            expect(result.max_muted).toBe(1000);
        });
    });
});
