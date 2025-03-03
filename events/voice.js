const { Events, ChannelType } = require('discord.js');
const sqlite3 = require("sqlite3").verbose();

// Maps to store user activity timestamps
const voiceJoinTimes = new Map();
const muteTimes = new Map();
const deafTimes = new Map();

// Connect to SQLite database
const db = new sqlite3.Database(process.env.DB_PATH);

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(weeks / 4.345);
    const years = Math.floor(months / 12);

    if (years > 0) return `${years}y:${months % 12}m:${weeks % 4.345}w:${days % 7}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (months > 0) return `${months}m:${weeks % 4.345}w:${days % 7}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (weeks > 0) return `${weeks}w:${days % 7}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (days > 0) return `${days}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (hours > 0) return `${hours}h:${minutes % 60}m:${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m:${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    execute(oldState, newState) {
        const user = newState.member.user;
        const guild = newState.guild;
        const guildNickname = newState.member.nickname || user.displayName; // The user's nickname in the guild (fallback to username)

        // Get log channel ID from database
        db.get("SELECT log_channel_id FROM servers WHERE guild_id = ?", [guild.id], (err, row) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!row) return; // No log channel set for this server

            const logChannelId = row.log_channel_id;
            const logChannel = guild.channels.cache.get(logChannelId);
            if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

            let message = null;
            const now = Date.now();

            // Track join time
            if (!oldState.channelId && newState.channelId) {
                voiceJoinTimes.set(user.id, now);
                message = `➡️ **${guildNickname}** joined **${newState.channel.name}**`;
            }
            // Calculate time spent in channel when leaving
            else if (oldState.channelId && !newState.channelId) {
                if (voiceJoinTimes.has(user.id)) {
                    const joinTime = voiceJoinTimes.get(user.id);
                    const duration = formatDuration(now - joinTime);
                    message = `⬅️ **${guildNickname}** left **${oldState.channel.name}** after **${duration} seconds**`;
                    voiceJoinTimes.delete(user.id);
                } else {
                    message = `⬅️ **${guildNickname}** left **${oldState.channel.name}**`;
                }
            }
            // User switches voice channels
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                if (voiceJoinTimes.has(user.id)) {
                    const joinTime = voiceJoinTimes.get(user.id);
                    const duration = formatDuration(now - joinTime);
                    message = `🔄 **${guildNickname}** switched from **${oldState.channel.name}** to **${newState.channel.name}** after **${duration}**`;
                    voiceJoinTimes.set(user.id, now); // Reset join time
                } else {
                    message = `🔄 **${guildNickname}** switched from **${oldState.channel.name}** to **${newState.channel.name}**`;
                }
            }

            // Track mute time
            if (!oldState.selfMute && newState.selfMute) {
                muteTimes.set(user.id, now);
                message = `🤐️ **${guildNickname}** muted their microphone`;
            } else if (oldState.selfMute && !newState.selfMute) {
                if (muteTimes.has(user.id)) {
                    const muteTime = muteTimes.get(user.id);
                    const muteDuration = formatDuration(now - muteTime);
                    message = `🎙️ **${guildNickname}** unmuted their microphone after **${muteDuration}**`;
                    muteTimes.delete(user.id);
                } else {
                    message = `🎙️ **${guildNickname}** unmuted their microphone`;
                }
            }

            // Track deafen time
            if (!oldState.selfDeaf && newState.selfDeaf) {
                deafTimes.set(user.id, now);
                message = `🔇 **${guildNickname}** deafened themselves`;
            } else if (oldState.selfDeaf && !newState.selfDeaf) {
                if (deafTimes.has(user.id)) {
                    const deafTime = deafTimes.get(user.id);
                    const deafDuration = formatDuration(now - deafTime);
                    message = `🔊 **${guildNickname}** undeafened themselves after **${deafDuration}**`;
                    deafTimes.delete(user.id);
                } else {
                    message = `🔊 **${guildNickname}** undeafened themselves`;
                }
            }

            // Send log message to text channel
            if (message) {
                logChannel.send(message);
            }
        });
    },
};