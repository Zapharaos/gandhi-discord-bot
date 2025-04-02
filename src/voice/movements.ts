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

export class MovementsVoice implements Voice {
    public name = 'MovementsVoice';

    public async execute(props: VoiceProps, data: EventData): Promise<void> {
        await this.handleJoin(props, data);
        await this.handleLeave(props, data);
        await this.handleSwitch(props, data);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async handleJoin(props: VoiceProps, data: EventData): Promise<void> {
        // Check if the user is joining a channel
        if (VoiceStateUtils.isJoiningChannel(props.oldState, props.newState)) {

            // Send message to log channel
            await props.logChannel.send(`➡️ **${props.userName}** joined **${props.newState.channel?.name}**`);
            Logger.debug('User is joining a channel');

            // Start connected timestamp for user
            await StartTimestampsController.setStartTimestamp(props.guildId, props.userId, StartTsFields.StartConnected, props.now);

            // Increment total joins for user
            // await UserStatsController.incrementTotalJoins(props.guildId, props.userId);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async handleLeave(props: VoiceProps, data: EventData): Promise<void> {
        // Check if the user is leaving a channel
        if (VoiceStateUtils.isLeavingChannel(props.oldState, props.newState)) {

            // Time was not tracked, send default message
            if (!props.userStartTs || props.userStartTs.start_connected === 0) {
                // Send message to log channel
                await props.logChannel.send(`⬅️ **${props.userName}** left **${props.oldState.channel?.name}**`);
                Logger.debug('User is leaving a channel but no start time was tracked');
            }
            // Time tracked: calculate duration and update database
            else {
                const duration = TimeUtils.getDuration(props.userStartTs.start_connected, props.now);

                // Send message to log channel
                await props.logChannel.send(`⬅️ **${props.userName}** left **${props.oldState.channel?.name}** after **${TimeUtils.formatDuration(duration)}**`);
                Logger.debug(`User is leaving a channel after ${duration} ms`);

                // Update user stats and stop connected timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeConnected, StartTsFields.StartConnected, duration, props.now);
            }

            // If user has no live stats, do nothing
            if (!props.userStartTs) return;

            // Stop mute if user was muted
            if (props.userStartTs.start_muted !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_muted, props.now);
                Logger.debug(`Mute stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop mute timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeMuted, StartTsFields.StartMuted, duration, props.now);
            }

            // Stop deafen if user was deafened
            if (props.userStartTs.start_deafened !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_deafened, props.now);
                Logger.debug(`Deafen stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop deaf timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeDeafened, StartTsFields.StartDeafened, duration, props.now);
            }

            // Stop screen sharing if user was sharing screen
            if (props.userStartTs.start_screen_sharing !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_screen_sharing, props.now);
                Logger.debug(`Screen sharing stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop screensharing timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeScreenSharing, StartTsFields.StartScreenSharing, duration, props.now);
            }

            // Stop camera if user was using camera
            if (props.userStartTs.start_camera !== 0) {
                const duration = TimeUtils.getDuration(props.userStartTs.start_camera, props.now);
                Logger.debug(`Camera stopped for user: ${props.userName} after ${duration} ms`);

                // Update user stats and stop camera timestamp for user
                await StatsControllersUtils.updateStat(props, UserStatsFields.TimeCamera, StartTsFields.StartCamera, duration, props.now);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private async handleSwitch(props: VoiceProps, data: EventData): Promise<void> {
        // Check if the user is switching channels
        if (VoiceStateUtils.isSwitchingChannel(props.oldState, props.newState)) {
            // Send message to log channel
            await props.logChannel.send(`🔄 **${props.userName}** switched from **${props.oldState.channel?.name}** to **${props.newState.channel?.name}**`);
            Logger.debug('User is switching channels');
        }
    }
}