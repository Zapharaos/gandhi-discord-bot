import { SlashCommandBuilder } from 'discord.js';
import { connect } from '../../utils/sqlite.js';
import { formatDuration, formatDate } from '../../utils/time.js';
import { getPercentageString } from '../../utils/utils.js';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Returns the stats for a specific user')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to get stats for')
            .setRequired(true)
    );

export async function execute(interaction) {
    const target = interaction.options.getMember('target');
    const guildNickname = target.nickname || target.user.displayName;
    const guildId = interaction.guild.id;
    const userId = target.id;

    // Connect to the database
    const db = connect();

    db.get(`
        SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], (err, row) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching the stats.');
        }

        if (!row) {
            return interaction.reply(`No stats found for user ${guildNickname}.`);
        }

        const statsMessage = `
            **Stats for ${guildNickname}**
            \`Time Connected\` ${formatDuration(row.time_connected)}
            \`Time Muted\` ${formatDuration(row.time_muted)} **(${getPercentageString(row.time_muted, row.time_connected)})**
            \`Time Deafened\` ${formatDuration(row.time_deafened)} **(${getPercentageString(row.time_deafened, row.time_connected)})**
            \`Time Screen Sharing\` ${formatDuration(row.time_screen_sharing)} **(${getPercentageString(row.time_screen_sharing, row.time_connected)})**
            \`Time Camera\` ${formatDuration(row.time_camera)} **(${getPercentageString(row.time_camera, row.time_connected)})**
            \`Last Activity\` ${formatDate(new Date(row.last_activity))}
            \`Daily Streak\` ${row.daily_streak}
            \`Total Joins\` ${row.total_joins}
        `.replace(/^\s+/gm, ''); // Remove leading spaces from each line

        interaction.reply(statsMessage);
    });

    // Close the database connection
    db.close();
}