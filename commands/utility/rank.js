const { SlashCommandBuilder } = require('discord.js');
const { connect } = require('../../utils/sqlite');
const { formatDuration } = require('../../utils/time');
const {getPercentageString} = require("../../utils/utils");

module.exports = {
    data: new SlashCommandBuilder()
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
                )),
    async execute(interaction) {
        const stat = interaction.options.getString('stat');
        const guildId = interaction.guild.id;

        // Connect to the database
        const db = connect();

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

            // Get the nickname of each user and format the rank message
            const rankMessage = await Promise.all(
                rows.map(async (row, index) => {
                    const guildNickname = await getGuildMemberNickname(interaction, interaction.guild, row.user_id);

                    // If the stat is a time-based stat, format the value as a duration
                    if (stat.includes('time') && stat !== 'time_connected') {
                        const value = formatDuration(row[stat]);
                        const percentage = getPercentageString(row[stat], row.time_connected);
                        return `\`${index + 1}. ${guildNickname}\` ${value} **(${percentage})**`;
                    }

                    // Otherwise, just format the value
                    let value = row[stat];

                    // If the stat is time_connected, format the value as a duration
                    if (stat === 'time_connected') {
                        value = formatDuration(row[stat]);
                    }

                    return `\`${index + 1}. ${guildNickname}\` ${value}`;
                })
            );

            interaction.reply(`**Ranking for ${stat.replace('_', ' ')}:**\n${rankMessage.join('\n')}`);
        });

        // Close the database connection
        db.close();
    },
};

async function getGuildMemberNickname(interaction, guild, id) {
    try {
        const member = await guild.members.fetch(id);
        return member.nickname || member.user.globalName;
    } catch (error) {
        console.error("Error fetching member:", error);
        return null;
    }
}