import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import {UserStats} from "@models/database/user_stats";

sqlite3.verbose();
dotenv.config();

export {
    updateUserStats,
    incrementTotalJoins,
    setStartTimestamp,
};

type Database = sqlite3.Database;

/**
 * Updates user statistics in the database.
 *
 * @param {Database} db - The SQLite database instance.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {string} stat - The statistic to update.
 * @param {number} duration - The duration to add to the statistic.
 * @param {number} now - The current timestamp.
 */
function updateUserStats(db: Database, guildId: string, userId: string, stat: string, duration: number, now: number) {
    db.run(`
        INSERT INTO user_stats (guild_id, user_id, ${stat})
        VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO
        UPDATE SET ${stat} = ${stat} + ?
    `, [guildId, userId, duration, duration], function (err: Error | null) {
        if (err) {
            console.error("updateUserStats: Error running SQL query:", err.message);
            return;
        }
        // Update the daily stats and last activity
        updateUserDailyStats(db, guildId, userId, stat, duration, now);
        updateLastActivity(db, guildId, userId, now);
    });
}

/**
 * Updates user daily statistics in the database.
 *
 * @param {Database} db - The SQLite database instance.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {string} stat - The statistic to update.
 * @param {number} duration - The duration to add to the statistic.
 * @param {number} now - The current timestamp.
 */
function updateUserDailyStats(db: Database, guildId: string, userId: string, stat: string, duration: number, now: number) {

    // Generic function to call to update the daily stats
    function update(db: Database, guildId: string, userId: string, stat: string, date: number, duration: number) {
        db.run(`
            INSERT INTO daily_stats (guild_id, user_id, day_timestamp, ${stat})
            VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id, day_timestamp) DO
            UPDATE SET ${stat} = ${stat} + ?
        `, [guildId, userId, date, duration, duration], function (err: Error | null) {
            if (err) {
                console.error("updateUserDailyStats: Error running SQL query:", err.message);
            }
        });
    }

    // Get duration per day
    const days = getLiveDurationPerDay(duration, now);

    // Update the daily stats for each day
    days.list.forEach(day => {
        update(db, guildId, userId, stat, day.date, day.duration);
    });
}

/**
 * Increments the total number of joins for a user in the database.
 *
 * @param {Database} db - The SQLite database instance.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {number} now - The current timestamp.
 */
function incrementTotalJoins(db: Database, guildId: string, userId: string, now: number) {
    db.run(`
        INSERT INTO user_stats (guild_id, user_id, total_joins)
        VALUES (?, ?, 1) ON CONFLICT(guild_id, user_id) DO
        UPDATE SET total_joins = total_joins + 1
    `, [guildId, userId], function (err: Error | null) {
        if (err) {
            console.error("incrementTotalJoins: Error running SQL query:", err.message);
            return;
        }
        updateLastActivity(db, guildId, userId, now);
    });
}

/**
 * Updates the last activity timestamp and daily streak for a user in the database.
 *
 * @param {Database} db - The SQLite database instance.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {number} now - The current timestamp.
 */
function updateLastActivity(db: Database, guildId: string, userId: string, now: number) {
    db.get(`
        SELECT last_activity, daily_streak
        FROM user_stats
        WHERE guild_id = ?
          AND user_id = ?
    `, [guildId, userId], (err: Error | null, row: UserStats) => {
        if (err) {
            console.error("updateLastActivity: Select: Error running SQL query:", err.message);
            return;
        }

        let newStreak = 1;
        if (row) {
            const lastActivityDate = new Date(row.last_activity).setUTCHours(0, 0, 0, 0);
            const currentDate = new Date(now).setUTCHours(0, 0, 0, 0);
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
            VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO
            UPDATE SET daily_streak = ?, last_activity = ?
        `, [guildId, userId, newStreak, now, newStreak, now], function (err: Error | null) {
            if (err) {
                console.error("updateLastActivity: INSERT: Error running SQL query:", err.message);
            }
        });
    });
}

/**
 * Sets the start timestamp for a user in a guild in the database.
 *
 * @param {Database} db - The SQLite database instance.
 * @param {string} guildId - The ID of the guild.
 * @param {string} userId - The ID of the user.
 * @param {string} column - The column to update.
 * @param {number} value - The value to set.
 */
function setStartTimestamp(db: Database, guildId: string, userId: string, column: string, value: number) {
    db.run(`
        INSERT INTO start_timestamps (guild_id, user_id, ${column})
        VALUES (?, ?, ?) ON CONFLICT(guild_id, user_id) DO
        UPDATE SET ${column} = ?
    `, [guildId, userId, value, value], function (err: Error | null) {
        if (err) {
            console.error("setStartTimestamp: Error running SQL query:", err.message);
        }
    });
}