import {
    ApplicationCommandType,
    PermissionFlagsBits,
    PermissionsBitField,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import {UserStatsFields} from "@gandhi/core/models/database/user_stats";

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
    SERVER_SETTINGS: {
        type: ApplicationCommandType.ChatInput,
        name: 'serversettings',
        description: 'Configure server settings for stats tracking and event logs',
        dm_permission: false,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.ManageChannels,
        ]).toString(),
        options: [
            {
                type: 3,
                name: 'stats',
                description: 'Enable or disable stats tracking',
                required: false,
                choices: [
                    { name: 'ON', value: 'on' },
                    { name: 'OFF', value: 'off' },
                ],
            },
            {
                type: 3,
                name: 'logs',
                description: 'Enable or disable event logs',
                required: false,
                choices: [
                    { name: 'ON', value: 'on' },
                    { name: 'OFF', value: 'off' },
                ],
            },
            {
                type: 7,
                name: 'logchannel',
                description: 'Select a text channel for logs',
                required: false,
            },
        ],
    },
    USER_SETTINGS: {
        type: ApplicationCommandType.ChatInput,
        name: 'usersettings',
        description: 'Configure your personal settings for stats tracking and event logs',
        dm_permission: false,
        options: [
            {
                type: 3,
                name: 'stats',
                description: 'Enable or disable your stats tracking',
                required: false,
                choices: [
                    { name: 'ON', value: 'on' },
                    { name: 'OFF', value: 'off' },
                ],
            },
            {
                type: 3,
                name: 'logs',
                description: 'Enable or disable your event logs',
                required: false,
                choices: [
                    { name: 'ON', value: 'on' },
                    { name: 'OFF', value: 'off' },
                ],
            },
            {
                type: 3,
                name: 'private',
                description: 'Enable or disable private mode (hide from others)',
                required: false,
                choices: [
                    { name: 'ON', value: 'on' },
                    { name: 'OFF', value: 'off' },
                ],
            },
        ],
    },
    MY_SERVERS: {
        type: ApplicationCommandType.ChatInput,
        name: 'myservers',
        description: 'List every server where we hold stats data linked to you',
        dm_permission: true,
        options: [],
    },
    RESET_STATS: {
        type: ApplicationCommandType.ChatInput,
        name: 'reset-stats',
        description: 'Reset your stats to zero (keeps settings and daily history)',
        dm_permission: true,
        options: [
            {
                type: 3,
                name: 'scope',
                description: 'Which servers to reset (default: this server)',
                required: false,
                choices: [
                    { name: 'this server', value: 'server' },
                    { name: 'all servers', value: 'global' },
                ],
            },
        ],
    },
    DELETE_DATA: {
        type: ApplicationCommandType.ChatInput,
        name: 'delete-data',
        description: 'Permanently delete all data we hold about you (stats, history, settings)',
        dm_permission: true,
        options: [
            {
                type: 3,
                name: 'scope',
                description: 'Which servers to delete data from (default: this server)',
                required: false,
                choices: [
                    { name: 'this server', value: 'server' },
                    { name: 'all servers', value: 'global' },
                ],
            },
        ],
    },
    EXPORT: {
        type: ApplicationCommandType.ChatInput,
        name: 'export',
        description: 'Export a copy of all data we hold about you as a JSON file',
        dm_permission: true,
        options: [
            {
                type: 3,
                name: 'scope',
                description: 'Which servers to export data from (default: this server)',
                required: false,
                choices: [
                    { name: 'this server', value: 'server' },
                    { name: 'all servers', value: 'global' },
                ],
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
                    { name: 'Count Connected', value: UserStatsFields.CountConnected },
                    { name: 'Count Switch', value: UserStatsFields.CountSwitch },
                    { name: 'Count Muted', value: UserStatsFields.CountMuted },
                    { name: 'Count Deafened', value: UserStatsFields.CountDeafened },
                    { name: 'Count Screen Sharing', value: UserStatsFields.CountScreenSharing },
                    { name: 'Count Camera', value: UserStatsFields.CountCamera },
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
    },
    LIST_INACTIVES: {
        type: ApplicationCommandType.ChatInput,
        name: 'list-inactives',
        description: 'Lists inactive users in the server',
        dm_permission: false,
        default_member_permissions: PermissionsBitField.resolve([
            PermissionFlagsBits.Administrator,
            PermissionFlagsBits.ManageChannels,
        ]).toString(),
        options: [
            {
                type: 4,
                name: 'days',
                description: 'Number of days since last activity to be considered inactive (default: 100)',
                required: false,
            },
        ],
    },
    TAKETIME: {
        type: ApplicationCommandType.ChatInput,
        name: 'taketime',
        description: 'Deal secret cards to 2-4 users from two decks (white/black, 1-12)',
        dm_permission: false,
        options: [
            {
                type: 6, // USER
                name: 'user1',
                description: 'First user',
                required: true,
            },
            {
                type: 6, // USER
                name: 'user2',
                description: 'Second user',
                required: true,
            },
            {
                type: 6, // USER
                name: 'user3',
                description: 'Third user',
                required: false,
            },
            {
                type: 6, // USER
                name: 'user4',
                description: 'Fourth user',
                required: false,
            },
        ],
    },
};