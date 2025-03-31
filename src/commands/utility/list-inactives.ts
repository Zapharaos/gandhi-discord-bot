import {Command, CommandDeferType} from "@commands/commands";
import {ChatInputCommandInteraction, GuildMember, PermissionsString} from "discord.js";
import {InteractionUtils} from "@utils/interaction";
import {Logger} from "@services/logger";
import Logs from "../../../lang/logs.json";
import {UserStatsController} from "@controllers/user-stats";
import {UserStatsFields, UserStatsModel} from "@models/database/user_stats";
import {TimeUtils} from "@utils/time";

type InactiveUser = {
    userId: string;
    lastActivity: number;
    lastActivityString: string;
    guildNickname: string;
}

export class ListInactivesCommand implements Command {
    public names = ['list-inactives'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = ["Administrator", "ManageChannels"];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await Logger.error(Logs.error.intrMissingGuildID);
            await InteractionUtils.send(intr, 'This command can only be used in a server.');
            return;
        }

        // Get limit : the number of days since last activity
        const days = intr.options.getInteger('days') ?? 100;
        const now = Date.now();

        // Get users in the guild
        const rows = await UserStatsController.getUsersInGuildByStat(guildId, UserStatsFields.LastActivity);
        const usersStats = rows.map(row => UserStatsModel.fromUserStats(row));
        const { inactivesMap, safeUsers } = this.processUserStats(usersStats, now, days);

        // Fetch all guild members
        const guildUsers = await InteractionUtils.fetchAllGuildMembers(intr.guild!);
        this.processGuildUsers(guildUsers, inactivesMap, safeUsers);

        // Sort the inactives by last activity : the oldest first
        const sortedInactives = Array.from(inactivesMap.values()).sort((a, b) => a.lastActivity - b.lastActivity);

        // TODO : Format the inactives as embed fields
        console.log(sortedInactives);
        console.log(safeUsers);

        await InteractionUtils.editReply(intr, 'List of inactive users');
    }

    private processUserStats(usersStats: UserStatsModel[], now: number, days: number) {
        const inactivesMap = new Map<string, InactiveUser>(); // Map to store all inactive users
        const safeUsers = new Set<string>(); // Set to store all users that are not inactive

        // Check each user inside db for inactivity
        usersStats.forEach(user => {
            // Skip users without a user_id
            if (!user.user_id) return;

            // Inactive if last activity is 0
            // Inactive if last activity is more than the limit
            if (user.last_activity === 0 || TimeUtils.getDaysDifference(user.last_activity, now) < days) {
                inactivesMap.set(user.user_id, {
                    userId: user.user_id,
                    lastActivity: user.last_activity,
                    lastActivityString: user.last_activity === 0 ? 'Never' : TimeUtils.formatDate(new Date(user.last_activity)),
                    guildNickname: '',
                });
            } else {
                // User is not inactive
                safeUsers.add(user.user_id);
            }
        });

        return { inactivesMap, safeUsers };
    }

    private processGuildUsers(guildUsers: GuildMember[], inactivesMap: Map<string, InactiveUser>, safeUsers: Set<string>) {
        // Process every user found in the guild
        guildUsers.forEach(member => {
            // Check if the user is already safe
            if (safeUsers.has(member.user.id)) return;

            // Retrieve the user's data
            const nickname = member.displayName || member.nickname || member.user.globalName || 'N/A';
            const inactive = inactivesMap.get(member.user.id);

            // Check if the user is already considered inactive
            if (inactive) {
                // Update the nickname
                inactive.guildNickname = nickname;
            }
            // User never seen before : considered inactive
            else {
                inactivesMap.set(member.user.id, {
                    userId: member.user.id,
                    lastActivity: 0,
                    lastActivityString: 'Never',
                    guildNickname: nickname,
                });
            }
        });
    }
}