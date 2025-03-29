import {ChatInputCommandInteraction, PermissionsString} from 'discord.js';
import {InteractionUser, InteractionUtils} from "@utils/interaction";
import {Command, CommandDeferType} from "@commands/commands";
import {UserStatsController} from "@controllers/user-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {TimeUtils} from "@utils/time";
import {Logger} from "@services/logger";
import Logs from "../../../lang/logs.json";
import {StartTimestampsModel} from "@models/database/start_timestamps";
import {UserStatsModel} from "@models/database/user_stats";

export class BiggusdickusCommand implements Command {
    public names = ['biggusdickus'];
    public deferType = CommandDeferType.NONE;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await Logger.error(Logs.error.intrMissingGuildID);
            await InteractionUtils.send(intr, 'This command can only be used in a server.');
            return;
        }

        const interactionUser: InteractionUser = InteractionUtils.getInteractionUser(intr);
        // intrUserRaw is the user mention in the reply
        const intrUserRaw = InteractionUtils.getInteractionUserRaw(intr);

        // Get the user stats
        const rowUserStats = await UserStatsController.getUserInGuild(guildId, interactionUser.id);

        // Get the user live stats
        const rowStartTs = await StartTimestampsController.getUserByGuild(guildId, interactionUser.id);

        // User has no stats yet
        if(!rowUserStats && !rowStartTs){
            await InteractionUtils.send(intr, `${intrUserRaw} has no stats yet!`);
            return;
        }

        // Map from db generated types
        const userStats = UserStatsModel.fromUserStats(rowUserStats ?? {});
        const startTimestamps = StartTimestampsModel.fromStartTimestamps(rowStartTs ?? {});

        let streak = userStats.daily_streak;

        // Check if the user has any live start timestamps
        if (startTimestamps.isActive()) {
            // Calculate the difference in days between the last activity and now = live streak
            const daysDifference = TimeUtils.getDaysDifference(userStats.last_activity, Date.now());
            if (daysDifference > 0) {
                streak += daysDifference;
                Logger.debug(`Biggusdickus - User ${interactionUser.id} has a live streak of ${daysDifference}`);
            }
        }

        Logger.debug(`Biggusdickus - User ${interactionUser.id} has a global streak of ${streak}`);

        // Build the reply
        const reply = this.formatReply(streak, intrUserRaw);
        await InteractionUtils.send(intr, reply);
    }

    private getPP(num: number){
        let ppsize='';
        for (let i = 0; i < num; i++){
            ppsize += '=';
        }
        return ppsize;
    }

    private getStreakMessages(streak: number): string[] {
        if (streak < 5) {
            return ['Hey', 'Nice pp 🥵'];
        } else if (5 < streak && streak < 10) {
            return ['Oh wow', '🥵 Sheesh nice pp 🍆💦'];
        }
        return ['Oooooh Mmmmmabouttocuuum 😫', '🥵 Holy shit Big big PP 🍆💦🍑'];
    }

    private formatReply(streak: number, user: unknown): string {
        const pp = this.getPP(streak);
        const messages = this.getStreakMessages(streak);

        return `
            ${messages[0]} ${user}
            ${messages[1]}
            \`8${pp}D\`
        `.replace(/^\s+/gm, ''); // Remove leading spaces from each line
    }
}
