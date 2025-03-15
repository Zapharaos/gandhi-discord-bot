// migrations/004_create_start_timestamps.js

export const name = '004_create_start_timestamps';

export const up = [
    `
        CREATE TABLE IF NOT EXISTS start_timestamps (
            guild_id TEXT,
            user_id TEXT,
            start_connected INTEGER DEFAULT 0,
            start_muted INTEGER DEFAULT 0,
            start_deafened INTEGER DEFAULT 0,
            start_screen_sharing INTEGER DEFAULT 0,
            start_camera INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    `
];

export const down = [
    'DROP TABLE IF EXISTS start_timestamps'
];
