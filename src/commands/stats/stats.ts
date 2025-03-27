import {Command, CommandDeferType} from "@commands/commands";
import {ChatInputCommandInteraction, PermissionsString} from "discord.js";
import {InteractionUser, InteractionUtils, ReplyTableRow} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {TimeUtils} from "@utils/time";
import {UserStatsModel} from "@models/database/user_stats";
import {NumberUtils} from "@utils/number";
import {StartTimestampsModel} from "@models/database/start_timestamps";

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
        if(!rowUserStats && !rowStartTs){
            await InteractionUtils.send(intr, `${InteractionUtils.getInteractionUserRaw(intr)} has no stats yet!`);
            return;
        }

        // Map from db generated types
        const userStats = UserStatsModel.fromUserStats(rowUserStats ?? {});
        const startTimestamps = StartTimestampsModel.fromStartTimestamps(rowStartTs ?? {});

        // Combine the live stats with the user stats
        const stats = startTimestamps?.combineAllWithUserStats(userStats, Date.now()) ?? {} as UserStatsModel;

        // Build the reply
        const reply = this.formatReply(stats, InteractionUtils.getInteractionUserRaw(intr));
        await InteractionUtils.editReply(intr, reply);
    }

    private formatReply(userStats: UserStatsModel, user: unknown): string {

        const stats: ReplyTableRow[] = [];

        // Time connected
        const timeConnected = TimeUtils.formatDuration(userStats.time_connected);
        stats.push({ label: 'Time Connected', main: timeConnected });

        // Time muted
        const timeMuted = TimeUtils.formatDuration(userStats.time_muted);
        const timeMutedPercentage = NumberUtils.getPercentageString(userStats.time_muted, userStats.time_connected);
        stats.push({ label: 'Time Muted', main: timeMuted, secondary: timeMutedPercentage });

        // Time deafened
        const timeDeafened = TimeUtils.formatDuration(userStats.time_deafened);
        const timeDeafenedPercentage = NumberUtils.getPercentageString(userStats.time_deafened, userStats.time_connected);
        stats.push({ label: 'Time Deafened', main: timeDeafened, secondary: timeDeafenedPercentage });

        // Time screen sharing
        const timeScreenSharing = TimeUtils.formatDuration(userStats.time_screen_sharing);
        const timeScreenSharingPercentage = NumberUtils.getPercentageString(userStats.time_screen_sharing, userStats.time_connected);
        stats.push({ label: 'Time Screen Sharing', main: timeScreenSharing, secondary: timeScreenSharingPercentage });

        // Time camera
        const timeCamera = TimeUtils.formatDuration(userStats.time_camera);
        const timeCameraPercentage = NumberUtils.getPercentageString(userStats.time_camera, userStats.time_connected);
        stats.push({ label: 'Time Camera', main: timeCamera, secondary: timeCameraPercentage });

        // Last activity
        const lastActivity = userStats.last_activity ? TimeUtils.formatDate(new Date(userStats.last_activity)) : 'Never';
        stats.push({ label: 'Last Activity', main: lastActivity });

        // Others
        stats.push({ label: 'Daily Streak', main: userStats.daily_streak.toString() });
        stats.push({ label: 'Total Joins', main: userStats.total_joins.toString() });

        return `
            **Stats for ${user}**
            \`\`\`${InteractionUtils.formatReplyAsTable(stats)}\`\`\`
        `.replace(/^\s+/gm, ''); // Remove leading spaces from each line
    }
}
