import {AttachmentBuilder, SlashCommandBuilder} from 'discord.js';
import {connect, getStartTimestamps} from '../../utils/sqlite.js';
import { formatDuration } from '../../utils/time.js';
import { getPercentageString } from '../../utils/utils.js';

export const data = new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Returns the ranking for a specific stat')
    .addStringOption(option =>
        option.setName('stat')
            .setDescription('The stat to rank by')
            .setRequired(true)
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

export async function execute(interaction) {
    const stat = interaction.options.getString('stat');
    const guildId = interaction.guild.id;

    // Connect to the database
    const db = connect();

    await interaction.deferReply();

    await new Promise((resolve, reject) => {
        db.all(`
            SELECT user_id, ${stat}, time_connected FROM user_stats WHERE guild_id = ? ORDER BY ${stat} DESC
        `, [guildId], async (err, rows) => {
            if (err) {
                console.error(err);
                return interaction.reply('An error occurred while fetching the ranking.');
            }

            if (!rows.length) {
                return interaction.reply(`No data found for the stat ${stat}.`);
            }

            console.log("Calculating ranks for stat:", stat);

            // Add live duration to the time-based stats
            await Promise.all(
                rows.map(async (row, index) => {
                    // Check if there is a start timestamp for the stat
                    const startTimestamps = await getStartTimestamps(db, guildId, row.user_id);
                    const startStat = stat.replace('time_', 'start_');
                    if (startTimestamps && startTimestamps[startStat] !== 0) {
                        const liveDuration = Date.now() - startTimestamps[startStat];
                        row[stat] += liveDuration;
                    }
                })
            );

            // Sort the updated rows by the stat in descending order
            rows.sort((a, b) => b[stat] - a[stat]);

            // Get the nickname of each user
            for (const row of rows) {
                const index = rows.indexOf(row);
                const guildNickname = await getGuildMemberNickname(interaction, interaction.guild, row.user_id);

                // If the user is not in the guild, remove them from the ranking
                if (!guildNickname) {
                    console.log(`No nickname found for user ${row.user_id}`, index);
                    // TODO : on user quit or user ban -> remove user from guild related tables
                    continue;
                }

                row.guildNickname = guildNickname;
            }

            // Remove rows with no nickname => user not in the guild
            rows = rows.filter(row => row.guildNickname !== undefined);

            // Format the rank message
            const rankMessage = await Promise.all(
                rows.map(async (row, index) => {

                    // If the stat is a time-based stat, format the value as a duration
                    if (stat.includes('time') && stat !== 'time_connected') {
                        const value = formatDuration(row[stat]);
                        const percentage = getPercentageString(row[stat], row.time_connected);
                        return `\`${index + 1}. ${row.guildNickname}\` ${value} **(${percentage})**`;
                    }

                    // Otherwise, just format the value
                    let value = row[stat];

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

async function getGuildMemberNickname(interaction, guild, id) {
    try {
        const member = await guild.members.fetch(id);
        return member.displayName || member.nickname || member.user.globalName;
    } catch (error) {
        console.error(`Failed to fetch member with id ${id}:`, error);
        return null;
    }
}