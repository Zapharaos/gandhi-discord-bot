import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";
import {TimeUtils} from "@utils/time";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {StartTsFields} from "@models/database/start_timestamps";
import {UserStatsFields} from "@models/database/user_stats";
import {StatsControllersUtils} from "@utils/stats";

export class ScreenSharingVoice implements Voice {
    public name = 'ScreenSharingVoice';

    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        const now = Date.now();

        // User is screen sharing
        if (VoiceStateUtils.startStreaming(props.oldState, props.newState)) {
            // Send message to log channel
            await props.logChannel.send(`📺 **${props.userName}** started screen sharing`);
            Logger.debug(`Screen sharing started for user: ${props.userName}`);

            // Start screensharing timestamp for user
            const startTsController = new StartTimestampsController();
            await startTsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartScreenSharing, now);
            return
        }

        // User is not screen sharing
        if (VoiceStateUtils.stopStreaming(props.oldState, props.newState)) {

            // Time tracked : calculate duration and update database
            if (props.userStartTs && props.userStartTs.start_screen_sharing !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_screen_sharing, now);

                // Send message to log channel
                await props.logChannel.send(`🛑 **${props.userName}** stopped screen sharing after **${TimeUtils.formatDuration(duration)}**`);
                Logger.debug(`Screen sharing stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop screensharing timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeScreenSharing, StartTsFields.StartScreenSharing, duration, now);
                return;
            }

            // Time was not tracked, send default message
            await props.logChannel.send(`🛑 **${props.userName}** stopped screen sharing`);
            Logger.debug(`Screen sharing stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}