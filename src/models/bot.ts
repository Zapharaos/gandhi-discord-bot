import {
    AutocompleteInteraction,
    Client,
    CommandInteraction,
    Events,
    Interaction, VoiceState,
} from 'discord.js';

import {
    CommandHandler,
} from '@events/command-handler';
import {Logger} from "@services/logger";

import Logs from '../../lang/logs.json';
import {VoiceHandler} from "@events/voice-handler";

export class Bot {
    private ready = false;

    constructor(
        private token: string,
        private client: Client,
        private commandHandler: CommandHandler,
        private voiceHandler: VoiceHandler,
    ) {
    }

    public async start(): Promise<void> {
        this.registerListeners();
        await this.login(this.token);
    }

    private registerListeners(): void {
        this.client.on(Events.ClientReady, () => this.onReady());
        this.client.on(Events.InteractionCreate, (intr: Interaction) => this.onInteraction(intr));
        this.client.on(Events.VoiceStateUpdate, (oldState: VoiceState, newState: VoiceState) => this.onVoiceState(oldState, newState));
    }

    private async login(token: string): Promise<void> {
        try {
            await this.client.login(token);
        } catch (error) {
            Logger.error(Logs.error.clientLogin, error);
            return;
        }
    }

    private async onReady(): Promise<void> {
        const userTag = this.client.user?.tag;
        Logger.info(Logs.info.clientLogin.replaceAll('{USER_TAG}', userTag));

        this.ready = true;
        Logger.info(Logs.info.clientReady);
    }

    private async onInteraction(intr: Interaction): Promise<void> {
        if (!this.ready) return;

        if (intr instanceof CommandInteraction || intr instanceof AutocompleteInteraction) {
            try {
                await this.commandHandler.process(intr);
            } catch (error) {
                Logger.error(Logs.error.command, error);
            }
        }
    }

    private async onVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void> {
        if (!this.ready) return;

        try {
            await this.voiceHandler.process(oldState, newState);
        } catch (error) {
            Logger.error(Logs.error.voice, error);
        }
    }
}