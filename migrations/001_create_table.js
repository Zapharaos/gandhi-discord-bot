// migrations/001_create_tables.js

export { up, down };

function up(db) {
    db.run(`
        CREATE TABLE IF NOT EXISTS servers (
            guild_id TEXT PRIMARY KEY,
            log_channel_id TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS user_stats (
            guild_id TEXT,
            user_id TEXT,
            time_connected INTEGER DEFAULT 0,
            time_muted INTEGER DEFAULT 0,
            time_deafened INTEGER DEFAULT 0,
            time_screen_sharing INTEGER DEFAULT 0,
            PRIMARY KEY (guild_id, user_id)
        )
    `);
}

function down(db) {
    db.run("DROP TABLE IF EXISTS servers");
    db.run("DROP TABLE IF EXISTS user_stats");
}