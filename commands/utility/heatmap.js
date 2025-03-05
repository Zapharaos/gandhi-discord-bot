const { SlashCommandBuilder } = require('discord.js');
const { connect } = require('../../utils/sqlite');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('heatmap')
        .setDescription('Generates a calendar heatmap of time spent connected per day')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get heatmap for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('stat')
                .setDescription('The stat to show on the heatmap (default: time_connected)')
                .setRequired(false)
                .addChoices(
                    { name: 'Time Connected', value: 'time_connected' },
                    { name: 'Time Muted', value: 'time_muted' },
                    { name: 'Time Deafened', value: 'time_deafened' },
                    { name: 'Time Screen Sharing', value: 'time_screen_sharing' },
                    { name: 'Time Camera', value: 'time_camera' },
                )),
    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const stat = interaction.options.getString('stat') || 'time_connected';



        // Connect to the database
        const db = connect();

        db.all(`
            SELECT day_timestamp, ${stat} FROM daily_stats WHERE guild_id = ? AND user_id = ?
        `, [guildId, userId], async (err, rows) => {
            if (err) {
                console.error(err);
                return interaction.reply('An error occurred while fetching the data.');
            }

            if (!rows.length) {
                return interaction.reply('No data found for generating the heatmap.');
            }

            const tempReply = rows.map(row => `${new Date(row.day_timestamp).toLocaleDateString()}: ${row[stat]}`).join('\n');
            interaction.reply(tempReply);

            // Close the database connection
            db.close();
        });
    },
};