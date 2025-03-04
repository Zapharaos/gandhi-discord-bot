// migrations/002_update_user_stats.js
module.exports = {
    up: function(db) {
        db.run(`ALTER TABLE user_stats ADD COLUMN last_activity INTEGER DEFAULT 0`);
        db.run(`ALTER TABLE user_stats ADD COLUMN daily_streak INTEGER DEFAULT 0`);
        db.run(`ALTER TABLE user_stats ADD COLUMN total_joins INTEGER DEFAULT 0`);
    },
    down: function(db) {
        db.run(`
            CREATE TABLE user_stats_temp AS SELECT guild_id, user_id, time_connected, time_muted, time_deafened, time_screen_sharing
                                            FROM user_stats
        `);
        db.run("DROP TABLE user_stats");
        db.run(`
            CREATE TABLE user_stats (
                                        guild_id TEXT,
                                        user_id TEXT,
                                        time_connected INTEGER DEFAULT 0,
                                        time_muted INTEGER DEFAULT 0,
                                        time_deafened INTEGER DEFAULT 0,
                                        time_screen_sharing INTEGER DEFAULT 0,
                                        PRIMARY KEY (guild_id, user_id)
            )
        `);
        db.run(`
            INSERT INTO user_stats (guild_id, user_id, time_connected, time_muted, time_deafened, time_screen_sharing)
            SELECT guild_id, user_id, time_connected, time_muted, time_deafened, time_screen_sharing
            FROM user_stats_temp
        `);
        db.run("DROP TABLE user_stats_temp");
    }
};