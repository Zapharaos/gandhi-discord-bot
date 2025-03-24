import {Command, CommandDeferType} from "@commands/commands";
import {ChatInputCommandInteraction, Guild, PermissionsString} from "discord.js";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {Logger} from "@services/logger";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {UserStats} from "@models/database/user_stats";
import {TimeUtils} from "@utils/time";
import {StartTimestamps} from "@models/database/start_timestamps";
import {NumberUtils} from "@utils/number";

type RankUser = UserStats & { guildNickname?: string };

// TODO : fix by dailystreak = no daily_streak field in start_timestamps
// TODO : fix % is 0
export class RankCommand implements Command {
    public names = ['rank'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await InteractionUtils.editReply(intr, 'This command can only be used in a server.');
            return;
        }

        const stat: string = intr.options.getString('stat') || 'time_connected';

        // Get the users stats in the guild by the specified stat
        const userStatsController = new UserStatsController();
        const usersStats = await userStatsController.getUsersInGuildByStat(guildId, stat);
        if (!usersStats.length) {
            Logger.debug(`RankCommand - No user stats found for the stat ${stat}`);
            await InteractionUtils.editReply(intr, `No data found for the stat ${stat}.`);
            return;
        }

        // Get the object keys for the specified stats inside the objects
        const userStatKey = UserStats.getStatKey(stat);
        const startStatKey = StartTimestamps.getStatKey(stat.replace('time_', 'start_'));

        Logger.debug(`Calculating ranks for stat: ${userStatKey}`);

        // Get the users live stats in the guild by the specified stat
        const startTsController = new StartTimestampsController();
        const usersLiveStatsArray: StartTimestamps[] = await startTsController.getUsersInGuildByStat(guildId, startStatKey);

        // Convert the live stats array to a map for faster lookup
        const usersLiveStats = new Map<string, StartTimestamps>();
        usersLiveStatsArray.forEach(item => {
            usersLiveStats.set(item.user_id, new StartTimestamps(item));
        });

        // Process the stats : combine with live stats + retrieve user nickname
        const rankUsers: RankUser[] = [];
        const now = Date.now();
        for (const row of usersStats) {

            // Retrieve the live stat for the user
            const liveStat = usersLiveStats.get(row.user_id) as StartTimestamps;

            // Combine the user stats with his live stats
            liveStat?.combineWithUserStats(row, userStatKey, startStatKey, now);

            // Retrieve the user's nickname in the guild
            const guildNickname = await InteractionUtils.fetchGuildMemberNickname(intr.guild as Guild, row.user_id);
            if (!guildNickname) {
                // TODO : on user quit or user ban -> remove user from guild related tables
                continue;
            }

            // Filter out those without a nickname
            rankUsers.push({
                ...row,
                guildNickname: guildNickname
            });
        }

        // Sort the rows by the stat in descending order
        rankUsers.sort((a, b) => b[userStatKey] - a[userStatKey]);

        // Format the rank message for each user
        const messages: string[] = [];
        rankUsers.forEach((row, index) => {
            const message = this.formatRow(row, index, stat, userStatKey);
            messages.push(message);
        });

        const reply = `**Ranking for ${stat.replace('_', ' ')}:**\n${messages.join('\n')}`;
        await InteractionUtils.editReply(intr, reply);
    }

    private formatRow(row: RankUser, index: number, stat: string, userStatKey: string): string {
        // If the stat is a time-based stat, format the value as a duration
        if (stat.includes('time') && stat !== 'time_connected') {
            const value = TimeUtils.formatDuration(row[userStatKey]);
            const percentage = NumberUtils.getPercentageString(row[userStatKey], row.time_connected);
            return `\`${index + 1}. ${row.guildNickname}\` ${value} **(${percentage})**`;
        }

        // Otherwise, just retrieve the value
        let value: number | string = row[userStatKey];

        // If the stat is time_connected, format the value as a duration
        if (stat === 'time_connected') {
            value = TimeUtils.formatDuration(row[stat]);
        }

        return `\`${index + 1}. ${row.guildNickname}\` ${value}`;
    }
}