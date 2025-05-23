import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";
import {TimeUtils} from "@utils/time";
import {StatsControllersUtils} from "@utils/stats";
import {UserStatsFields} from "@models/database/user_stats";
import {StartTsFields} from "@models/database/start_timestamps";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {UserStatsController} from "@controllers/user-stats";

export class MuteVoice implements Voice {
    public name = 'MuteVoice';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(props.oldState, props.newState)) {

            // While muted
            if (VoiceStateUtils.isMuted(props.newState)) {
                Logger.debug('User is joining a channel while muted');

                // Start mute timestamp for user
                await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartMuted, props.now);

                // Increment count stat
                await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountMuted);
            }

            return;
        }

        // User is muted
        if (VoiceStateUtils.startMute(props.oldState, props.newState)) {
            // Send message to log channel
            await props.logChannel.send(`🙊️ **${props.userName}** muted their microphone`);
            Logger.debug(`Mute for user: ${props.userName}`);

            // Start mute timestamp for user
            await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartMuted, props.now);

            // Increment count stat
            await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountMuted);
            return
        }

        // User is unmuted
        if (VoiceStateUtils.stopMute(props.oldState, props.newState)) {

            // Time tracked: calculate duration and update database
            if (props.userStartTs && props.userStartTs.start_muted !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_muted, props.now);

                // Send message to log channel
                await props.logChannel.send(`🎙️ **${props.userName}** unmuted their microphone after **${TimeUtils.formatDuration(duration)}**`);
                Logger.debug(`Mute stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop mute timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeMuted, StartTsFields.StartMuted, duration, props.now);
                return;
            }

            // Time was not tracked, send default message
            await props.logChannel.send(`🎙️ **${props.userName}** unmuted their microphone`);
            Logger.debug(`Mute stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}