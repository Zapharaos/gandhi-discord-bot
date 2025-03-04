const sqlite3 = require("sqlite3").verbose();
const fs = require('node:fs');

module.exports = { setup, connect, updateUserStats };

function setup() {
    // Create db folder if not exists
    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data');
    }

    // Create SQLite database if not exists
    let db = connect();

    // Create tables if not exists
    db.run("CREATE TABLE IF NOT EXISTS servers (guild_id TEXT PRIMARY KEY, log_channel_id TEXT)");
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

function connect() {
    return new sqlite3.Database(process.env.DB_PATH);
}

function getUserStats(db, guildId, userId) {
    db.get(`
        SELECT * FROM user_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], (err, row) => {
        if (err) {
            console.error("Error fetching updated row:", err.message);
        } else {
            console.log("Updated row:", row, row.time_muted);
        }
    });
}

function updateUserStats(db, guildId, userId, column, duration) {
    db.run(`
        INSERT INTO user_stats (guild_id, user_id, ${column})
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET ${column} = ${column} + ?
    `, [guildId, userId, duration, duration], function(err) {
        if (err) {
            console.error("Error running SQL query:", err.message);
        }
    });
}

