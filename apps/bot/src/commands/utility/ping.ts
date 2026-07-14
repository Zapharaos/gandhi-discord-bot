import {ChatInputCommandInteraction, PermissionsString,} from 'discord.js';
import {Command, CommandDeferType} from "@commands/commands";
import {EventData} from "@models/event-data";
import {InteractionUtils} from "@utils/interaction";

export class PingCommand implements Command {
    public names = ['ping'];
    public deferType = CommandDeferType.HIDDEN;
    public requireClientPerms: PermissionsString[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {
        await InteractionUtils.send(intr, 'Pong!');
    };
}