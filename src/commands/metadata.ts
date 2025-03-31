import {
    ApplicationCommandType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import {UserStatsFields} from "@models/database/user_stats";

// Type : https://discord-api-types.dev/api/discord-api-types-v10/enum/ApplicationCommandOptionType

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
                description: 'The user to get juicy streak from (default: yourself)',
                required: false,
            },
        ],
    },
    RANK: {
        type: ApplicationCommandType.ChatInput,
        name: 'rank',
        description: 'Returns the server ranking for a specific stat',
        dm_permission: true,
        options: [
            {
                type: 3,
                name: 'stat',
                description: 'The stat to rank by (default: Time Connected)',
                required: false,
                choices: [
                    { name: 'Time Connected', value: UserStatsFields.TimeConnected },
                    { name: 'Time Muted', value: UserStatsFields.TimeMuted },
                    { name: 'Time Deafened', value: UserStatsFields.TimeDeafened },
                    { name: 'Time Screen Sharing', value: UserStatsFields.TimeScreenSharing },
                    { name: 'Time Camera', value: UserStatsFields.TimeCamera },
                    { name: 'Last Activity', value: UserStatsFields.LastActivity },
                    { name: 'Daily Streak', value: UserStatsFields.DailyStreak },
                    { name: 'Max Connected', value: UserStatsFields.MaxConnected },
                    { name: 'Max Muted', value: UserStatsFields.MaxMuted },
                    { name: 'Max Deafened', value: UserStatsFields.MaxDeafened },
                    { name: 'Max Screen Sharing', value: UserStatsFields.MaxScreenSharing },
                    { name: 'Max Camera', value: UserStatsFields.MaxCamera },
                    { name: 'Max Daily Streak', value: UserStatsFields.MaxDailyStreak },
                    { name: 'Total Joins', value: UserStatsFields.TotalJoins },
                ],
            },
        ],
    },
    STATS: {
        type: ApplicationCommandType.ChatInput,
        name: 'stats',
        description: 'Returns the stats for a specific user',
        dm_permission: true,
        options: [
            {
                type: 6,
                name: 'target',
                description: 'The user to get stats for (default: yourself)',
                required: false,
            },
        ],
    },
    HEATMAP: {
        type: ApplicationCommandType.ChatInput,
        name: 'heatmap',
        description: 'Returns the yearly calendar heatmap',
        dm_permission: true,
        options: [
            {
                type: 6,
                name: 'target',
                description: 'The user to get heatmap for (default: yourself)',
                required: false,
            },
            {
                type: 5,
                name: 'target-all',
                description: 'Aggregate all guild users into one heatmap',
                required: false,
            },
            {
                type: 3,
                name: 'stat',
                description: 'The stat to heatmap by (default: Time Connected)',
                required: false,
            },
            {
                type: 3,
                name: 'format',
                description: 'The reply format (default: PNG)',
                required: false,
                choices: [
                    { name: 'PNG', value: 'png' },
                    { name: 'HTML', value: 'html' },
                ],
            }
        ],
    }
};