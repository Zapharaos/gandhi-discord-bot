import {Command, CommandDeferType} from "@commands/commands";
import {ChatInputCommandInteraction, EmbedBuilder, PermissionsString, APIEmbedField} from "discord.js";
import {InteractionUser, InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {TimeUtils} from "@utils/time";
import {UserStatsModel} from "@models/database/user_stats";
import {NumberUtils} from "@utils/number";
import {StartTimestampsModel} from "@models/database/start_timestamps";

type TimeRelatedStat = {
    label: string;
    total: number;
    totalConnected?: number;
    highscore: number;
}
export class StatsCommand implements Command {
    public names = ['stats'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await InteractionUtils.editReply(intr, 'This command can only be used in a server.');
            return;
        }

        const interactionUser: InteractionUser = InteractionUtils.getInteractionUser(intr);

        // Get the user stats
        const rowUserStats = await UserStatsController.getUserInGuild(guildId, interactionUser.id);

        // Get the user live stats
        const rowStartTs = await StartTimestampsController.getUserByGuild(guildId, interactionUser.id);

        // User has no stats yet
        if (!rowUserStats && !rowStartTs) {
            await InteractionUtils.send(intr, `${InteractionUtils.getInteractionUserRaw(intr)} has no stats yet!`);
            return;
        }

        // Map from db generated types
        const userStats = UserStatsModel.fromUserStats(rowUserStats ?? {});
        const startTimestamps = StartTimestampsModel.fromStartTimestamps(rowStartTs ?? {});

        // Combine the live stats with the user stats
        const stats = startTimestamps?.combineAllWithUserStats(userStats, Date.now()) ?? {} as UserStatsModel;

        // Reply
        const eb = new EmbedBuilder()
            .setTitle(`Statistics for ${interactionUser.name}`)
            .addFields(this.formatStatsAsAPIEmbedField(stats))
            .setFooter({
                text: interactionUser.name,
                iconURL: interactionUser.avatar
            })
            .setTimestamp();

        await InteractionUtils.editReply(intr, eb);
    }

    private formatTimeStat(stat: TimeRelatedStat): APIEmbedField {
        let item = '';

        // Add the percentage if it exists
        if (stat.totalConnected && stat.total !== 0) {
            const value = NumberUtils.getPercentageString(stat.total, stat.totalConnected);
            item += `${value} **->** `;
        }

        // Add the value
        item += TimeUtils.formatDuration(stat.total);

        // Add the highscore if it exists
        if (stat.highscore && stat.total !== 0) {
            const value = TimeUtils.formatDuration(stat.highscore);
            item += `\n*Highscore **->** ${value}*`;
        }

        return {
            name: stat.label,
            value: item,
        };
    }

    private formatStatsAsAPIEmbedField(userStats: UserStatsModel): APIEmbedField[] {

        const stats: APIEmbedField[] = [];

        // Time connected
        const timeConnected: TimeRelatedStat = {
            label: '**Time Connected**',
            total: userStats.time_connected,
            highscore: userStats.time_connected
        }
        stats.push(this.formatTimeStat(timeConnected));

        // Time muted
        const timeMuted: TimeRelatedStat = {
            label: '**Time Muted**',
            total: userStats.time_muted,
            totalConnected: userStats.time_connected,
            highscore: userStats.time_muted
        }
        stats.push(this.formatTimeStat(timeMuted));

        // Time deafened
        const timeDeafened: TimeRelatedStat = {
            label: '**Time Deafened**',
            total: userStats.time_deafened,
            totalConnected: userStats.time_connected,
            highscore: userStats.time_deafened
        }
        stats.push(this.formatTimeStat(timeDeafened));

        // Time screen sharing
        const timeScreenSharing: TimeRelatedStat = {
            label: '**Time Screen Sharing**',
            total: userStats.time_screen_sharing,
            totalConnected: userStats.time_connected,
            highscore: userStats.time_screen_sharing
        }
        stats.push(this.formatTimeStat(timeScreenSharing));

        // Time camera
        const timeCamera: TimeRelatedStat = {
            label: '**Time Camera**',
            total: userStats.time_camera,
            totalConnected: userStats.time_connected,
            highscore: userStats.time_camera
        }
        stats.push(this.formatTimeStat(timeCamera));

        // Daily streak
        const dailyStreak = userStats.daily_streak.toString();
        const maxDailyStreak = userStats.daily_streak.toString();
        stats.push({
            name: '**Daily Streak**',
            value: dailyStreak + (userStats.daily_streak ? `; *Highscore **->** ${maxDailyStreak}*` : '')
        });

        // Last activity
        const lastActivity = userStats.last_activity ? TimeUtils.formatDate(new Date(userStats.last_activity)) : 'Never';
        stats.push({
            name: '**Last Activity**',
            value: lastActivity
        });

        return stats;
    }
}
