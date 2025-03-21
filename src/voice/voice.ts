import {
    VoiceState,
} from 'discord.js';

import {EventData} from '@models/event-data';

export interface Voice {
    execute(oldState: VoiceState, newState: VoiceState, data: EventData): Promise<void>;
}