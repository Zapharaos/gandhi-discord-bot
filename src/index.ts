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
import {DatabaseMigrationService} from "@services/database-migration-service";
import {SetLogChannelCommand} from "@commands/utility/setlogchannel";

dotenv.config();

// TODO : update commands
// TODO : update events

async function start(): Promise<void> {

    Logger.info(Logs.info.appStarted);

    // TODO : bot restart removes and redeploys commands -> need to ctrl R discord
    // Deploy commands
    try {
        const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN ?? "");
        const commandRegistrationService = new CommandRegistrationService(rest);
        const localCmds = [
            ...Object.values(CommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
        ];
        await commandRegistrationService.process(localCmds, process.argv);
    } catch (error) {
        Logger.error(Logs.error.commandAction, error);
    }

    // Apply migrations
    try {
        const databaseMigrationService = new DatabaseMigrationService();
        await databaseMigrationService.process();
    } catch (error) {
        Logger.error(Logs.error.databaseMigration, error);
        return process.exit(1);
    }

    Logger.info(Logs.info.databaseMigration);

    // Wait for any final logs to be written.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Services
    const eventDataService = new EventDataService();

    // Client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    // Commands
    const commands: Command[] = [
        new PingCommand(),
        new SetLogChannelCommand(),
    ];

    // Event handlers
    const commandHandler = new CommandHandler(commands, eventDataService);

    // Bot
    const bot = new Bot(
        process.env.DISCORD_TOKEN ?? "",
        client,
        commandHandler,
    );

    await bot.start();
}

start().catch(error => {
    Logger.error(Logs.error.unspecified, error);
});