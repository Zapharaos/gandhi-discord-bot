import {ChatInputCommandInteraction, Guild, SlashCommandBuilder} from 'discord.js';
import {connect, getStartTimestamps} from '@utils/sqlite';
import {formatDuration, getDuration} from '@utils/time';
import { getPercentageString } from '@utils/utils';
import {fetchGuildMemberNickname, getGuildId} from "@utils/interaction";
import {getUserStatsStatKey, UserStats} from "@models/user_stats";
import {getStartTsStatKey} from "@models/start_timestamps";

type RankUser = UserStats & { guildNickname?: string };

export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Returns the ranking for a specific stat')
    .addStringOption(option =>
        option.setName('stat')
            .setDescription('The stat to rank by')
            .addChoices(
                { name: 'Time Connected', value: 'time_connected' },
                { name: 'Time Muted', value: 'time_muted' },
                { name: 'Time Deafened', value: 'time_deafened' },
                { name: 'Time Screen Sharing', value: 'time_screen_sharing' },
                { name: 'Time Camera', value: 'time_camera' },
                { name: 'Daily Streak', value: 'daily_streak' },
                { name: 'Total Joins', value: 'total_joins' }
            )
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        return interaction.reply('This command can only be used in a server.');
    }

    const stat: string = interaction.options.getString('stat') || 'time_connected';
    const guildId = getGuildId(interaction);

    // Connect to the database
    const db = connect();

    await interaction.deferReply();

    await new Promise((resolve, reject) => {
        db.all(`
            SELECT user_id, ${stat}, time_connected FROM user_stats WHERE guild_id = ? ORDER BY ${stat} DESC
        `, [guildId], async (err: Error | null, rows: UserStats[]) => {
            if (err) {
                console.error(err);
                return interaction.editReply('An error occurred while fetching the ranking.');
            }

            if (!rows.length) {
                return interaction.editReply(`No data found for the stat ${stat}.`);
            }

            console.log("Calculating ranks for stat:", stat);

            const userStatKey = getUserStatsStatKey(stat);
            const startStatKey = getStartTsStatKey(stat.replace('time_', 'start_'));

            // Add live duration to the time-based stats
            await Promise.all(
                rows.map(async (row, index) => {
                    // Check if there is a start timestamp for the stat
                    const startTimestamps = await getStartTimestamps(db, guildId, row.user_id);
                    if (startTimestamps && startTimestamps[startStatKey] !== 0) {
                        const now = Date.now();
                        const liveDuration = getDuration(startTimestamps[startStatKey], now);
                        row[userStatKey] += liveDuration;
                        if (stat !== 'time_connected') {
                            const liveDurationConnected = getDuration(startTimestamps.start_connected, now);
                            row.time_connected += liveDurationConnected;
                        }
                    }
                })
            );

            // Sort the updated rows by the stat in descending order
            rows.sort((a, b) => b[userStatKey] - a[userStatKey]);

            const rankUsers: RankUser[] = [];

            // Get the nickname of each user
            for (const row of rows) {
                const index = rows.indexOf(row);
                const guildNickname = await fetchGuildMemberNickname(interaction.guild as Guild, row.user_id);

                // If the user is not in the guild, remove them from the ranking
                if (!guildNickname) {
                    console.log(`No nickname found for user ${row.user_id}`, index);
                    // TODO : on user quit or user ban -> remove user from guild related tables
                    continue;
                }

                // Filter out those without a nickname
                rankUsers.push({
                    ...row,
                    guildNickname: guildNickname
                });
            }

            // Format the rank message
            const rankMessage = await Promise.all(
                rankUsers.map(async (row, index) => {

                    // If the stat is a time-based stat, format the value as a duration
                    if (stat.includes('time') && stat !== 'time_connected') {
                        const value = formatDuration(row[userStatKey]);
                        const percentage = getPercentageString(row[userStatKey], row.time_connected);
                        return `\`${index + 1}. ${row.guildNickname}\` ${value} **(${percentage})**`;
                    }

                    // Otherwise, just format the value
                    let value: number | string = row[userStatKey];

                    // If the stat is time_connected, format the value as a duration
                    if (stat === 'time_connected') {
                        value = formatDuration(row[stat]);
                    }

                    return `\`${index + 1}. ${row.guildNickname}\` ${value}`;
                })
            );

            await interaction.editReply(`**Ranking for ${stat.replace('_', ' ')}:**\n${rankMessage.join('\n')}`);
        })
    });

    // Close the database connection
    db.close();
}