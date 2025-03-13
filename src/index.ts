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

dotenv.config();

// TODO : linting
// TODO : format
// TODO : upgrade logs
// TODO : log files
// TODO : docker
// TODO : update commands
// TODO : tests

// TODO : apply migrations

async function start(): Promise<void> {

    Logger.info(Logs.info.appStarted);

    // Deploy commands
    try {
        const rest = new REST({version: '10'}).setToken(process.env.DISCORD_TOKEN ?? "");
        let commandRegistrationService = new CommandRegistrationService(rest);
        let localCmds = [
            ...Object.values(CommandMetadata).sort((a, b) => (a.name > b.name ? 1 : -1)),
        ];
        await commandRegistrationService.process(localCmds, process.argv);
    } catch (error) {
        Logger.error(Logs.error.commandAction, error);
    }
    // Wait for any final logs to be written.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Services
    let eventDataService = new EventDataService();

    // Client
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates
        ]
    });

    // Commands
    let commands: Command[] = [
        new PingCommand(),
    ];

    // Event handlers
    let commandHandler = new CommandHandler(commands, eventDataService);

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

/*
client.once(Events.ClientReady, () => console.log(`Ready! Logged in as ${client.user?.tag}`));

const foldersPath = path.join(process.cwd(), 'dist/src/events');
const commandFolders = fs.readdirSync(foldersPath);

(async () => {
    // Loop over each folder in the events directory
    for (const folder of commandFolders) {
        // Grab all the event files from the events directory
        const eventsPath = path.join(foldersPath, folder);
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

        // Loop over each event file in the events directory
        for (const file of eventFiles) {
            // Grab all the event files from the events directory
            const filePath = path.join(eventsPath, file);
            console.log(`Loading event: ${filePath}`);
            const event = await import(pathToFileURL(filePath).href);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        }
    }

    await client.login(process.env.DISCORD_TOKEN);
})();*/
