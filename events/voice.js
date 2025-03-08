import { Events, ChannelType } from 'discord.js';
import { formatDuration } from '../utils/time.js';
import {connect, updateUserStats, incrementTotalJoins, getStartTimestamps, setStartTimestamp} from '../utils/sqlite.js';

let userProps = {
    id: null,
    guildId: null,
    guildNickname: null,
    startTimestamps: null,
};

export const name = Events.VoiceStateUpdate;
export const once = false;
export async function execute(oldState, newState) {
    const user = newState.member.user;
    const guild = newState.guild;
    const guildNickname = newState.member.nickname || user.displayName; // The user's nickname in the guild (fallback to username)

    // Connect to SQLite database
    const db = connect();

    // Get log channel ID from database
    await new Promise((resolve, reject) => {
        db.get("SELECT log_channel_id FROM servers WHERE guild_id = ?", [guild.id], async (err, row) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!row) return; // No log channel set for this server

            const logChannelId = row.log_channel_id;
            const logChannel = guild.channels.cache.get(logChannelId);
            if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

            const now = Date.now();
            userProps = {id: user.id, guildId: guild.id, guildNickname: guildNickname};
            userProps.startTimestamps = await getStartTimestamps(db, guild.id, user.id)

            // Track join time
            handleVoiceChannel(db, now, logChannel, oldState, newState, userProps);

            // Only track other states if the user was already in a channel
            if (oldState.channelId) {
                // Track mute time
                handleMute(db, now, logChannel, oldState, newState, userProps);

                // Track deafen time
                handleDeafen(db, now, logChannel, oldState, newState, userProps);

                // Track screen sharing time
                handleScreensharing(db, now, logChannel, oldState, newState, userProps);

                // Track camera time
                handleCamera(db, now, logChannel, oldState, newState, userProps);
            }
        });
    });

    // Close database connection
    db.close();
}

function handleVoiceChannel(db, now, logChannel, oldState, newState, userProps) {

    // Same channel: do nothing
    if (oldState.channelId === newState.channelId) return;

    console.log(`handleVoiceChannel called with user: ${userProps.guildNickname}, oldState: ${oldState.channelId}, newState: ${newState.channelId}`);

    // Join channel
    if (!oldState.channelId && newState.channelId) {
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_connected', now);
        incrementTotalJoins(db, userProps.guildId, userProps.id, now);
        logChannel.send(`➡️ **${userProps.guildNickname}** joined **${newState.channel.name}**`);
        console.log(`User ${userProps.guildNickname} joined ${newState.channel.name} at ${now}`);

        // Joins as muted or deafened
        if (newState.selfDeaf) {
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_deafened', now);
            console.log(`User ${userProps.guildNickname} joined deafened`);
        }
        else if (newState.selfMute) {
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_muted', now);
            console.log(`User ${userProps.guildNickname} joined muted`);
        }

        return;
    }

    // Leave channel
    if (oldState.channelId && !newState.channelId) {
        // Time was not tracked, send default message
        if (!userProps.startTimestamps || userProps.startTimestamps.start_connected === 0) {
            logChannel.send(`⬅️ **${userProps.guildNickname}** left **${oldState.channel.name}**`);
            console.log(`User ${userProps.guildNickname} left ${oldState.channel.name} but no start time was tracked`);
        } else {
            // Time tracked: calculate duration and update database
            const joinTime = userProps.startTimestamps.start_connected;
            const duration = now - joinTime;
            updateUserStats(db, userProps.guildId, userProps.id, 'time_connected', duration, now);
            logChannel.send(`⬅️ **${userProps.guildNickname}** left **${oldState.channel.name}** after **${formatDuration(duration)}**`);
            console.log(`User ${userProps.guildNickname} left ${oldState.channel.name} after ${duration} ms`);
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_connected', 0);
        }

        // If user has no live stats, do nothing
        if (!userProps.startTimestamps) return;

        // Stop mute
        if (userProps.startTimestamps.start_muted !== 0) {
            const duration = now - userProps.startTimestamps.start_muted;
            updateUserStats(db, userProps.guildId, userProps.id, 'time_muted', duration, now);
            console.log(`Mute stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_muted', 0);
        }

        // Stop deafen
        if (userProps.startTimestamps.start_deafened !== 0) {
            const duration = now - userProps.startTimestamps.start_deafened;
            updateUserStats(db, userProps.guildId, userProps.id, 'time_deafened', duration, now);
            console.log(`Deafen stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_deafened', 0);
        }

        // Stop screen sharing
        if (userProps.startTimestamps.start_screen_sharing !== 0) {
            const duration = now - userProps.startTimestamps.start_screen_sharing;
            updateUserStats(db, userProps.guildId, userProps.id, 'time_screen_sharing', duration, now);
            console.log(`Screen sharing stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_screen_sharing', 0);
        }

        // Stop camera
        if (userProps.startTimestamps.start_camera !== 0) {
            const duration = now - userProps.startTimestamps.start_camera;
            updateUserStats(db, userProps.guildId, userProps.id, 'time_camera', duration, now);
            console.log(`Camera stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_camera', 0);
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
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_muted', now);
        logChannel.send(`🙊️ **${userProps.guildNickname}** muted their microphone`);
        console.log(`Mute for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop mute
    // Time tracked: calculate duration and update database
    if (userProps.startTimestamps && userProps.startTimestamps.start_muted !== 0) {
        const duration = now - userProps.startTimestamps.start_muted;
        updateUserStats(db, userProps.guildId, userProps.id, 'time_muted', duration, now);
        logChannel.send(`🎙️ **${userProps.guildNickname}** unmuted their microphone after **${formatDuration(duration)}**`);
        console.log(`Mute stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_muted', 0);
        return;
    }

    // Time was not tracked, send default message
    logChannel.send(`🎙️ **${userProps.guildNickname}** unmuted their microphone`);
    console.log(`Mute stopped for user: ${userProps.guildNickname} but no start time was tracked`);
}

function handleDeafen(db, now, logChannel, oldState, newState, userProps) {

    // Same state : do nothing
    if (oldState.selfDeaf === newState.selfDeaf) return;

    if (staysMuteAction(oldState, newState) && userProps.startTimestamps) {
        // If user was already mute and start deafened, stop mute counter
        if (userProps.startTimestamps.start_muted !== 0) {
            const duration = now - userProps.startTimestamps.start_muted;
            updateUserStats(db, userProps.guildId, userProps.id, 'time_muted', duration, now);
            console.log(`Mute stopped for user: ${userProps.guildNickname} after ${duration} ms`);
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_muted', 0);
        }
        // If user was deafened and only deafened while still muted, start mute counter
        else {
            setStartTimestamp(db, userProps.guildId, userProps.id, 'start_muted', now);
            console.log(`Mute for user: ${userProps.guildNickname} at ${now}`);
        }
    }

    console.log(`handleDeafen called with user: ${userProps.guildNickname}, oldState: ${oldState.selfDeaf}, newState: ${newState.selfDeaf}`);

    // Start deafen
    if (!oldState.selfDeaf && newState.selfDeaf) {
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_deafened', now);
        logChannel.send(`🔇 **${userProps.guildNickname}** deafened themselves`);
        console.log(`Deafen for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop deafen

    // Time tracked : calculate duration and update database
    if (userProps.startTimestamps && userProps.startTimestamps.start_deafened !== 0) {
        const duration = now - userProps.startTimestamps.start_deafened;
        updateUserStats(db, userProps.guildId, userProps.id, 'time_deafened', duration, now);
        logChannel.send(`🔊 **${userProps.guildNickname}** undeafened themselves after **${formatDuration(duration)}**`);
        console.log(`Deafen stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_deafened', 0);
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
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_screen_sharing', now);
        logChannel.send(`📺 **${userProps.guildNickname}** started screen sharing`);
        console.log(`Screen sharing started for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop screen sharing

    // Time tracked : calculate duration and update database
    if (userProps.startTimestamps && userProps.startTimestamps.start_screen_sharing !== 0) {
        const duration = now - userProps.startTimestamps.start_screen_sharing;
        updateUserStats(db, userProps.guildId, userProps.id, 'time_screen_sharing', duration, now);
        logChannel.send(`🛑 **${userProps.guildNickname}** stopped screen sharing after **${formatDuration(duration)}**`);
        console.log(`Screen sharing stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_screen_sharing', 0);
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
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_camera', now);
        logChannel.send(`📷 **${userProps.guildNickname}** turned on their camera`);
        console.log(`Camera started for user: ${userProps.guildNickname} at ${now}`);
        return;
    }

    // Stop camera
    // Time tracked: calculate duration and update database
    if (userProps.startTimestamps && userProps.startTimestamps.start_camera !== 0) {
        const duration = now - userProps.startTimestamps.start_camera;
        updateUserStats(db, userProps.guildId, userProps.id, 'time_camera', duration, now);
        logChannel.send(`🙈 **${userProps.guildNickname}** turned off their camera after **${formatDuration(duration)}**`);
        console.log(`Camera stopped for user: ${userProps.guildNickname} after ${duration} ms`);
        setStartTimestamp(db, userProps.guildId, userProps.id, 'start_camera', 0);
        return;
    }

    // Time was not tracked, send default message
    logChannel.send(`🙈 **${userProps.guildNickname}** turned off their camera`);
    console.log(`Camera stopped for user: ${userProps.guildNickname} but no start time was tracked`);
}

function hasDeafenAction(oldState, newState) {
    return oldState.selfDeaf !== newState.selfDeaf;
}

function staysMuteAction(oldState, newState) {
    return oldState.selfMute === newState.selfMute && newState.selfMute === true;
}