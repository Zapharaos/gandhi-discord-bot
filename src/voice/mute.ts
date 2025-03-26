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

export class MuteVoice implements Voice {
    public name = 'MuteVoice';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        const now = Date.now();

        // Deafen event triggers the mute event
        if (VoiceStateUtils.isDeafenEvent(props.oldState, props.newState)) {

            // User does not stay muted -> ignore the event
            // It means the mute event was triggered as part of start/stop deafen event
            if (!VoiceStateUtils.staysMuted(props.oldState, props.newState)) {
                return
            }

            // User start deafen while already being muted -> stop mute
            if (VoiceStateUtils.startDeafen(props.oldState, props.newState) && props.userStartTs && props.userStartTs.start_muted !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_muted, now);
                Logger.debug(`User ${props.userName} was muted before deafen event = stop mute timers after ${duration} ms`);

                // Update user stats and stop mute timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeMuted, StartTsFields.StartMuted, duration, now);
                return
            }

            // User stop deafen while still being muted -> restart mute
            if (VoiceStateUtils.stopDeafen(props.oldState, props.newState)) {
                Logger.debug('User still muted after deafen event = restart mute timers');

                // Start mute timestamp for user
                const startTsController = new StartTimestampsController();
                await startTsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartMuted, now);
                return
            }

            // Unreachable
            return;
        }

        // User is muted
        if (VoiceStateUtils.startMute(props.oldState, props.newState)) {
            // Send message to log channel
            await props.logChannel.send(`🙊️ **${props.userName}** muted their microphone`);
            Logger.debug(`Mute for user: ${props.userName}`);

            // Start mute timestamp for user
            const startTsController = new StartTimestampsController();
            await startTsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartMuted, now);
            return
        }

        // User is unmuted
        if (VoiceStateUtils.stopMute(props.oldState, props.newState)) {

            // Time tracked: calculate duration and update database
            if (props.userStartTs && props.userStartTs.start_muted !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_muted, now);

                // Send message to log channel
                await props.logChannel.send(`🎙️ **${props.userName}** unmuted their microphone after **${TimeUtils.formatDuration(duration)}**`);
                Logger.debug(`Mute stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop mute timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeMuted, StartTsFields.StartMuted, duration, now);
                return;
            }

            // Time was not tracked, send default message
            await props.logChannel.send(`🎙️ **${props.userName}** unmuted their microphone`);
            Logger.debug(`Mute stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}