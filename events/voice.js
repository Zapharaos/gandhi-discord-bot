const { Events, ChannelType } = require('discord.js');
const sqlite3 = require("sqlite3").verbose();

// Maps to store user activity timestamps
const voiceJoinTimes = new Map();
const muteTimes = new Map();
const deafTimes = new Map();

// Connect to SQLite database
const db = new sqlite3.Database(process.env.DB_PATH);

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    execute(oldState, newState) {
        const user = newState.member.user;
        const guild = newState.guild;

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
                message = `➡️ **${user.tag}** joined **${newState.channel.name}**`;
            }
            // Calculate time spent in channel when leaving
            else if (oldState.channelId && !newState.channelId) {
                if (voiceJoinTimes.has(user.id)) {
                    const joinTime = voiceJoinTimes.get(user.id);
                    const duration = ((now - joinTime) / 1000).toFixed(2);
                    message = `⬅️ **${user.tag}** left **${oldState.channel.name}** after **${duration} seconds**`;
                    voiceJoinTimes.delete(user.id);
                } else {
                    message = `⬅️ **${user.tag}** left **${oldState.channel.name}**`;
                }
            }

            // Track mute time
            if (!oldState.selfMute && newState.selfMute) {
                muteTimes.set(user.id, now);
                message = `🤐️ **${user.tag}** muted their microphone`;
            } else if (oldState.selfMute && !newState.selfMute) {
                if (muteTimes.has(user.id)) {
                    const muteTime = muteTimes.get(user.id);
                    const muteDuration = ((now - muteTime) / 1000).toFixed(2);
                    message = `🎙️ **${user.tag}** unmuted their microphone after **${muteDuration} seconds**`;
                    muteTimes.delete(user.id);
                } else {
                    message = `🎙️ **${user.tag}** unmuted their microphone`;
                }
            }

            // Track deafen time
            if (!oldState.selfDeaf && newState.selfDeaf) {
                deafTimes.set(user.id, now);
                message = `🔇 **${user.tag}** deafened themselves`;
            } else if (oldState.selfDeaf && !newState.selfDeaf) {
                if (deafTimes.has(user.id)) {
                    const deafTime = deafTimes.get(user.id);
                    const deafDuration = ((now - deafTime) / 1000).toFixed(2);
                    message = `🔊 **${user.tag}** undeafened themselves after **${deafDuration} seconds**`;
                    deafTimes.delete(user.id);
                } else {
                    message = `🔊 **${user.tag}** undeafened themselves`;
                }
            }

            // Send log message to text channel
            if (message) {
                logChannel.send(message);
            }
        });
    },
};