import {Command, CommandDeferType} from "@commands/commands";
import {ChatInputCommandInteraction, PermissionsString} from "discord.js";
import {InteractionUser, InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {TimeUtils} from "@utils/time";
import {UserStats} from "@models/database/user_stats";
import {NumberUtils} from "@utils/number";

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
        const userStatsController = new UserStatsController();
        const userStats = await userStatsController.getUserInGuild(guildId, interactionUser.id);
        if(!userStats){
            await InteractionUtils.editReply(intr, `${interactionUser.id} has no stats yet!`);
            return;
        }

        // Get the user live stats
        const startTimestampsController = new StartTimestampsController();
        const startTimestamps = await startTimestampsController.getUserByGuild(guildId, interactionUser.id);

        // Combine the live stats with the user stats
        startTimestamps?.combineAllWithUserStats(userStats, Date.now());

        // Build the reply
        const reply = this.formatReply(userStats, InteractionUtils.getInteractionUserRaw(intr));
        await InteractionUtils.editReply(intr, reply);
    }

    private formatReply(userStats: UserStats, user: unknown): string {

        // Time connected
        const timeConnected = TimeUtils.formatDuration(userStats.time_connected);

        // Time muted
        const timeMuted = TimeUtils.formatDuration(userStats.time_muted);
        const timeMutedPercentage = NumberUtils.getPercentageString(userStats.time_muted, userStats.time_connected);

        // Time deafened
        const timeDeafened = TimeUtils.formatDuration(userStats.time_deafened);
        const timeDeafenedPercentage = NumberUtils.getPercentageString(userStats.time_deafened, userStats.time_connected);

        // Time screen sharing
        const timeScreenSharing = TimeUtils.formatDuration(userStats.time_screen_sharing);
        const timeScreenSharingPercentage = NumberUtils.getPercentageString(userStats.time_screen_sharing, userStats.time_connected);

        // Time camera
        const timeCamera = TimeUtils.formatDuration(userStats.time_camera);
        const timeCameraPercentage = NumberUtils.getPercentageString(userStats.time_camera, userStats.time_connected);

        // Last activity
        const lastActivity = TimeUtils.formatDate(new Date(userStats.last_activity));

        return `
            **Stats for ${user}**
            \`Time Connected\` ${timeConnected}
            \`Time Muted\` ${timeMuted} **(${timeMutedPercentage})**
            \`Time Deafened\` ${timeDeafened} **(${timeDeafenedPercentage})**
            \`Time Screen Sharing\` ${timeScreenSharing} **(${timeScreenSharingPercentage})**
            \`Time Camera\` ${timeCamera} **(${timeCameraPercentage})**
            \`Last Activity\` ${lastActivity}
            \`Daily Streak\` ${userStats.daily_streak}
            \`Total Joins\` ${userStats.total_joins}
        `.replace(/^\s+/gm, ''); // Remove leading spaces from each line
    }
}
