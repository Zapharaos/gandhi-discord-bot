import {SlashCommandBuilder} from "discord.js";
import {getVoiceConnection} from "@discordjs/voice";

export const data = new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave the voice channel')

export async function execute(interaction) {
    const connection = getVoiceConnection(interaction.guildId);

    if (!connection) {
        await interaction.reply({ content: 'Not in a voice channel in this server!', ephemeral: true });

        return;
    }

    connection.destroy();

    // recordable.clear();

    await interaction.reply({ content: 'Left the channel!', ephemeral: true });
}