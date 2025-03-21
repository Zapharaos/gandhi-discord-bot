import {EventData} from '@models/event-data';
import {VoiceProps} from "@models/voice-props";

export interface Voice {
    execute(props: VoiceProps, data: EventData): Promise<void>;
}