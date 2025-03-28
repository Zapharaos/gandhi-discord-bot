import {Command, CommandDeferType} from "@commands/commands";
import {
    APIEmbedField,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Guild,
    PermissionsString,
} from "discord.js";
import {InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {Logger} from "@services/logger";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {UserStatsModel, StatKey as UserStatsKey, UserStatsFields, StatTimeRelated} from "@models/database/user_stats";
import {TimeUtils} from "@utils/time";
import {StartTimestampsModel, StatKey} from "@models/database/start_timestamps";
import {NumberUtils} from "@utils/number";
import {Table} from "embed-table";

type RankUser = UserStatsModel & { guildNickname: string };

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
                // TODO : on user quit or user ban -> remove user from guild related tables
                continue;
            }

            // Filter out those without a nickname
            rankUsers.push({
                ...row,
                guildNickname: guildNickname
            });
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

    private buildTable(columns: string[][]): Table {
        const titles = ['Rank', 'User', 'Value'];
        let rankLength = 0, userLength = 0, valueLength = 0;

        // Calculate the max length for each column
        columns.forEach(column => {
            rankLength = Math.max(rankLength, column[0].length);
            userLength = Math.max(userLength, column[1].length);

            // If the column has a percentage, calculate the max length for the value
            if (column.length > 3) {
                valueLength = Math.max(valueLength, column[2].length);
            }
        });

        // Build table indexes
        rankLength = Math.max(rankLength, titles[0].length) + 1;
        userLength = Math.max(userLength, titles[1].length) + 1;
        const indexes = [ 0, rankLength, userLength + rankLength ];

        // Process more if percentage exists
        if (valueLength !== 0) {
            titles.push('Percentage');
            valueLength = Math.max(valueLength, titles[2].length) + 1;
            indexes.push(valueLength + userLength + rankLength);
        }

        console.log(columns);
        console.log(rankLength, userLength, valueLength);
        console.log(indexes);

        const table = new Table({
            titles: titles,
            titleIndexes: indexes,
            columnIndexes: indexes,
            whiteSpace: true,
            start: '`',
            end: '`',
        });

        columns.forEach(column => {
            table.addRow(column);
            column[0] = column[0].padEnd(rankLength, ' ');
            column[1] = column[1].padEnd(userLength, ' ');
            console.log(`${column[0]}${column[1]}${column[2]}`)
            /*column[0] = column[0].padEnd(rankLength, ' ');
            column[1] = column[1].padEnd(userLength, ' ');
            console.log(column)

            column[0] = column[0].padEnd(indexes[1], ' ');
            column[1] = column[1].padEnd(indexes[2], ' ');
            console.log(column)

            table.addRow([
                // `${column[0].padEnd(rankLength, '-')}`,
                // `${column[1].padEnd(userLength, '-')}`,
                `${column[0].padEnd(rankLength, ' ')}`,
                `${column[1].padEnd(userLength, ' ')}`,
                column[2]
            ]);*/
        });

        console.log(table);

        return table;
    }

    private buildEmbedBuilders(pages: string[][][], stat: string): EmbedBuilder[] {
        const ebs: EmbedBuilder[] = [];

        pages.forEach((page, index) => {
            const table = this.buildTable(page);
            const eb = new EmbedBuilder()
                .setTitle(`Ranking for ${stat}`)
                .setFields(table.toField())
                .setFooter({
                    text: `Page ${index + 1}/${pages.length}`
                })
                .setTimestamp()
            ebs.push(eb);
        });

        return ebs;
    }

    private mapStatsToTableRow(row: RankUser, index: number, stat: string, userStatKey: UserStatsKey): string[] {
        // If the stat is last_activity, format the value as a date
        if (stat === UserStatsFields.LastActivity) {
            return [
                `${index + 1}`,
                row.guildNickname,
                TimeUtils.formatDate(new Date(row.last_activity))
            ];
        }

        // If the stat is a time-based stat, format the value as a duration
        if (stat !== UserStatsFields.TimeConnected && StatTimeRelated.includes(stat as UserStatsFields)) {
            const columns = [
                `${index + 1}`,
                row.guildNickname,
                TimeUtils.formatDuration(row[userStatKey])
            ];

            // Add the percentage if it exists
            if (row.time_connected !== 0) {
                columns.push(NumberUtils.getPercentageString(row[userStatKey], row.time_connected));
            }

            return columns;
        }

        // Otherwise, just retrieve the value
        let value: number | string = row[userStatKey];

        // If the stat is time_connected, format the value as a duration
        if (stat === UserStatsFields.TimeConnected) {
            value = TimeUtils.formatDuration(row[stat]);
        }

        return [
            `${index + 1}`,
            row.guildNickname,
            value.toString()
        ];
    }
}