import {
    Channel,
    CommandInteractionOptionResolver,
    Guild, Locale,
    PartialDMChannel,
    User,
} from 'discord.js';

import {EventData} from '@models/event-data';

export class EventDataService {
    public async create(
        options: {
            user?: User;
            channel?: Channel | PartialDMChannel;
            guild?: Guild;
            args?: Omit<CommandInteractionOptionResolver, 'getMessage' | 'getFocused'>;
        } = {}
    ): Promise<EventData> {
        // TODO: Retrieve any data you want to pass along in events

        // Event language
        const lang =
            options.guild?.preferredLocale
                ? options.guild.preferredLocale
                : Locale.EnglishUS;

        // Guild language
        const langGuild =
            options.guild?.preferredLocale
                ? options.guild.preferredLocale
                : Locale.EnglishUS;

        return new EventData(lang, langGuild);
    }
}