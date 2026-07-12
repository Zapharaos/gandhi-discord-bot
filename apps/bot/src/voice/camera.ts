import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";
import {TimeUtils} from "@gandhi/core/utils/time";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {UserStatsFields} from "@gandhi/core/models/database/user_stats";
import {StartTsFields} from "@gandhi/core/models/database/start_timestamps";
import {StatsControllersUtils} from "@utils/stats";
import {UserStatsController} from "@controllers/user-stats";

export class CameraVoice implements Voice {
    public name = 'CameraVoice';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(props.oldState, props.newState)) {

            // With camera on
            if (VoiceStateUtils.isCameraOn(props.newState)) {
                Logger.debug('User is joining a channel with their camera on');

                // Start camera timestamp for user (only if stats are enabled)
                if (props.settings.serverstats) {
                    await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartCamera, props.now);

                    // Increment count stat
                    await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountCamera);
                }
            }

            return;
        }

        // User is camera
        if (VoiceStateUtils.startCamera(props.oldState, props.newState)) {
            // Send message to log channel (only if logs are enabled)
            if (props.settings.serverlogs) {
                await props.settings.logchannel.send(`📷 **${props.userName}** turned on their camera`);
            }
            Logger.debug(`Camera started for user: ${props.userName}`);

            // Start camera timestamp for user (only if stats are enabled)
            if (props.settings.serverstats) {
                await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartCamera, props.now);

                // Increment count stat
                await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountCamera);
            }
            return
        }

        // User is not camera
        if (VoiceStateUtils.stopCamera(props.oldState, props.newState)) {

            // Time tracked: calculate duration and update database
            if (props.settings.serverstats && props.userStartTs && props.userStartTs.start_camera !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_camera, props.now);

                // Send message to log channel (with or without time based on logs setting)
                if (props.settings.serverlogs) {
                    await props.settings.logchannel.send(`🙈 **${props.userName}** turned off their camera after **${TimeUtils.formatDuration(duration)}**`);
                }
                Logger.debug(`Camera stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop camera timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeCamera, StartTsFields.StartCamera, duration, props.now);
                return;
            }

            // Time was not tracked, send default message (only if logs are enabled)
            if (props.settings.serverlogs) {
                await props.settings.logchannel.send(`🙈 **${props.userName}** turned off their camera`);
            }
            Logger.debug(`Camera stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}