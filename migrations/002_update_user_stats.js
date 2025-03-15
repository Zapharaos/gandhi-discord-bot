// migrations/002_update_user_stats.js

export const name = '002_update_user_stats'

export const up= [
    `ALTER TABLE user_stats ADD COLUMN time_camera INTEGER DEFAULT 0`,
    `ALTER TABLE user_stats ADD COLUMN last_activity INTEGER DEFAULT 0`,
    `ALTER TABLE user_stats ADD COLUMN daily_streak INTEGER DEFAULT 0`,
    `ALTER TABLE user_stats ADD COLUMN total_joins INTEGER DEFAULT 0`
]

export const down = [
    `
        CREATE TABLE user_stats_temp AS
        SELECT guild_id, user_id, time_connected, time_muted, time_deafened, time_screen_sharing
        FROM user_stats
    `,
    `DROP TABLE user_stats`,
    `
        CREATE TABLE user_stats
        (
            guild_id            TEXT,
            user_id             TEXT,
            time_connected      INTEGER DEFAULT 0,
            time_muted          INTEGER DEFAULT 0,
            time_deafened       INTEGER DEFAULT 0,
            time_screen_sharing INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    `,
    `
        INSERT INTO user_stats (guild_id, user_id, time_connected, time_muted, time_deafened, time_screen_sharing)
        SELECT guild_id, user_id, time_connected, time_muted, time_deafened, time_screen_sharing
        FROM user_stats_temp
    `,
    `DROP TABLE user_stats_temp`
]