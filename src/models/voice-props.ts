import {TextChannel, VoiceState} from "discord.js";
import {StartTimestamps} from "@models/database/start_timestamps";

export class VoiceProps {
    public readonly oldState: VoiceState;
    public readonly newState: VoiceState;
    public readonly guildId: string;
    public readonly userId: string;
    public readonly userName: string;
    public readonly userStartTs: StartTimestamps;
    public readonly logChannel: TextChannel;

    constructor(oldState: VoiceState, newState: VoiceState, guildId: string, userId: string, userName: string, userStartTs: StartTimestamps, logChannel: TextChannel) {
        this.oldState = oldState;
        this.newState = newState;
        this.guildId = guildId;
        this.userId = userId;
        this.userName = userName;
        this.userStartTs = userStartTs;
        this.logChannel = logChannel;
    }
}