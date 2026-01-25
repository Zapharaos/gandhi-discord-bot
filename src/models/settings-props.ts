import {TextChannel} from "discord.js";

export class SettingsProps {
    public readonly serverstats: boolean;
    public readonly serverlogs: boolean;
    public readonly logchannel: TextChannel;

    constructor(serverstats: boolean, serverlogs: boolean, logchannel: TextChannel) {
        this.serverstats = serverstats;
        this.serverlogs = serverlogs;
        this.logchannel = logchannel;
    }
}
