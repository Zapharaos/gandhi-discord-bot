import { SlashCommandBuilder } from 'discord.js';
import {connect, getStartTimestamps} from '../../utils/sqlite.js';
import { formatDuration, formatDate } from '../../utils/time.js';
import { getPercentageString } from '../../utils/utils.js';

export const data = new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Returns the stats for a specific user')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to get stats for')
    );

export async function execute(interaction) {
    const guildId = interaction.guild.id;

    const target = interaction.options.getMember('target');
    const userId = target?.user.id ?? interaction.user.id;
    const userName = target?.displayName ?? interaction.member.displayName;

    // Connect to the database
    const db = connect();

    db.get(`
        SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], async (err, row) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching the stats.');
        }

        if (!row) {
            return interaction.reply(`No stats found for user ${userName}.`);
        }

        // Add live stats to the row
        const now = Date.now();
        const startTimestamps = await getStartTimestamps(db, userId);
        if (startTimestamps.start_connected !== 0) {
            row.time_connected += now - startTimestamps.start_connected;
        }
        if (startTimestamps.start_muted !== 0) {
            row.time_muted += now - startTimestamps.start_muted;
        }
        if (startTimestamps.start_deafened !== 0) {
            row.time_deafened += now - startTimestamps.start_deafened;
        }
        if (startTimestamps.start_screen_sharing !== 0) {
            row.time_screen_sharing += now - startTimestamps.start_screen_sharing;
        }
        if (startTimestamps.start_camera !== 0) {
            row.time_camera += now - startTimestamps.start_camera;
        }

        const statsMessage = `
            **Stats for ${userName}**
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