const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

module.exports = { connect, updateUserStats };

function connect() {
    return new sqlite3.Database(process.env.DB_PATH);
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

