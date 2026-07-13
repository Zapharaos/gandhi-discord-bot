import {TextChannel} from "discord.js";

export class SettingsProps {
    public readonly serverstats: boolean;
    public readonly serverlogs: boolean;
    // Only present (and only accessed) when logging is enabled; stats/live tracking
    // do not need a log channel.
    public readonly logchannel: TextChannel | null;

    constructor(serverstats: boolean, serverlogs: boolean, logchannel: TextChannel | null) {
        this.serverstats = serverstats;
        this.serverlogs = serverlogs;
        this.logchannel = logchannel;
    }
}
