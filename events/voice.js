const { Events } = require('discord.js');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false, // Change to 'false' to allow multiple events
    execute(oldState, newState) {
        const user = newState.member.user;

        // Detect joins/leaves
        if (!oldState.channelId && newState.channelId) {
            console.log(`${user.tag} joined ${newState.channel.name}`);
        } else if (oldState.channelId && !newState.channelId) {
            console.log(`${user.tag} left ${oldState.channel.name}`);
        }

        // Detect mic mute/unmute
        if (!oldState.selfMute && newState.selfMute) {
            console.log(`${user.tag} muted their microphone`);
        } else if (oldState.selfMute && !newState.selfMute) {
            console.log(`${user.tag} unmuted their microphone`);
        }

        // Detect headphone mute (deafen) / unmute (undeafen)
        if (!oldState.selfDeaf && newState.selfDeaf) {
            console.log(`${user.tag} deafened themselves`);
        } else if (oldState.selfDeaf && !newState.selfDeaf) {
            console.log(`${user.tag} undeafened themselves`);
        }
    },
};