import {Command, CommandDeferType} from "@commands/commands";
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionsString} from "discord.js";
import {Heatmap, HeatmapData} from "@models/heatmap";
import {TimeUtils} from "@utils/time";
import {InteractionUtils} from "@utils/interaction";
import {StartTimestampsModel, StatKey} from "@models/database/start_timestamps";
import {DailyStatsController} from "@controllers/daily-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {DailyStatsModel, DailyStatsMap} from "@models/database/daily_stats";
import puppeteer from "puppeteer";
import {UserStatsFields} from "@models/database/user_stats";
import {Logger} from "@services/logger";
import Logs from "../../../lang/logs.json";

export class HeatmapCommand implements Command {
    public names = ['heatmap'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        // Can target either all guild users or a specific user
        const targetAll = intr.options.getBoolean('target-all') ?? false;
        const target = intr.options.getMember('target');
        if (targetAll && target) {
            await InteractionUtils.editReply(intr, 'You can only use one of the options: target, target-all');
            return;
        }

        // Get the guild id
        const guildId = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await Logger.error(Logs.error.intrMissingGuildID);
            await InteractionUtils.editReply(intr, 'This command can only be used in a server.');
            return;
        }

        // Get the remaining options
        const format: string = intr.options.getString('format') || 'png';
        const stat: string = intr.options.getString('stat') || UserStatsFields.TimeConnected;
        const startStat: string | null = StartTimestampsModel.getColNameFromUserStat(stat);
        const startStatKey: StatKey | null = startStat ? StartTimestampsModel.getStatKey(startStat) : null;

        // Prepare heatmap
        const heatmap = new Heatmap();
        heatmap.setStat(stat);
        heatmap.setIsTargetAll(targetAll);
        heatmap.setGuildName(intr.guild?.name);
        heatmap.setGuildIcon(intr.guild?.iconURL() ?? undefined);

        // Heatmap data
        let dailyStats: DailyStatsModel[];
        let startTimestamps: StartTimestampsModel[];

        // Check if the heatmap should be generated for all users
        if (targetAll) {
            // Get the daily_stats heatmap data for all users
            const rowsDailyStats = await DailyStatsController.getTotalForUsersInGuildByStat(guildId, stat);
            dailyStats = rowsDailyStats.map(row => DailyStatsModel.fromDailyStats(row));

            // Get the start timestamps for the active users
            const rows = await StartTimestampsController.getUsersInGuildByStat(guildId, startStatKey);
            startTimestamps = rows.map(row => StartTimestampsModel.fromStartTimestamps(row));
        }
        else {
            const interactionUser = InteractionUtils.getInteractionUser(intr);
            heatmap.setUserName(interactionUser.name);
            heatmap.setUserAvatar(interactionUser.avatar);

            // Get the daily_stats heatmap data for the user
            const rowsDailyStats = await DailyStatsController.getUserInGuildByStat(guildId, interactionUser.id, stat);
            dailyStats = rowsDailyStats.map(row => DailyStatsModel.fromDailyStats(row));

            // Get the start timestamps for the user
            const row = await StartTimestampsController.getUserByGuild(guildId, interactionUser.id);
            startTimestamps = row ? [StartTimestampsModel.fromStartTimestamps(row)] : [];
        }

        // Calculate the live daily stats for all users
        let dailyStatsLive: DailyStatsMap = new Map();
        const now = Date.now();
        startTimestamps.forEach(row => {
            // Retrieve user live daily stats as a map
            const local = DailyStatsModel.fromStartTimestamps(row, startStatKey, now);
            // Merge user live daily stats with global live daily stats
            dailyStatsLive = DailyStatsModel.mergeDailyStatsMaps(dailyStatsLive, local);
        });

        // Convert the daily stats into a map for easier access
        let dailyStatsMap: DailyStatsMap = new Map(dailyStats.map(item => [item.day_timestamp, item]));
        dailyStatsMap = DailyStatsModel.mergeDailyStatsMaps(dailyStatsMap, dailyStatsLive);

        // Calculate the max time connected for the guild heatmap
        let max_time_connected = -1;
        if (heatmap.getIsTargetAll() && heatmap.getStat() === UserStatsFields.TimeConnected) {
            dailyStatsMap.forEach(data => {
                if (data.time_connected > max_time_connected) {
                    max_time_connected = data.time_connected;
                }
            });
        }

        // Convert rows into a format that cal-heatmap can consume
        const data = this.formatHeatmapData(heatmap, dailyStatsMap, max_time_connected);
        heatmap.setData(data);

        // Generate the heatmap
        if (format === 'html') {
            const html = heatmap.getHtml();
            const attachment = new AttachmentBuilder(Buffer.from(html), { name: heatmap.getFileName('html') });
            await InteractionUtils.editReply(intr, { files: [attachment] });
        }
        else {
            const imagePath = await this.getPNGHeatmap(heatmap);
            const attachment = new AttachmentBuilder(imagePath);
            await InteractionUtils.editReply(intr, { files: [attachment] });
        }
    }

    public formatHeatmapData(heatmap: Heatmap, dailyStatsMap: DailyStatsMap, max_time_connected: number): HeatmapData[] {
        const dailyStatsStatKey = DailyStatsModel.getStatKey(heatmap.getStat());

        // Convert the rows into a format that cal-heatmap can consume
        const data: HeatmapData[] = [];
        dailyStatsMap.forEach(dailyStats => {
            const duration = dailyStats[dailyStatsStatKey];
            let value = 0;
            let valueBis = 0;

            // Calculate the value as a percentage of the max time connected, tooltip display the value as time in minutes
            if (heatmap.getIsTargetAll() && heatmap.getStat() === UserStatsFields.TimeConnected) {
                value = TimeUtils.durationAsPercentage(duration, max_time_connected);
                valueBis = TimeUtils.msToMinutes(duration);
            }
            // Display the value as time in minutes
            else if (heatmap.getStat() === UserStatsFields.TimeConnected) {
                value = TimeUtils.msToMinutes(duration);
            }
            // Calculate the value as a percentage of the time connected, tooltip display the value as time in minutes
            else {
                value = TimeUtils.durationAsPercentage(dailyStats[dailyStatsStatKey], dailyStats.time_connected);
                valueBis = TimeUtils.msToMinutes(dailyStats[dailyStatsStatKey]);
            }

            const item: HeatmapData = { date: TimeUtils.tsToYYYYMMDD(dailyStats.day_timestamp), value: value, valueBis: valueBis };
            data.push(item);
        });

        return data
    }

    private async getPNGHeatmap(heatmap: Heatmap): Promise<string> {

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        // Log console messages from the page
        page.on('console', (msg) => {
            const args = msg.args();
            args.forEach(async (arg) => {
                const text = await arg.jsonValue();
                console.log('[Puppeteer log]:', text);
            });
        });

        // Set custom viewport (width & height)
        await page.setViewport({ width: 800, height: 200 });

        // Set the content of the page
        await page.setContent(heatmap.getHtml());

        // Wait for the cal-heatmap element to be painted
        await page.evaluate(() => {
            return new Promise((resolve) => {
                document.addEventListener('heatmapRendered', resolve, { once: true });
            });
        });

        // Take a screenshot of the page
        const imagePath = heatmap.getFileName('png');
        await page.screenshot({ path: imagePath });
        await browser.close();

        return imagePath;
    }
}