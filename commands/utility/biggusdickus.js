const { SlashCommandBuilder } = require('discord.js');
const {connect} = require("../../utils/sqlite");
module.exports = {
    data: new SlashCommandBuilder()
        .setName('streak')
        .setDescription('Returns the size of your big long streak')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to get juicy streak from')
                .setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getMember('target');
        const guildNickname = target.displayName;
        const guildId = interaction.guildId;
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

            let streak_message1 = '';
            let streak_message2 = '';
            const streak = row.daily_streak;
            function getPP(num){
                let ppsize='';
                for (let i = 0; i < num; i++){
                     ppsize += '=';
                }
                return ppsize;
            }

            switch (streak){
                default:
                    streak_message1 = 'Oh';
                    streak_message2 = 'hihi small pp 🤭';
                    break;
                case 5 <= streak >= 3:
                    streak_message1 = 'Hey';
                    streak_message2 = 'Nice pp 🥵';
                    break;
                case 10 <= streak > 5:
                    streak_message1 = 'Oh wow';
                    streak_message2 = '🥵 Sheesh nice pp 🍆💦';
                    break;
                case streak > 10:
                    streak_message1 = 'Oooooh Mmmmmabouttocuuum 😫';
                    streak_message2 = '🥵 Holy shit Big big PP 🍆💦🍑';
                    break;
            }

            const statsMessage = `
                ${streak_message1} ${guildNickname}
                ${streak_message2}
                \`8${getPP(streak)}D\`
            `.replace(/^\s+/gm, ''); // Remove leading spaces from each line

            interaction.reply(statsMessage);
        });

        // Close the database connection
        db.close();
    },
};