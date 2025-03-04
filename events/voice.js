const { Events, ChannelType } = require('discord.js');
const { formatDuration } = require('../utils/time');
const { connect, updateUserStats, incrementTotalJoins } = require('../utils/sqlite');

// Maps to store user activity timestamps
const voiceJoinTimes = new Map();
const muteTimes = new Map();
const deafTimes = new Map();
const screenShareTimes = new Map();
const cameraTimes = new Map();

let userProps = {
    id: null,
    guildId: null,
    guildNickname: null,
    now: null
};

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

            userProps = { id: user.id, guildId: guild.id, guildNickname: guildNickname };
            let now = Date.now();

            // Track join time
            handleVoiceChannel(db, now, logChannel, oldState, newState, userProps);

            // Track mute time
            handleMute(db, now, logChannel, oldState, newState, userProps);

            // Track deafen time
            handleDeafen(db, now, logChannel, oldState, newState, userProps);

            // Track screen sharing time
            handleScreensharing(db, now, logChannel, oldState, newState, userProps);

            // Track camera time
            handleCamera(db, now, logChannel, oldState, newState, userProps);
        });

        // Close database connection
        db.close();
    },
};

function handleVoiceChannel(db, now, logChannel, oldState, newState, userProps) {

    // Same channel: do nothing
    if (oldState.channelId === newState.channelId) return;

    console.log(`handleVoiceChannel called with user: ${userProps.guildNickname}, oldState: ${oldState.channelId}, newState: ${newState.channelId}`);

    // Join channel
    if (!oldState.channelId && newState.channelId) {
        voiceJoinTimes.set(userProps.id, now);
        incrementTotalJoins(db, userProps.guildId, userProps.id, now);
        logChannel.send(`➡️ **${userProps.guildNickname}** joined **${newState.channel.name}**`);
        console.log(`User ${userProps.guildNickname} joined ${newState.channel.name} at ${now}`);
        return;
    }

    // Leave channel
    if (oldState.channelId && !newState.channelId) {
        // Time was not tracked, send default message
        if (!voiceJoinTimes.has(userProps.id)) {
            logChannel.send(`⬅️ **${userProps.guildNickname}** left **${oldState.channel.name}**`);
            console.log(`User ${userProps.guildNickname} left ${oldState.channel.name} but no start time was tracked`);
            return;
        }

        // Time tracked: calculate duration and update database
        const joinTime = voiceJoinTimes.get(userProps.id);
        const duration = now - joinTime;
        updateUserStats(db, userProps.guildId, userProps.id, 'time_connected', duration, now);
        logChannel.send(`⬅️ **${userProps.guildNickname}** left **${oldState.channel.name}** after **${formatDuration(duration)}**`);
        console.log(`User ${userProps.guildNickname} left ${oldState.channel.name} after ${duration} ms`);
        voiceJoinTimes.delete(userProps.id);

        // Stop mute
        if (muteTimes.has(userProps.id)) {
            const duration = now - muteTimes.get(userProps.id);
            updateUserStats(db, userProps.guildId, userProps.id, 'time_muted', duration, now);
            console.log(`Mute stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            muteTimes.delete(userProps.id);
        }

        // Stop deafen
        if (deafTimes.has(userProps.id)) {
            const duration = now - deafTimes.get(userProps.id);
            updateUserStats(db, userProps.guildId, userProps.id, 'time_deafened', duration, now);
            console.log(`Deafen stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            deafTimes.delete(userProps.id);
        }

        // Stop screen sharing
        if (screenShareTimes.has(userProps.id)) {
            const duration = now - screenShareTimes.get(userProps.id);
            updateUserStats(db, userProps.guildId, userProps.id, 'time_screen_sharing', duration, now);
            console.log(`Screen sharing stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            screenShareTimes.delete(userProps.id);
        }
    }

    // Switch channel
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        logChannel.send(`🔄 **${userProps.guildNickname}** switched from **${oldState.channel.name}** to **${newState.channel.name}**`);
        console.log(`User ${userProps.guildNickname} left ${oldState.channel.name} but no start time was tracked`);
    }
}

function handleMute(db, now, logChannel, oldState, newState, userProps) {
    // Same state: do nothing
    if (oldState.selfMute === newState.selfMute) return;

    // Skip mute if part of a deafen action
    if (hasDeafenAction(oldState, newState)) return;

    console.log(`handleMute called with user: ${userProps.guildNickname}, oldState: ${oldState.selfMute}, newState: ${newState.selfMute}`);

    // Start mute
    if (!oldState.selfMute && newState.selfMute) {
        muteTimes.set(userProps.id, now);
        logChannel.send(`🙊️ **${userProps.guildNickname}** muted their microphone`);
        console.log(`Mute for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop mute
    // Time tracked: calculate duration and update database
    if (muteTimes.has(userProps.id)) {
        const duration = now - muteTimes.get(userProps.id);
        updateUserStats(db, userProps.guildId, userProps.id, 'time_muted', duration, now);
        logChannel.send(`🎙️ **${userProps.guildNickname}** unmuted their microphone after **${formatDuration(duration)}**`);
        console.log(`Mute stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        muteTimes.delete(userProps.id);
        return;
    }

    // Time was not tracked, send default message
    logChannel.send(`🎙️ **${userProps.guildNickname}** unmuted their microphone`);
    console.log(`Mute stopped for user: ${userProps.guildNickname} but no start time was tracked`);
}

function handleDeafen(db, now, logChannel, oldState, newState, userProps) {

    // Same state : do nothing
    if (oldState.selfDeaf === newState.selfDeaf) return;

    console.log(`handleDeafen called with user: ${userProps.guildNickname}, oldState: ${oldState.streaming}, newState: ${newState.streaming}`);

    // Start deafen
    if (!oldState.selfDeaf && newState.selfDeaf) {
        deafTimes.set(userProps.id, now);
        logChannel.send(`🔇 **${userProps.guildNickname}** deafened themselves`);
        console.log(`Deafen for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop deafen

    // Time tracked : calculate duration and update database
    if (deafTimes.has(userProps.id)) {
        const duration = now - deafTimes.get(userProps.id);
        updateUserStats(db, userProps.guildId, userProps.id, 'time_deafened', duration, now);
        logChannel.send(`🔊 **${userProps.guildNickname}** undeafened themselves after **${formatDuration(duration)}**`);
        console.log(`Deafen stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        deafTimes.delete(userProps.id);
        return;
    }

    // Time was not tracked, send default message
    logChannel.send(`🔊 **${userProps.guildNickname}** undeafened themselves`);
    console.log(`Deafen stopped for user: ${userProps.guildNickname} but no start time was tracked`);
}

function handleScreensharing(db, now, logChannel, oldState, newState, userProps) {

    // Same state : do nothing
    if (oldState.streaming === newState.streaming) return;

    console.log(`handleScreensharing called with user: ${userProps.guildNickname}, oldState: ${oldState.streaming}, newState: ${newState.streaming}`);

    // Start screen sharing
    if (!oldState.streaming && newState.streaming) {
        screenShareTimes.set(userProps.id, now);
        logChannel.send(`📺 **${userProps.guildNickname}** started screen sharing`);
        console.log(`Screen sharing started for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop screen sharing

    // Time tracked : calculate duration and update database
    if (screenShareTimes.has(userProps.id)) {
        const duration = now - screenShareTimes.get(userProps.id);
        updateUserStats(db, userProps.guildId, userProps.id, 'time_screen_sharing', duration, now);
        logChannel.send(`🛑 **${userProps.guildNickname}** stopped screen sharing after **${formatDuration(duration)}**`);
        console.log(`Screen sharing stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        screenShareTimes.delete(userProps.id);
        return;
    }

    // Time was not tracked, send default message
    logChannel.send(`🛑 **${userProps.guildNickname}** stopped screen sharing`);
    console.log(`Screen sharing stopped for user: ${userProps.guildNickname} but no start time was tracked`);
}

function handleCamera(db, now, logChannel, oldState, newState, userProps) {
    // Same state: do nothing
    if (oldState.selfVideo === newState.selfVideo) return;

    console.log(`handleCamera called with user: ${userProps.guildNickname}, oldState: ${oldState.selfVideo}, newState: ${newState.selfVideo}`);

    // Start camera
    if (!oldState.selfVideo && newState.selfVideo) {
        cameraTimes.set(userProps.id, now);
        logChannel.send(`📷 **${userProps.guildNickname}** turned on their camera`);
        console.log(`Camera started for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop camera
    // Time tracked: calculate duration and update database
    if (cameraTimes.has(userProps.id)) {
        const duration = now - cameraTimes.get(userProps.id);
        updateUserStats(db, userProps.guildId, userProps.id, 'time_camera', duration, now);
        logChannel.send(`🙈 **${userProps.guildNickname}** turned off their camera after **${formatDuration(duration)}**`);
        console.log(`Camera stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        cameraTimes.delete(userProps.id);
        return;
    }

    // Time was not tracked, send default message
    logChannel.send(`🙈 **${userProps.guildNickname}** turned off their camera`);
    console.log(`Camera stopped for user: ${userProps.guildNickname} but no start time was tracked`);
}

function hasDeafenAction(oldState, newState) {
    return oldState.selfDeaf !== newState.selfDeaf;
}