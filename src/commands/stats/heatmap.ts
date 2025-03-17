import {Command, CommandDeferType} from "@commands/commands";
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionsString} from "discord.js";
import {Heatmap, HeatmapData} from "@models/heatmap";
import {TimeUtils} from "@utils/time";
import {InteractionUtils} from "@utils/interaction";
import {StartTimestamps} from "@models/database/start_timestamps";
import {DailyStatsController} from "@controllers/daily-stats";
import {StartTimestampsController} from "@controllers/start-timestamps";
import {DailyStats, DailyStatsMap} from "@models/database/daily_stats";
import puppeteer from "puppeteer";

export class HeatmapCommand implements Command {
    public names = ['heatmap'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        // Can target either all guild users or a specific user
        const targetAll = intr.options.getBoolean('target-all');
        const target = intr.options.getMember('target');
        if (targetAll && target) {
            await InteractionUtils.editReply(intr, 'You can only use one of the options: target, target-all');
            return;
        }

        // Get the guild id
        const guildId: string = InteractionUtils.getGuildId(intr);
        if (!guildId) {
            await InteractionUtils.editReply(intr, 'This command can only be used in a server.');
            return;
        }

        // Get the remaining options
        const format: string = intr.options.getString('format') || 'png';
        const stat: string = intr.options.getString('stat') || 'time_connected';
        const startStatKey = StartTimestamps.getStatKey(stat.replace('time_', 'start_'));

        // Prepare heatmap
        const heatmap = new Heatmap();
        heatmap.setStat(stat);
        heatmap.setIsTargetAll(targetAll);
        heatmap.setGuildName(intr.guild?.name);
        heatmap.setGuildIcon(intr.guild?.iconURL() ?? undefined);

        // Heatmap data
        let dailyStats: DailyStats[];
        let startTimestamps: StartTimestamps[];

        // Check if the heatmap should be generated for all users
        if (targetAll) {
            // Get the daily_stats heatmap data for all users
            const dailyStatsController = new DailyStatsController();
            const rowsDailyStats = await dailyStatsController.getTotalForUsersInGuildByStat(guildId, stat);
            dailyStats = rowsDailyStats ?? [];

            // Get the start timestamps for the active users
            const startTimestampController = new StartTimestampsController();
            const rows = await startTimestampController.getUsersInGuildByStat(guildId, startStatKey);
            startTimestamps = rows ? rows : [];
        }
        else {
            const interactionUser = InteractionUtils.getInteractionUser(intr);
            heatmap.setUserName(interactionUser.name);
            heatmap.setUserAvatar(interactionUser.avatar);

            // Get the daily_stats heatmap data for the user
            const dailyStatsController = new DailyStatsController();
            const rowsDailyStats = await dailyStatsController.getUserInGuildByStat(guildId, interactionUser.id, stat);
            dailyStats = rowsDailyStats ?? [];

            // Get the start timestamps for the user
            const startTimestampController = new StartTimestampsController();
            const startTimestamp = await startTimestampController.getUserByGuild(guildId, interactionUser.id);
            startTimestamps = startTimestamp ? [startTimestamp] : [];
        }

        // Calculate the live daily stats for all users
        let dailyStatsLive: DailyStatsMap = new Map();
        const now = Date.now();
        startTimestamps.forEach(row => {
            // Retrieve user live daily stats as a map
            const local = DailyStats.fromStartTimestamps(row, startStatKey, now);

            // Merge user live daily stats with global live daily stats
            dailyStatsLive = DailyStats.mergeDailyStatsMap(dailyStatsLive, local);
        });

        // Convert rows into a format that cal-heatmap can consume
        const data = this.formatHeatmapData(heatmap, dailyStats, dailyStatsLive);
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

    public formatHeatmapData(heatmap: Heatmap, dailyStats: DailyStats[], dailyStatsLive: DailyStatsMap): HeatmapData[] {
        let max_time_connected = -1;
        const isGuilFormatAndTimeConnected = heatmap.getIsTargetAll() && heatmap.getStat() === 'time_connected';
        const dailyStatsStatKey = DailyStats.getStatKey(heatmap.getStat());

        // Update the rows with the live data
        dailyStats.forEach(item => {

            // Check if there is live data for the current timestamp
            const day = liveData.get(item.day_timestamp);
            if (day) {
                if (heatmap.getStat() !== 'time_connected') {
                    item.time_connected += day.durationConnected;
                }
                item[dailyStatsStatKey] += day.duration;
                liveData.delete(item.day_timestamp);
            }

            // Calculate the max time connected for the guild heatmap
            if (isGuilFormatAndTimeConnected && item.time_connected > max_time_connected) {
                max_time_connected = item.time_connected;
            }
        });

        if (isGuilFormatAndTimeConnected) {
            // Calculate the max time connected for the guild heatmap - unlikely to be reached
            liveData.forEach(data => {
                if (data.durationConnected > max_time_connected) {
                    max_time_connected = data.durationConnected;
                }
            });
        }

        // Convert the rows into a format that cal-heatmap can consume
        let data: HeatmapData[] = [];
        rows.forEach(row => {

            let value = 0;
            let valueBis = 0;

            // Calculate the value as a percentage of the max time connected, tooltip display the value as time in minutes
            if (isGuilFormatAndTimeConnected) {
                value = TimeUtils.durationAsPercentage(row[heatmap.getStat()], max_time_connected);
                valueBis = TimeUtils.msToMinutes(row[heatmap.getStat()]);
            }
            // Display the value as time in minutes
            else if (heatmap.getStat() === 'time_connected') {
                value = TimeUtils.msToMinutes(row[heatmap.getStat()]);
            }
            // Calculate the value as a percentage of the time connected, tooltip display the value as time in minutes
            else {

                value = TimeUtils.durationAsPercentage(row[dailyStatsStatKey], row.time_connected);
                valueBis = TimeUtils.msToMinutes(row[dailyStatsStatKey]);
            }

            const item: HeatmapData = { date: TimeUtils.tsToYYYYMMDD(row.day_timestamp), value: value, valueBis: valueBis };
            data.push(item);
        });

        // Convert the remaining live data into a format that cal-heatmap can consume
        liveData.forEach((data, key) => {

            let value = 0;
            let valueBis = 0;

            // Calculate the value as a percentage of the max time connected, tooltip display the value as time in minutes
            if (isGuilFormatAndTimeConnected) {
                value = TimeUtils.durationAsPercentage(data.duration, max_time_connected);
                valueBis = TimeUtils.msToMinutes(data.duration);
            }
            // Display the value as time in minutes
            else if (heatmap.getStat() === 'time_connected') {
                value = TimeUtils.msToMinutes(data.duration);
            }
            // Calculate the value as a percentage of the time connected, tooltip display the value as time in minutes
            else {
                value = TimeUtils.durationAsPercentage(data.duration, data.durationConnected);
                valueBis = TimeUtils.msToMinutes(data.duration);
            }

            data.push({ date: TimeUtils.tsToYYYYMMDD(key), value: value, valueBis: valueBis });
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