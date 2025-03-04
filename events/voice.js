const { Events, ChannelType } = require('discord.js');
const { formatDuration } = require('../utils/time');
const { connect, updateUserStats, incrementTotalJoins } = require('../utils/sqlite');

// Maps to store user activity timestamps
const voiceJoinTimes = new Map();
const muteTimes = new Map();
const deafTimes = new Map();
const screenShareTimes = new Map();

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    execute(oldState, newState) {
        const user = newState.member.user;
        const guild = newState.guild;
        const guildNickname = newState.member.nickname || user.displayName; // The user's nickname in the guild (fallback to username)

        // Connect to SQLite database
        const db = connect();

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
                incrementTotalJoins(db, guild.id, user.id, now);
                message = `➡️ **${guildNickname}** joined **${newState.channel.name}**`;
            }
            // Calculate time spent in channel when leaving
            else if (oldState.channelId && !newState.channelId) {
                if (voiceJoinTimes.has(user.id)) {
                    const joinTime = voiceJoinTimes.get(user.id);
                    const duration = now - joinTime;
                    updateUserStats(db, guild.id, user.id, 'time_connected', duration, now);
                    message = `⬅️ **${guildNickname}** left **${oldState.channel.name}** after **${formatDuration(duration)}**`;
                    voiceJoinTimes.delete(user.id);
                } else {
                    message = `⬅️ **${guildNickname}** left **${oldState.channel.name}**`;
                }
            }
            // User switches voice channels
            else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                if (voiceJoinTimes.has(user.id)) {
                    const joinTime = voiceJoinTimes.get(user.id);
                    const duration = now - joinTime;
                    updateUserStats(db, guild.id, user.id, 'time_connected', duration, now);
                    message = `🔄 **${guildNickname}** switched from **${oldState.channel.name}** to **${newState.channel.name}** after **${formatDuration(duration)}**`;
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
                    const muteDuration = now - muteTime;
                    updateUserStats(db, guild.id, user.id, 'time_muted', muteDuration, now);
                    message = `🎙️ **${guildNickname}** unmuted their microphone after **${formatDuration(muteDuration)}**`;
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
                    const deafDuration = now - deafTime;
                    updateUserStats(db, guild.id, user.id, 'time_deafened', deafDuration, now);
                    message = `🔊 **${guildNickname}** undeafened themselves after **${formatDuration(deafDuration)}**`;
                    deafTimes.delete(user.id);
                } else {
                    message = `🔊 **${guildNickname}** undeafened themselves`;
                }
            }

            // Track screen sharing time
            if (!oldState.streaming && newState.streaming) {
                screenShareTimes.set(user.id, now);
                message = `📺 **${guildNickname}** started screen sharing`;
            } else if (oldState.streaming && !newState.streaming) {
                if (screenShareTimes.has(user.id)) {
                    const screenShareTime = screenShareTimes.get(user.id);
                    const screenShareDuration = now - screenShareTime;
                    updateUserStats(db, guild.id, user.id, 'time_screen_sharing', screenShareDuration, now);
                    message = `🛑 **${guildNickname}** stopped screen sharing after **${formatDuration(screenShareDuration)}**`;
                    screenShareTimes.delete(user.id);
                } else {
                    message = `🛑 **${guildNickname}** stopped screen sharing`;
                }
            }

            // Send log message to text channel
            if (message) {
                logChannel.send(message);
            }
        });

        // Close database connection
        db.close();
    },
};