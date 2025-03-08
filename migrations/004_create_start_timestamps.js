// migrations/004_create_start_timestamps.js

export { up, down };

function up(db) {
    db.run(`
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
    `);
}

function down(db) {
    db.run("DROP TABLE IF EXISTS start_timestamps");
}
