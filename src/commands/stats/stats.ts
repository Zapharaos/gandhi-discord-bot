import {Command, CommandDeferType} from "@commands/commands";
import {APIEmbedField, ChatInputCommandInteraction, EmbedBuilder, PermissionsString} from "discord.js";
import {InteractionUser, InteractionUtils} from "@utils/interaction";
import {UserStatsController} from "@controllers/user-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {TimeUtils} from "@utils/time";
import {
    StatKey as UserStatsKey,
    UserStatsFields,
    UserStatsModel
} from "@models/database/user_stats";
import {StartTimestampsModel, StartTsFields, StatKey} from "@models/database/start_timestamps";

export class StatsCommand implements Command {
    public names = ['stats'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await InteractionUtils.editReply(intr, 'This command can only be used in a server.');
            return;
        }

        const interactionUser: InteractionUser = InteractionUtils.getInteractionUser(intr);

        // Get the user stats
        const rowUserStats = await UserStatsController.getUserInGuild(guildId, interactionUser.id);
        const rowStartTs = await StartTimestampsController.getUserByGuild(guildId, interactionUser.id);

        // User has no stats yet
        if (!rowUserStats && !rowStartTs) {
            await InteractionUtils.send(intr, `${InteractionUtils.getInteractionUserRaw(intr)} has no stats yet!`);
            return;
        }

        // Map from db generated types
        const userStats = UserStatsModel.fromUserStats(rowUserStats ?? {});
        const startTimestamps = StartTimestampsModel.fromStartTimestamps(rowStartTs ?? {});

        // Combine the live stats with the user stats
        const now = Date.now();
        const stats = startTimestamps?.combineAllWithUserStats(userStats, now) ?? {} as UserStatsModel;

        // Update the last activity timestamp
        if (startTimestamps.isActive()) {
            stats.isLive = true;
        }

        // Build the embed builder fields
        const fields = [
            this.buildTotalFields(stats),
            this.buildMaxFields(stats),
        ]
        if (stats.isLive) {
            fields.push(this.buildLiveFields(startTimestamps, now));
        }
        const ebs = this.buildEmbedBuilders(fields, interactionUser);

        await InteractionUtils.replyWithPagination(intr, ebs);
    }

    private buildTotalFields(stats: UserStatsModel): APIEmbedField[] {
        return [
            {
                name: '**Total Connected**',
                value: this.formatTimeUserStat(stats, UserStatsFields.TimeConnected)
            },
            {
                name: '**Total Muted**',
                value: this.formatTimeUserStat(stats, UserStatsFields.TimeMuted)
            },
            {
                name: '**Total Deafened**',
                value: this.formatTimeUserStat(stats, UserStatsFields.TimeDeafened)
            },
            {
                name: '**Total Screen Sharing**',
                value: this.formatTimeUserStat(stats, UserStatsFields.TimeScreenSharing)
            },
            {
                name: '**Total Camera**',
                value: this.formatTimeUserStat(stats, UserStatsFields.TimeCamera)
            },
            {
                name: '**Daily Streak**',
                value: stats.formatStatAsString(UserStatsFields.DailyStreak)
            },
            {
                name: '**Last Activity**',
                value: stats.isLive ?
                    'Now' :
                    !stats.last_activity ?
                        'Never' :
                        stats.formatStatAsDate(UserStatsFields.LastActivity) ?? ''
            }
        ];
    }

    private buildMaxFields(stats: UserStatsModel): APIEmbedField[] {
        return [
            {
                name: '**Max Connected**',
                value: this.formatTimeUserStat(stats, UserStatsFields.MaxConnected)
            },
            {
                name: '**Max Muted**',
                value: this.formatTimeUserStat(stats, UserStatsFields.MaxMuted)
            },
            {
                name: '**Max Deafened**',
                value: this.formatTimeUserStat(stats, UserStatsFields.MaxDeafened)
            },
            {
                name: '**Max Screen Sharing**',
                value: this.formatTimeUserStat(stats, UserStatsFields.MaxScreenSharing)
            },
            {
                name: '**Max Camera**',
                value: this.formatTimeUserStat(stats, UserStatsFields.MaxCamera)
            },
            {
                name: '**Max Daily Streak**',
                value: stats.formatStatAsString(UserStatsFields.MaxDailyStreak)
            }
        ]
    }

    private buildLiveFields(stats: StartTimestampsModel, now: number): APIEmbedField[] {
        const fields: APIEmbedField[] = [];

        const connected = this.formatTimeStartStat(stats, StartTsFields.StartConnected, now);
        if (connected) {
            fields.push({
                name: '**Live Connected**',
                value: connected
            });
        }

        const muted = this.formatTimeStartStat(stats, StartTsFields.StartMuted, now);
        if (muted) {
            fields.push({
                name: '**Live Muted**',
                value: muted
            });
        }

        const deafened = this.formatTimeStartStat(stats, StartTsFields.StartDeafened, now);
        if (deafened) {
            fields.push({
                name: '**Live Deafened**',
                value: deafened
            });
        }

        const screenSharing = this.formatTimeStartStat(stats, StartTsFields.StartScreenSharing, now);
        if (screenSharing) {
            fields.push({
                name: '**Live Screen Sharing**',
                value: screenSharing
            });
        }

        const camera = this.formatTimeStartStat(stats, StartTsFields.StartCamera, now);
        if (camera) {
            fields.push({
                name: '**Live Camera**',
                value: camera
            });
        }

        return fields;
    }

    private buildEmbedBuilders(items: APIEmbedField[][], user: InteractionUser): EmbedBuilder[] {
        const ebs: EmbedBuilder[] = [];

        items.forEach(fields => {
            const eb = new EmbedBuilder()
                .setTitle(`Statistics for ${user.name}`)
                .setFields(fields)
                .setFooter({
                    text: user.name,
                    iconURL: user.avatar
                })
                .setTimestamp()
            ebs.push(eb);
        });

        return ebs;
    }

    private formatTimeUserStat(stats: UserStatsModel, key : UserStatsKey): string {
        let value = stats.formatStatAsDuration(key)
        if (!value) return '';
        const percentage = stats.formatStatAsPercentage(key);
        if (percentage) {
            value += `\n${percentage}`;
        }
        return value;
    }

    private formatTimeStartStat(stats: StartTimestampsModel, key : StatKey, now: number): string | null{
        const value = stats[key];
        if (!value) return null;

        const date = TimeUtils.formatDate(new Date(value));
        const duration = TimeUtils.getDuration(value, now);

        return `${date}\n${TimeUtils.formatDuration(duration)}`;
    }
}
