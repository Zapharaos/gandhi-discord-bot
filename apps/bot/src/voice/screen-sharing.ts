import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";
import {TimeUtils} from "@gandhi/core/utils/time";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {StartTsFields} from "@gandhi/core/models/database/start_timestamps";
import {UserStatsFields} from "@gandhi/core/models/database/user_stats";
import {StatsControllersUtils} from "@utils/stats";
import {UserStatsController} from "@controllers/user-stats";

export class ScreenSharingVoice implements Voice {
    public name = 'ScreenSharingVoice';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(props.oldState, props.newState)) {

            // While streaming
            if (VoiceStateUtils.isStreaming(props.newState)) {
                Logger.debug('User is joining a channel while streaming');

                // Start screensharing timestamp for user (only if stats are enabled)
                if (props.settings.serverstats) {
                    await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartScreenSharing, props.now);

                    // Increment count stat
                    await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountScreenSharing);
                }
            }

            return;
        }

        // User is screen sharing
        if (VoiceStateUtils.startStreaming(props.oldState, props.newState)) {
            // Send message to log channel (only if logs are enabled)
            if (props.settings.serverlogs) {
                await props.settings.logchannel?.send(`📺 **${props.userName}** started screen sharing`);
            }
            Logger.debug(`Screen sharing started for user: ${props.userName}`);

            // Start screensharing timestamp for user (only if stats are enabled)
            if (props.settings.serverstats) {
                await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartScreenSharing, props.now);

                // Increment count stat
                await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountScreenSharing);
            }
            return
        }

        // User is not screen sharing
        if (VoiceStateUtils.stopStreaming(props.oldState, props.newState)) {

            // Time tracked : calculate duration and update database
            if (props.settings.serverstats && props.userStartTs && props.userStartTs.start_screen_sharing !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_screen_sharing, props.now);

                // Send message to log channel (with or without time based on logs setting)
                if (props.settings.serverlogs) {
                    await props.settings.logchannel?.send(`🛑 **${props.userName}** stopped screen sharing after **${TimeUtils.formatDuration(duration)}**`);
                }
                Logger.debug(`Screen sharing stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop screensharing timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeScreenSharing, StartTsFields.StartScreenSharing, duration, props.now);
                return;
            }

            // Time was not tracked, send default message (only if logs are enabled)
            if (props.settings.serverlogs) {
                await props.settings.logchannel?.send(`🛑 **${props.userName}** stopped screen sharing`);
            }
            Logger.debug(`Screen sharing stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}