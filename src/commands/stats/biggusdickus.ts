import {ChatInputCommandInteraction, GuildMember, SlashCommandBuilder} from 'discord.js';
import {connect, getStartTimestamps} from '@utils/sqlite';
import {UserStats} from "@models/user_stats";
import {getGuildId, getInteractionUser, InteractionUser} from "@utils/interaction";

export const data = new SlashCommandBuilder()
    .setName('biggusdickus')
    .setDescription('Returns the size of your big long streak')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to get juicy streak from')
    );

export async function execute(interaction: ChatInputCommandInteraction) {

    const guildId = getGuildId(interaction);
    const interactionUser: InteractionUser = getInteractionUser(interaction);

    // Connect to the database
    const db = connect();

    db.get(`
        SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, interactionUser.id], async (err: Error | null, row: UserStats) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching the stats.');
        }

        if (!row) {
            return interaction.reply(`No stats found for user ${interactionUser.name}.`);
        }

        let streak_message1 = '';
        let streak_message2 = '';
        let streak = row.daily_streak;
        function getPP(num: number){
            let ppsize='';
            for (let i = 0; i < num; i++){
                ppsize += '=';
            }
            return ppsize;
        }

        // Check if the user has any live start timestamps
        const startTimestamps = await getStartTimestamps(db, guildId, interactionUser.id);
        if (startTimestamps && startTimestamps.start_connected !== 0) {
            const todayDate = new Date().setUTCHours(0, 0, 0, 0);
            const lastActivityDate = new Date(row.last_activity).setUTCHours(0, 0, 0, 0);
            // Calculate the difference in days between the last activity and today = live streak
            const daysDifference = Math.floor((todayDate - lastActivityDate) / (1000 * 60 * 60 * 24));
            streak += daysDifference;
        }

        if (3 <= streak && streak < 5) {
            streak_message1 = 'Hey';
            streak_message2 = 'Nice pp 🥵';
        } else if (5 < streak && streak < 10) {
            streak_message1 = 'Oh wow';
            streak_message2 = '🥵 Sheesh nice pp 🍆💦';
        } else if (10 <= streak) {
            streak_message1 = 'Oooooh Mmmmmabouttocuuum 😫';
            streak_message2 = '🥵 Holy shit Big big PP 🍆💦🍑';
        } else {
            streak_message1 = 'Oh';
            streak_message2 = 'hihi small pp 🤭';
        }

        const statsMessage = `
            ${streak_message1} ${interactionUser.name}
            ${streak_message2}
            \`8${getPP(streak)}D\`
        `.replace(/^\s+/gm, ''); // Remove leading spaces from each line

        interaction.reply(statsMessage);
    });

    // Close the database connection
    db.close();
}