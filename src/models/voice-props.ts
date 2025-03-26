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

    constructor(oldState: VoiceState, newState: VoiceState, guildId: string, userId: string, userName: string, userStartTs: StartTimestampsModel, logChannel: TextChannel) {
        this.oldState = oldState;
        this.newState = newState;
        this.guildId = guildId;
        this.userId = userId;
        this.userName = userName;
        this.userStartTs = userStartTs;
        this.logChannel = logChannel;
    }
}