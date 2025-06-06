import {Client, GatewayIntentBits, REST} from 'discord.js';
import dotenv from 'dotenv';
import * as process from "node:process";

import {Bot} from "@models/bot";
import {Logger} from "@services/logger";
import {Command} from "@commands/commands";
import {CommandHandler} from "@events/command-handler";
import {PingCommand} from "@commands/utility/ping";
import {CommandMetadata} from "@commands/metadata";
import {CommandRegistrationService} from "@services/command-registration-service";
import {EventDataService} from "@services/event-data-service";
import Logs from '../lang/logs.json';
import {SetLogChannelCommand} from "@commands/utility/setlogchannel";
import {ClashCommand} from "@commands/fun/clash";
import {BiggusdickusCommand} from "@commands/stats/biggusdickus";
import {RankCommand} from "@commands/stats/rank";
import {StatsCommand} from "@commands/stats/stats";
import {HeatmapCommand} from "@commands/stats/heatmap";
import {VoiceHandler} from "@events/voice-handler";
import {Voice} from "./voice/voice";
import {MovementsVoice} from "./voice/movements";
import {MuteVoice} from "./voice/mute";
import {DeafenVoice} from "./voice/deafen";
import {ScreenSharingVoice} from "./voice/screen-sharing";
import {CameraVoice} from "./voice/camera";
import {ListInactivesCommand} from "@commands/utility/list-inactives";

dotenv.config();

async function start(): Promise<void> {

    Logger.info(Logs.info.appStarted);

    // Deploy commands
    try {
        const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN ?? "");
        const commandRegistrationService = new CommandRegistrationService(rest);
        const localCmds = [
            ...Object.values(CommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
        ];
        await commandRegistrationService.process(localCmds, process.argv);
        // Skip the rest of the script if we're just deploying commands
        if(process.argv[2] === 'commands') return;
    } catch (error) {
        await Logger.error(Logs.error.commandAction, error);
    }

    // Wait for any final logs to be written.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Services
    const eventDataService = new EventDataService();

    // Client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMembers,
        ]
    });

    // Commands
    const commands: Command[] = [
        new PingCommand(),
        new SetLogChannelCommand(),
        new ClashCommand(),
        new BiggusdickusCommand(),
        new RankCommand(),
        new StatsCommand(),
        new HeatmapCommand(),
        new ListInactivesCommand()
    ];

    // Event handlers
    const commandHandler = new CommandHandler(commands, eventDataService);

    // Voice events
    const voices: Voice[] = [
        new MovementsVoice(),
        new MuteVoice(),
        new DeafenVoice(),
        new ScreenSharingVoice(),
        new CameraVoice(),
    ];

    // Voice handlers
    const voiceHandler = new VoiceHandler(voices, eventDataService);

    // Bot
    const bot = new Bot(
        process.env.DISCORD_TOKEN ?? "",
        client,
        commandHandler,
        voiceHandler
    );

    await bot.start();
}

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});