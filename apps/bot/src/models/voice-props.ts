import {VoiceState} from "discord.js";
import {StartTimestampsModel} from "@gandhi/core/models/database/start_timestamps";
import {SettingsProps} from "@models/settings-props";

export class VoiceProps {
    public readonly oldState: VoiceState;
    public readonly newState: VoiceState;
    public readonly guildId: string;
    public readonly userId: string;
    public readonly userName: string;
    public readonly userStartTs: StartTimestampsModel;
    public readonly settings: SettingsProps;
    public readonly now: number;

    constructor(oldState: VoiceState, newState: VoiceState, guildId: string, userId: string, userName: string, userStartTs: StartTimestampsModel, settings: SettingsProps, now: number) {
        this.oldState = oldState;
        this.newState = newState;
        this.guildId = guildId;
        this.userId = userId;
        this.userName = userName;
        this.userStartTs = userStartTs;
        this.settings = settings;
        this.now = now;
    }
}