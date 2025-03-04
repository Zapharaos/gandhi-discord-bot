const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

module.exports = { connect, updateUserStats, incrementTotalJoins };

function connect() {
    return new sqlite3.Database(process.env.DB_PATH);
}

function updateUserStats(db, guildId, userId, column, duration, now) {
    db.run(`
        INSERT INTO user_stats (guild_id, user_id, ${column})
        VALUES (?, ?, ?)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET ${column} = ${column} + ?
    `, [guildId, userId, duration, duration], function(err) {
        if (err) {
            console.error("Error running SQL query:", err.message);
            return;
        }
        updateLastActivity(db, guildId, userId, now);
    });
}

function incrementTotalJoins(db, guildId, userId, now) {
    db.run(`
        INSERT INTO user_stats (guild_id, user_id, total_joins)
        VALUES (?, ?, 1)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET total_joins = total_joins + 1
    `, [guildId, userId], function(err) {
        if (err) {
            console.error("Error running SQL query:", err.message);
            return;
        }
        updateLastActivity(db, guildId, userId, now);
    });
}

function updateLastActivity(db, guildId, userId, now) {
    db.get(`
        SELECT last_activity, daily_streak FROM user_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], (err, row) => {
        if (err) {
            console.error("Error running SQL query:", err.message);
            return;
        }

        let newStreak = 1;
        if (row) {
            const lastActivityDate = new Date(row.last_activity).setHours(0, 0, 0, 0);
            const currentDate = new Date(now).setHours(0, 0, 0, 0);
            const oneDay = 24 * 60 * 60 * 1000;

            if (currentDate - lastActivityDate === oneDay) {
                newStreak = row.daily_streak + 1;
            } else if (currentDate - lastActivityDate > oneDay) {
                newStreak = 1;
            } else {
                newStreak = row.daily_streak;
            }
        }

        db.run(`
            INSERT INTO user_stats (guild_id, user_id, daily_streak, last_activity)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET daily_streak = ?, last_activity = ?
        `, [guildId, userId, newStreak, now, newStreak, now], function(err) {
            if (err) {
                console.error("Error running SQL query:", err.message);
            }
        });
    });
}