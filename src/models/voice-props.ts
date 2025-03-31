import {TextChannel, VoiceState} from "discord.js";
import {StartTimestampsModel} from "@models/database/start_timestamps";

export class VoiceProps {
    public readonly oldState: VoiceState;
    public readonly newState: VoiceState;
    public readonly guildId: string;
    public readonly userId: string;
    public readonly userName: string;
    public readonly userStartTs: StartTimestampsModel;
    public readonly logChannel: TextChannel;
    public readonly now: number;

    constructor(oldState: VoiceState, newState: VoiceState, guildId: string, userId: string, userName: string, userStartTs: StartTimestampsModel, logChannel: TextChannel, now: number) {
        this.oldState = oldState;
        this.newState = newState;
        this.guildId = guildId;
        this.userId = userId;
        this.userName = userName;
        this.userStartTs = userStartTs;
        this.logChannel = logChannel;
        this.now = now;
    }
}