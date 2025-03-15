import {
    ApplicationCommandType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

// TODO : const file with labels

export const CommandMetadata: {
    [command: string]: RESTPostAPIChatInputApplicationCommandsJSONBody;
} = {
    PING: {
        type: ApplicationCommandType.ChatInput,
        name: 'ping',
        description: 'Replies with Pong!',
        dm_permission: true,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
        ]).toString(),
        options: [],
    },
    SET_LOG_CHANNEL: {
        type: ApplicationCommandType.ChatInput,
        name: 'setlogchannel',
        description: 'Set the log channel for voice-channel activity tracking',
        dm_permission: false,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.ManageChannels,
        ]).toString(),
        options: [
            {
                type: 7,
                name: 'channel',
                description: 'Select a text channel for logs',
                required: true,
            },
        ],
    },
};