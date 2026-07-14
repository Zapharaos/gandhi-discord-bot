import {UserStatsModel, UserStatsFields} from "@gandhi/core/models/database/user_stats";

describe('UserStatsModel', () => {
    describe('constructor defaults', () => {
        it('defaults every stat to 0 and ids to null', () => {
            const m = new UserStatsModel();
            expect(m.time_connected).toBe(0);
            expect(m.daily_streak).toBe(0);
            expect(m.max_connected).toBe(0);
            expect(m.guild_id).toBeNull();
            expect(m.user_id).toBeNull();
            expect(m.isLive).toBe(false);
        });
    });

    describe('fromUserStats', () => {
        it('maps db row values into the model', () => {
            const m = UserStatsModel.fromUserStats({
                guild_id: 'g1',
                user_id: 'u1',
                time_connected: 5000,
                daily_streak: 3,
            } as never);
            expect(m.guild_id).toBe('g1');
            expect(m.user_id).toBe('u1');
            expect(m.time_connected).toBe(5000);
            expect(m.daily_streak).toBe(3);
        });
    });

    describe('formatStatAsDuration', () => {
        it('formats a time stat as a duration', () => {
            const m = new UserStatsModel({time_connected: 61000});
            expect(m.formatStatAsDuration(UserStatsFields.TimeConnected)).toBe('01m 01s');
        });
        it('returns null for a non-duration stat', () => {
            const m = new UserStatsModel({daily_streak: 4});
            expect(m.formatStatAsDuration(UserStatsFields.DailyStreak)).toBeNull();
        });
    });

    describe('formatStatAsPercentage', () => {
        it('expresses a time stat as a percentage of time connected', () => {
            const m = new UserStatsModel({time_connected: 100, time_muted: 25});
            expect(m.formatStatAsPercentage(UserStatsFields.TimeMuted)).toBe('25.00%');
        });
        it('returns null when the value is 0', () => {
            const m = new UserStatsModel({time_connected: 100, time_muted: 0});
            expect(m.formatStatAsPercentage(UserStatsFields.TimeMuted)).toBeNull();
        });
        it('returns null for a non-percentage stat', () => {
            const m = new UserStatsModel({daily_streak: 4});
            expect(m.formatStatAsPercentage(UserStatsFields.DailyStreak)).toBeNull();
        });
    });

    describe('formatStatAsString', () => {
        it('stringifies a raw stat value', () => {
            const m = new UserStatsModel({daily_streak: 5});
            expect(m.formatStatAsString(UserStatsFields.DailyStreak)).toBe('5');
        });
    });
});
