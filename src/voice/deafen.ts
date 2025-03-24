import {Voice} from "./voice";
import {EventData} from "@models/event-data";
import {VoiceStateUtils} from "@utils/voice-state";
import {Logger} from "@services/logger";
import {VoiceProps} from "@models/voice-props";
import {TimeUtils} from "@utils/time";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {DailyStatsFields} from "@models/database/start_timestamps";
import {UserStatsFields} from "@models/database/user_stats";
import {StatsControllersUtils} from "@utils/stats";

export class DeafenVoice implements Voice {
    public name = 'DeafenVoice';

    public async execute(props: VoiceProps, data: EventData): Promise<void> {

        const now = Date.now();

        // User is deafened
        if (VoiceStateUtils.startDeafen(props.oldState, props.newState)) {
            // Send message to log channel
            await props.logChannel.send(`🔇 **${props.userName}** deafened themselves`);
            Logger.debug(`Deafen for user: ${props.userName}`);

            // Start deaf timestamp for user
            const startTsController = new StartTimestampsController();
            await startTsController.setStartTimestamp(props.guildId, props.userId, DailyStatsFields.StartDeafened, now);
            return
        }

        // User is undeafened
        if (VoiceStateUtils.stopDeafen(props.oldState, props.newState)) {

            // Time tracked : calculate duration and update database
            if (props.userStartTs && props.userStartTs.start_deafened !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_deafened, now);

                // Send message to log channel
                await props.logChannel.send(`🔊 **${props.userName}** undeafened themselves after **${TimeUtils.formatDuration(duration)}**`);
                Logger.debug(`Deafen stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop deaf timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeDeafened, DailyStatsFields.StartDeafened, duration, now);
                return;
            }

            // Time was not tracked, send default message
            await props.logChannel.send(`🔊 **${props.userName}** undeafened themselves`);
            Logger.debug(`Deafen stopped for user: ${props.userName} but no start time was tracked`);
            return
        }
    }
}