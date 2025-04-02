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
import {UserStatsController} from "@controllers/user-stats";

export class DeafenVoice implements Voice {
    public name = 'DeafenVoice';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(props.oldState, props.newState)) {

            // While deafened
            if (VoiceStateUtils.isDeafen(props.newState)) {
                Logger.debug('User is joining a channel while deafened');

                // Start deaf timestamp for user
                await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartDeafened, props.now);

                // Increment count stat
                await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountDeafened);
            }

            return;
        }

        // User is deafened
        if (VoiceStateUtils.startDeafen(props.oldState, props.newState)) {
            // Send message to log channel
            await props.logChannel.send(`🔇 **${props.userName}** deafened themselves`);
            Logger.debug(`Deafen for user: ${props.userName}`);

            // Start deaf timestamp for user
            await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartDeafened, props.now);

            // Increment count stat
            await UserStatsController.incrementCountStat(props.guildId, props.userId, UserStatsFields.CountDeafened);
            return
        }

        // User is undeafened
        if (VoiceStateUtils.stopDeafen(props.oldState, props.newState)) {

            // Time tracked : calculate duration and update database
            if (props.userStartTs && props.userStartTs.start_deafened !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_deafened, props.now);

                // Send message to log channel
                await props.logChannel.send(`🔊 **${props.userName}** undeafened themselves after **${TimeUtils.formatDuration(duration)}**`);
                Logger.debug(`Deafen stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop deaf timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeDeafened, StartTsFields.StartDeafened, duration, props.now);
                return;
            }

            // Time was not tracked, send default message
            await props.logChannel.send(`🔊 **${props.userName}** undeafened themselves`);
            Logger.debug(`Deafen stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}