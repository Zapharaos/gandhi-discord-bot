import {EventData} from '@models/event-data';
import {VoiceProps} from "@models/voice-props";

export interface Voice {
    name: string;
    execute(props: VoiceProps, data: EventData): Promise<void>;
}