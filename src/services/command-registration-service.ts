import {REST} from '@discordjs/rest';
import {
    APIApplicationCommand,
    RESTGetAPIApplicationCommandsResult,
    RESTPatchAPIApplicationCommandJSONBody,
    RESTPostAPIApplicationCommandsJSONBody,
    Routes,
} from 'discord.js';

import {Logger} from './logger.js';
import Logs from '../../lang/logs.json';

export class CommandRegistrationService {
    constructor(private rest: REST) {
    }

    public async process(
        localCmds: RESTPostAPIApplicationCommandsJSONBody[],
        args: string[]
    ): Promise<void> {
        const remoteCmds = (await this.rest.get(
            Routes.applicationCommands(process.env.APP_ID ?? '')
        )) as RESTGetAPIApplicationCommandsResult;

        const localCmdsOnRemote = localCmds.filter(
            localCmd => remoteCmds.some(remoteCmd => remoteCmd.name === localCmd.name)
        );
        const localCmdsOnly = localCmds.filter(
            localCmd => !remoteCmds.some(remoteCmd => remoteCmd.name === localCmd.name)
        );
        const remoteCmdsOnly = remoteCmds.filter(
            remoteCmd => !localCmds.some(localCmd => localCmd.name === remoteCmd.name)
        );

        // Default update deploy if no args
        if (process.argv[2] !== 'commands') {
            await this.register(localCmdsOnly, localCmdsOnRemote);
            return;
        }

        switch (args[3]) {
            case 'view': {
                this.view(localCmdsOnRemote, localCmdsOnly, remoteCmdsOnly);
                return;
            }
            case 'register': {
                await this.register(localCmdsOnly, localCmdsOnRemote);
                return;
            }
            case 'rename': {
                const oldName = args[4];
                const newName = args[5];
                await this.rename(oldName, newName, remoteCmds);
                return;
            }
            case 'delete': {
                const name = args[4];
                await this.delete(name, remoteCmds);
                return;
            }
            case 'clear': {
                await this.clear(remoteCmds);
                return;
            }
        }
    }

    private formatCommandList(
        cmds: RESTPostAPIApplicationCommandsJSONBody[] | APIApplicationCommand[]
    ): string {
        return cmds.length > 0
            ? cmds.map((cmd: { name: string }) => `'${cmd.name}'`).join(', ')
            : 'N/A';
    }

    private view(localCmdsOnRemote: RESTPostAPIApplicationCommandsJSONBody[], localCmdsOnly: RESTPostAPIApplicationCommandsJSONBody[], remoteCmdsOnly: APIApplicationCommand[]): void {
        Logger.info(
            Logs.info.commandActionView
                .replaceAll(
                    '{LOCAL_AND_REMOTE_LIST}',
                    this.formatCommandList(localCmdsOnRemote)
                )
                .replaceAll('{LOCAL_ONLY_LIST}', this.formatCommandList(localCmdsOnly))
                .replaceAll('{REMOTE_ONLY_LIST}', this.formatCommandList(remoteCmdsOnly))
        );
    }

    private async register(localCmdsOnly: RESTPostAPIApplicationCommandsJSONBody[], localCmdsOnRemote: RESTPostAPIApplicationCommandsJSONBody[]): Promise<void> {
        if (localCmdsOnly.length > 0) {
            Logger.info(
                Logs.info.commandActionCreating.replaceAll(
                    '{COMMAND_LIST}',
                    this.formatCommandList(localCmdsOnly)
                )
            );
            for (const localCmd of localCmdsOnly) {
                await this.rest.post(Routes.applicationCommands(process.env.APP_ID ?? ''), {
                    body: localCmd,
                });
            }
            Logger.info(Logs.info.commandActionCreated);
        }

        if (localCmdsOnRemote.length > 0) {
            Logger.info(
                Logs.info.commandActionUpdating.replaceAll(
                    '{COMMAND_LIST}',
                    this.formatCommandList(localCmdsOnRemote)
                )
            );
            for (const localCmd of localCmdsOnRemote) {
                await this.rest.post(Routes.applicationCommands(process.env.APP_ID ?? ''), {
                    body: localCmd,
                });
            }
            Logger.info(Logs.info.commandActionUpdated);
        }
    }

    private async rename(oldName: string, newName: string, remoteCmds: APIApplicationCommand[]): Promise<void> {
        if (!(oldName && newName)) {
            Logger.error(Logs.error.commandActionRenameMissingArg);
            return;
        }

        const remoteCmd = remoteCmds.find(remoteCmd => remoteCmd.name == oldName);
        if (!remoteCmd) {
            Logger.error(
                Logs.error.commandActionNotFound.replaceAll('{COMMAND_NAME}', oldName)
            );
            return;
        }

        Logger.info(
            Logs.info.commandActionRenaming
                .replaceAll('{OLD_COMMAND_NAME}', remoteCmd.name)
                .replaceAll('{NEW_COMMAND_NAME}', newName)
        );
        const body: RESTPatchAPIApplicationCommandJSONBody = {
            name: newName,
        };
        await this.rest.patch(Routes.applicationCommand(process.env.APP_ID ?? '', remoteCmd.id), {
            body,
        });
        Logger.info(Logs.info.commandActionRenamed);
    }

    private async delete(name: string, remoteCmds: APIApplicationCommand[]): Promise<void> {
        if (!name) {
            Logger.error(Logs.error.commandActionDeleteMissingArg);
            return;
        }

        const remoteCmd = remoteCmds.find(remoteCmd => remoteCmd.name == name);
        if (!remoteCmd) {
            Logger.error(
                Logs.error.commandActionNotFound.replaceAll('{COMMAND_NAME}', name)
            );
            return;
        }

        Logger.info(
            Logs.info.commandActionDeleting.replaceAll('{COMMAND_NAME}', remoteCmd.name)
        );
        await this.rest.delete(Routes.applicationCommand(process.env.APP_ID ?? '', remoteCmd.id));
        Logger.info(Logs.info.commandActionDeleted);
    }

    private async clear(remoteCmds: APIApplicationCommand[]): Promise<void> {
        Logger.info(
            Logs.info.commandActionClearing.replaceAll(
                '{COMMAND_LIST}',
                this.formatCommandList(remoteCmds)
            )
        );
        await this.rest.put(Routes.applicationCommands(process.env.APP_ID ?? ''), {body: []});
        Logger.info(Logs.info.commandActionCleared);
    }
}