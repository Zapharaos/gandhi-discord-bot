// migrations/003_create_daily_stats.js
module.exports = {
    up: function(db) {
        db.run(`
            CREATE TABLE IF NOT EXISTS daily_stats (
                guild_id TEXT,
                user_id TEXT,
                day_timestamp INTEGER,
                time_connected INTEGER DEFAULT 0,
                time_muted INTEGER DEFAULT 0,
                time_deafened INTEGER DEFAULT 0,
                time_screen_sharing INTEGER DEFAULT 0,
                time_camera INTEGER DEFAULT 0,
                PRIMARY KEY (guild_id, user_id, day_timestamp)
            )
        `);
    },
    down: function(db) {
        db.run("DROP TABLE IF EXISTS daily_stats");
    }
};