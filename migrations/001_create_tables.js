// migrations/001_create_tables.js

export const name = '001_create_tables'

export const up = [
    `
        CREATE TABLE IF NOT EXISTS servers (
            guild_id TEXT PRIMARY KEY,
            log_channel_id TEXT
        )
    `,
    `
        CREATE TABLE IF NOT EXISTS user_stats (
            guild_id TEXT,
            user_id TEXT,
            time_connected INTEGER DEFAULT 0,
            time_muted INTEGER DEFAULT 0,
            time_deafened INTEGER DEFAULT 0,
            time_screen_sharing INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    `
]

export const down = [
    "DROP TABLE IF EXISTS servers",
    "DROP TABLE IF EXISTS user_stats"
]