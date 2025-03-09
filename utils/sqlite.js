import sqlite3 from "sqlite3";
import dotenv from "dotenv";

sqlite3.verbose();
dotenv.config();

export { connect, updateUserStats, incrementTotalJoins, getGuildStartTimestamps, getStartTimestamps, setStartTimestamp, getLiveDurationPerDay };

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
        updateUserDailyStats(db, guildId, userId, column, duration, now);
        updateLastActivity(db, guildId, userId, now);
    });
}

function updateUserDailyStats(db, guildId, userId, column, duration, now) {

    // Generic function to call to update the daily stats
    function update(db, guildId, userId, column, date, duration) {
        db.run(`
            INSERT INTO daily_stats (guild_id, user_id, day_timestamp, ${column})
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, user_id, day_timestamp) DO UPDATE SET ${column} = ${column} + ?
        `, [guildId, userId, date, duration, duration], function(err) {
            if (err) {
                console.error("Error running SQL query:", err.message);
            }
        });
    }

    // Get duration per day
    const days = getLiveDurationPerDay(duration, now);

    // Update the daily stats for each day
    days.list.forEach(day => {
        update(db, guildId, userId, column, day.date, day.duration);
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
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, user_id) DO UPDATE SET daily_streak = ?, last_activity = ?
        `, [guildId, userId, newStreak, now, newStreak, now], function(err) {
            if (err) {
                console.error("Error running SQL query:", err.message);
            }
        });
    });
}

function getGuildStartTimestamps(db, guildId, stat) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT start_connected, ${stat} FROM start_timestamps WHERE guild_id = ? AND start_connected IS NOT 0
        `, [guildId], (err, row) => {
            if (err) {
                console.error("Error running SQL query:", err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function getStartTimestamps(db, guildId, userId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * FROM start_timestamps WHERE guild_id = ? AND user_id = ? AND start_connected IS NOT 0
        `, [guildId, userId], (err, row) => {
            if (err) {
                console.error("Error running SQL query:", err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function setStartTimestamp(db, guildId, userId, column, value) {

    db.run(`
        INSERT INTO start_timestamps (guild_id, user_id, ${column})
        VALUES (?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET ${column} = ?
    `, [guildId, userId, value, value], function(err) {
        if (err) {
            console.error("setStartTimestamp: Error running SQL query:", err.message);
        }
    });
}

function getLiveDurationPerDay(duration, now, durationConnected = 0) {
    // durationConnected is the duration the user was connected to a voice channel
    // optional parameter, default value is 0, used to calculate percentages

    // return data structure
    const days = [];
    const daysMap = new Map();

    let remainingDuration = duration;
    let remainingDurationConnected = durationConnected;
    let dayLimit = now;
    let currentDay = new Date(now).setUTCHours(0, 0, 0, 0);

    // Split the duration into days
    while (remainingDuration > 0) {
        // Calculate the duration for the current day
        const dayDuration = Math.min(remainingDuration, dayLimit - currentDay);
        const dayDurationConnected = Math.min(remainingDurationConnected, dayLimit - currentDay);
        days.push({ date: currentDay, duration: dayDuration, durationConnected: dayDurationConnected });
        daysMap.set(currentDay, {duration: dayDuration, durationConnected: dayDurationConnected});
        console.log('currentDay', currentDay, 'dayDuration', dayDuration, 'dayDurationConnected', dayDurationConnected);

        // Update the remaining duration and the current day
        remainingDuration -= dayDuration;
        remainingDurationConnected -= dayDurationConnected;
        dayLimit = currentDay;
        currentDay = new Date(currentDay).setUTCHours(-24, 0, 0, 0);
    }

    // Split the connected duration into days
    // This is done in case the user was connected to a voice channel for a longer duration than the stat duration itself
    while (remainingDurationConnected > 0) {
        // Calculate the duration for the current day
        const dayDurationConnected = Math.min(remainingDurationConnected, dayLimit - currentDay);
        days.push({ date: currentDay, duration: 0, durationConnected: dayDurationConnected });
        daysMap.set(currentDay, {duration: 0, durationConnected: dayDurationConnected});
        console.log('currentDay', currentDay, 'dayDuration', 0, 'dayDurationConnected', dayDurationConnected);

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