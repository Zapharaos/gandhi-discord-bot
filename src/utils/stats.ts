import {VoiceProps} from "@models/voice-props";
import {UserStatsFields} from "@models/database/user_stats";
import {StartTsFields} from "@models/database/start_timestamps";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {DailyStatsController} from "@controllers/daily-stats";
import {UserStatsController} from "@controllers/user-stats";

export class StatsControllersUtils {
    static async updateStat(props: VoiceProps, userStatsField: UserStatsFields, startTsField: StartTsFields, duration: number, now: number): Promise<void> {
        // Update user stats
        await UserStatsController.updateUserStats(props.guildId, props.userId, userStatsField, duration);
        await UserStatsController.updateLastActivityAndStreak(props.guildId, props.userId, now);

        // Update user daily stats
        await DailyStatsController.updateUserDailyStats(props.guildId, props.userId, userStatsField, duration, now);

        // Stop camera timestamp for user
        await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, startTsField, 0);
    }
}