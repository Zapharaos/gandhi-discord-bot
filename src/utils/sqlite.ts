import sqlite3 from "sqlite3";
import dotenv from "dotenv";
import {UserStats} from "@models/database/user_stats";
import path from "path";

sqlite3.verbose();
dotenv.config();

export {
    connect,
    updateUserStats,
    incrementTotalJoins,
    setStartTimestamp,
    getLiveDurationPerDay
};
export {Database, LiveDurationPerDay, LiveDurationMapItem, LiveDurationMap, LiveDurationListItem}

type Database = sqlite3.Database;

/**
 * Connects to the SQLite database.
 *
 * @returns {Database} The connected SQLite database instance.
 */
function connect(): Database {
    return new sqlite3.Database(path.join(process.cwd(), process.env.DB_PATH ?? "data/gandhi-bot.db"));
}

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

type LiveDurationListItem = {
    date: number;
    duration: number;
    durationConnected: number;
}

type LiveDurationMapItem = {
    duration: number;
    durationConnected: number;
}

type LiveDurationMap = Map<number, LiveDurationMapItem>;

type LiveDurationPerDay = {
    list: LiveDurationListItem[];
    map: LiveDurationMap;
}

/**
 * Splits a duration into days and calculates the duration for each day.
 *
 * @param {number} duration - The total duration.
 * @param {number} now - The current timestamp.
 * @param {number} [durationConnected=0] - The duration the user was connected to a voice channel.
 * @returns {LiveDurationPerDay} An object containing a list and a map of the duration per day.
 */
function getLiveDurationPerDay(duration: number, now: number, durationConnected: number = 0): LiveDurationPerDay {
    // durationConnected is the duration the user was connected to a voice-channel channel
    // optional parameter, default value is 0, used to calculate percentages

    // return data structure
    const days: LiveDurationListItem[] = [];
    const daysMap: Map<number, LiveDurationMapItem> = new Map();

    let remainingDuration = duration;
    let remainingDurationConnected = durationConnected;
    let dayLimit = now;
    let currentDay = new Date(now).setUTCHours(0, 0, 0, 0);

    // Split the duration into days
    while (remainingDuration > 0) {
        // Calculate the duration for the current day
        const dayDuration = Math.min(remainingDuration, dayLimit - currentDay);
        const dayDurationConnected = Math.min(remainingDurationConnected, dayLimit - currentDay);
        days.push({date: currentDay, duration: dayDuration, durationConnected: dayDurationConnected});
        daysMap.set(currentDay, {duration: dayDuration, durationConnected: dayDurationConnected});

        // Update the remaining duration and the current day
        remainingDuration -= dayDuration;
        remainingDurationConnected -= dayDurationConnected;
        dayLimit = currentDay;
        currentDay = new Date(currentDay).setUTCHours(-24, 0, 0, 0);
    }

    // Split the connected duration into days
    // This is done in case the user was connected to a voice-channel channel for a longer duration than the stat duration itself
    while (remainingDurationConnected > 0) {
        // Calculate the duration for the current day
        const dayDurationConnected = Math.min(remainingDurationConnected, dayLimit - currentDay);
        days.push({date: currentDay, duration: 0, durationConnected: dayDurationConnected});
        daysMap.set(currentDay, {duration: 0, durationConnected: dayDurationConnected});

        // Update the remaining duration and the current day
        remainingDurationConnected -= dayDurationConnected;
        dayLimit = currentDay;
        currentDay = new Date(currentDay).setUTCHours(-24, 0, 0, 0);
    }

    return {
        list: days,
        map: daysMap
    }
}