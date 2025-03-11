import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import {pathToFileURL} from "url";

const commands: any[] = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

(async () => {
    // Loop over each folder in the commands directory
    for (const folder of commandFolders) {
        // Grab all the command files from the commands directory
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import(pathToFileURL(filePath).href);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(`⚠️ [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
})();

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN ?? "");

// Deploy commands to Discord
(async () => {
    try {
        console.log(`Refreshing ${commands.length} application commands: ${commands.map(cmd => cmd.name).join(', ')}`);

        // The put method is used to fully refresh all commands with the current set
        const data = await rest.put(
            Routes.applicationCommands(process.env.APP_ID ?? ""),
            { body: commands },
        );

        const typedData = data as {}[];
        console.log(`✅  Successfully reloaded ${typedData.length} application commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(`❌  Error reloading commands:`, error);
    }
})();