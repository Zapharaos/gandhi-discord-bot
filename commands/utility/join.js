import { SlashCommandBuilder } from 'discord.js';
import {entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus} from '@discordjs/voice';

// TODO : add command: enable recording at server level + each user must
// TODO : add command: user must manually allow recording for security reasons

export const data = new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join the current voice channel')

export async function execute(interaction) {

    await interaction.deferReply();

    let connection = getVoiceConnection(interaction.guildId);

    if (!connection) {
        if (!interaction.member?.voice.channel) {
            await interaction.followUp('Join a voice channel and then try that again!');
            return;
        }

        connection = joinVoiceChannel({
            adapterCreator: interaction.guild.voiceAdapterCreator,
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            selfDeaf: false,
            selfMute: true,
        });
    }

    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        const receiver = connection.receiver;

        receiver.speaking.on('start', async (userId) => {
            /*if (recordable.has(userId)) {
                const user = await interaction.client.users.fetch(userId);

                await createListeningStream(receiver, user);
            }*/
            const user = await interaction.client.users.fetch(userId);
            console.log(`User ${user.displayName} started speaking`);
        });
    } catch (error) {
        console.warn(error);

        await interaction.followUp('Failed to join voice channel within 20 seconds, please try again later!');
    }

    await interaction.followUp('Ready!');
}