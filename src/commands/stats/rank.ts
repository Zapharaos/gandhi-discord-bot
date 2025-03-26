import {Command, CommandDeferType} from "@commands/commands";
import {ChatInputCommandInteraction, Guild, PermissionsString} from "discord.js";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {Logger} from "@services/logger";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {UserStatsModel, StatKey as UserStatsKey, UserStatsFields, StatTimeRelated} from "@models/database/user_stats";
import {TimeUtils} from "@utils/time";
import {StartTimestampsModel, StatKey} from "@models/database/start_timestamps";
import {NumberUtils} from "@utils/number";

type RankUser = UserStatsModel & { guildNickname?: string };

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

        const stat: string = intr.options.getString('stat') || UserStatsFields.TimeConnected;

        // Get the users stats in the guild by the specified stat
        const rowsUserStats = await UserStatsController.getUsersInGuildByStat(guildId, stat);
        const usersStats = rowsUserStats.map(row => UserStatsModel.fromUserStats(row));

        // Get the object keys for the specified stats inside the objects
        const userStatKey = UserStatsModel.getStatKey(stat);
        const startStat: string | null = StartTimestampsModel.getColNameFromUserStat(stat);
        const startStatKey: StatKey | null = startStat ? StartTimestampsModel.getStatKey(startStat) : null;

        Logger.debug(`Calculating ranks for stat: ${userStatKey}`);

        // Get the users live stats in the guild by the specified stat
        const rowsStartTs = await StartTimestampsController.getUsersInGuildByStat(guildId, startStatKey);

        // Convert the live stats array to a map for faster lookup
        const usersLiveStats = new Map<string, StartTimestampsModel>();
        rowsStartTs.forEach(item => {
            if (!item.user_id) return;
            usersLiveStats.set(item.user_id, StartTimestampsModel.fromStartTimestamps(item));
        });

        // Process the stats : combine with live stats + retrieve user nickname
        const rankUsers: RankUser[] = [];
        const now = Date.now();
        for (const row of usersStats) {

            // Combine the user stats with his live stats (if any)
            const liveStat = usersLiveStats.get(row.user_id!);
            liveStat?.combineWithUserStats(row, userStatKey, startStatKey, now);

            // Filter out those with a 0 value
            if (row[userStatKey] === 0) {
                continue;
            }

            // Retrieve the user's nickname in the guild
            const guildNickname = await InteractionUtils.fetchGuildMemberNickname(intr.guild as Guild, row.user_id!);
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

        if (!rankUsers.length) {
            Logger.debug(`RankCommand - No user stats found for the stat ${stat}`);
            await InteractionUtils.editReply(intr, `No data found for the stat ${stat}.`);
            return;
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

    private formatRow(row: RankUser, index: number, stat: string, userStatKey: UserStatsKey): string {
        // If the stat is last_activity, format the value as a date
        if (stat === UserStatsFields.LastActivity) {
            const date = TimeUtils.formatDate(new Date(row.last_activity));
            return `\`${index + 1}. ${row.guildNickname}\` ${date}`;
        }

        // If the stat is a time-based stat, format the value as a duration
        if (stat !== UserStatsFields.TimeConnected && StatTimeRelated.includes(stat as UserStatsFields)) {
            const value = TimeUtils.formatDuration(row[userStatKey]);
            const percentage = NumberUtils.getPercentageString(row[userStatKey], row.time_connected);
            return `\`${index + 1}. ${row.guildNickname}\` ${value} **(${percentage})**`;
        }

        // Otherwise, just retrieve the value
        let value: number | string = row[userStatKey];

        // If the stat is time_connected, format the value as a duration
        if (stat === UserStatsFields.TimeConnected) {
            value = TimeUtils.formatDuration(row[stat]);
        }

        return `\`${index + 1}. ${row.guildNickname}\` ${value}`;
    }
}