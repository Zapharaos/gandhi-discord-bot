import {Command, CommandDeferType} from "@commands/commands";
import {
    ChatInputCommandInteraction,
    EmbedBuilder,
    Guild,
    PermissionsString,
} from "discord.js";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {Logger} from "@services/logger";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {
    UserStatsModel,
    StatKey as UserStatsKey,
    UserStatsFields,
    StatTimeRelated,
    StatMaxRelated
} from "@models/database/user_stats";
import {StartTimestampsModel, StatKey} from "@models/database/start_timestamps";
import {EmbedBuilderUtils} from "@utils/embed-builder";

class RankUser extends UserStatsModel{
    guildNickname: string
    isLive: boolean

    constructor(userStats: UserStatsModel, guildNickname: string, isLive: boolean) {
        super(userStats);
        this.guildNickname = guildNickname;
        this.isLive = isLive;
    }
};

export class RankCommand implements Command {
    public names = ['rank'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];
    private readonly pageSize = 10;

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
                continue;
            }

            // Filter out those without a nickname
            rankUsers.push(
                new RankUser(row, guildNickname, liveStat?.isActive() ?? false)
            );
        }

        // Return early if no user stats were found
        if (!rankUsers.length) {
            Logger.debug(`RankCommand - No user stats found for the stat ${stat}`);
            await InteractionUtils.editReply(intr, `No data found for the stat ${stat}.`);
            return;
        }

        // Sort the rows by the stat in descending order
        rankUsers.sort((a, b) => b[userStatKey] - a[userStatKey]);

        // Format the ranks as embed fields
        const pages: string[][][] = [];
        rankUsers.forEach((row, index) => {
            const pageIndex = Math.floor(index / this.pageSize);
            if (!pages[pageIndex]) {
                pages[pageIndex] = [];
            }
            const page = this.mapStatsToTableRow(row, index, stat, userStatKey);
            pages[pageIndex].push(page);
        });

        const ebs = this.buildEmbedBuilders(pages, stat.replace('_', ' '));
        await InteractionUtils.replyWithPagination(intr, ebs);
    }

    private buildEmbedBuilders(pages: string[][][], stat: string): EmbedBuilder[] {
        const ebs: EmbedBuilder[] = [];

        const titles = ['Rank', 'User', 'Value'];

        pages.forEach((page, index) => {
            if (page.some(row => row.length === 3)) {
                titles.push('Percentage');
            }
            const fields = EmbedBuilderUtils.buildFields(page, titles);
            const eb = new EmbedBuilder()
                .setTitle(`Ranking for ${stat}`)
                .setFields(fields)
                .setFooter({
                    text: `Page ${index + 1}/${pages.length}`
                })
                .setTimestamp()
            ebs.push(eb);
            titles.splice(3, 1);
        });

        return ebs;
    }

    private mapStatsToTableRow(row: RankUser, index: number, stat: string, userStatKey: UserStatsKey): string[] {
        // If the stat is last_activity, format the value as a date
        if (stat === UserStatsFields.LastActivity) {
            return [
                `${index + 1}. ${row.guildNickname}`,
                row.isLive ?
                    'Now' :
                    row.formatStatAsDate(UserStatsFields.LastActivity) ?? 'Never'
            ];
        }

        // If the stat is a time-based stat, format the value as a duration
        if (stat !== UserStatsFields.TimeConnected && StatTimeRelated.includes(stat as UserStatsFields)) {
            const columns = [
                `${index + 1}. ${row.guildNickname}`,
                row.formatStatAsDuration(userStatKey) ?? ''
            ];

            // Add the percentage if it exists
            if (row.time_connected !== 0) {
                columns.push(row.formatStatAsPercentage(userStatKey) ?? '');
            }

            return columns;
        }

        // Otherwise, just retrieve the value
        let value: number | string = row[userStatKey];

        // If the stat is time_connected, format the value as a duration
        if (stat === UserStatsFields.TimeConnected) {
            value = row.formatStatAsDuration(userStatKey) ?? '';
        }

        // If the stat is a max-related stat, format the value as a duration
        if (stat !== UserStatsFields.MaxDailyStreak && StatMaxRelated.includes(stat as UserStatsFields)) {
            value = row.formatStatAsDuration(userStatKey) ?? '';
        }

        return [
            `${index + 1}. ${row.guildNickname}`,
            value.toString()
        ];
    }
}