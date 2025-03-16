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
    CLASH: {
        type: ApplicationCommandType.ChatInput,
        name: 'clash',
        description: 'Throws a diss at a user',
        dm_permission: true,
        options: [
            {
                type: 6,
                name: 'target',
                description: 'The user to diss',
                required: true,
            },
            {
                type: 3,
                name: 'game',
                description: 'The game for which to generate a diss (CS or LoL)',
                choices: [
                    { name: 'LoL', value: 'lol' },
                    { name: 'CSGO', value: 'csgo' },
                ],
                required: false,
            },
        ],
    },
    BIGGUSDICKUS: {
        type: ApplicationCommandType.ChatInput,
        name: 'biggusdickus',
        description: 'Returns the size of your big long streak',
        dm_permission: true,
        options: [
            {
                type: 6,
                name: 'target',
                description: 'The user to get juicy streak from',
                required: false,
            },
        ],
    }
};