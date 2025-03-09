import { SlashCommandBuilder } from 'discord.js';
import puppeteer from 'puppeteer';
import {
    connect,
    getGuildStartTimestamps,
    getLiveDurationPerDay,
    getStartTimestamps
} from '../../utils/sqlite.js';
import { AttachmentBuilder } from 'discord.js';
import {durationAsPercentage, msToMinutes, tsToYYYYMMDD} from "../../utils/time.js";

let htmlProps = {
    heatmapData: [],
    heatmapStat: "",
    userName: "",
    userAvatar: "",
    guildName: "",
    guildIcon: "",
    isGuildFormat: false,
}

export const data = new SlashCommandBuilder()
    .setName('heatmap')
    .setDescription('Generates a calendar heatmap of time spent connected per day')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to get heatmap for')
    )
    .addBooleanOption(option =>
        option.setName('target-all')
            .setDescription('Generate heatmap for all users')
    )
    .addStringOption(option =>
        option.setName('stat')
            .setDescription('The stat to show on the heatmap (default: time_connected)')
            .setRequired(false)
            .addChoices(
                { name: 'Time Connected', value: 'time_connected' },
                { name: 'Time Muted', value: 'time_muted' },
                { name: 'Time Deafened', value: 'time_deafened' },
                { name: 'Time Screen Sharing', value: 'time_screen_sharing' },
                { name: 'Time Camera', value: 'time_camera' },
            )
    )
    .addStringOption(option =>
        option.setName('format')
            .setDescription('The format of the output (default: png)')
            .setRequired(false)
            .addChoices(
                { name: 'PNG', value: 'png' },
                { name: 'HTML', value: 'html' },
            )
    );

export async function execute(interaction) {

    if (interaction.options.getBoolean('target-all') && interaction.options.getMember('target')) {
        return interaction.reply('You can only use one of the options: target, target-all');
    }

    const guildId = interaction.guild.id;
    const format = interaction.options.getString('format') || 'png';
    const stat = interaction.options.getString('stat') || 'time_connected';

    let htmlProps = {
        heatmapStat: stat,
        isGuildFormat: false,
        guildName: interaction.guild.name,
        guildIcon: interaction.guild.iconURL(),
    };

    // Connect to the database
    const db = connect();
    const startStat = stat.replace('time_', 'start_');

    // Heatmap data
    let rowsData = [];
    let startTimestamps = [];

    // Check if the heatmap should be generated for all users
    if (interaction.options.getBoolean('target-all')) {

        htmlProps.isGuildFormat = true;

        // Get the daily_stats heatmap data for all users
        const rows = await new Promise((resolve, reject) => {
            db.all(`
                SELECT day_timestamp, SUM(time_connected) as time_connected, SUM(${stat}) as ${stat}
                FROM daily_stats
                WHERE guild_id = ?
                GROUP BY day_timestamp
    `, [guildId], (err, rows) => {
                if (err) {
                    console.error(err);
                    reject('An error occurred while fetching the data.');
                } else {
                    resolve(rows);
                }
            });
        });

        if (!rows.length) {
            return interaction.reply('No data found for generating the heatmap.');
        }

        // Get the start timestamps for the active users
        startTimestamps = await getGuildStartTimestamps(db, guildId, startStat);
        rowsData = rows;
    }
    else {
        const target = interaction.options.getMember('target');
        const userId = target?.user.id ?? interaction.user.id;
        htmlProps.userName = target?.displayName ?? interaction.member.displayName;
        htmlProps.userAvatar = target?.user.avatarURL() ?? interaction.user.avatarURL();

        // Get the daily_stats heatmap data for the user
        const rows = await new Promise((resolve, reject) => {
            db.all(`
        SELECT day_timestamp, time_connected, ${stat} FROM daily_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], (err, rows) => {
                if (err) {
                    console.error(err);
                    reject('An error occurred while fetching the data.');
                } else {
                    resolve(rows);
                }
            });
        });

        if (!rows.length) {
            return interaction.reply('No data found for generating the heatmap.');
        }

        // Get the start timestamps for the user
        const startTimestamp = await getStartTimestamps(db, guildId, userId);
        startTimestamps.push(startTimestamp);
        rowsData = rows;
    }

    // Close the database connection
    db.close();

    // Calculate the live data for all users
    let liveData = new Map();
    const now = Date.now();
    startTimestamps.forEach(row => {
        // Calculate the live data for the user
        const statDuration = row[startStat] === 0 ? 0 : now - row[startStat];
        const connectedDuration = row.start_connected === 0 ? 0 : now - row.start_connected;
        const data = getLiveDurationPerDay(statDuration, now, connectedDuration);

        // Merge the user live data with the live data from the other users
        data.map.forEach((value, key) => {
            if (liveData.has(key)) {
                const duration = liveData.get(key).duration + value.duration;
                const durationConnected = liveData.get(key).durationConnected + value.durationConnected;
                liveData.set(key, {duration: duration, durationConnected: durationConnected});
            } else {
                liveData.set(key, value);
            }
        });
    });

    // Convert rows into a format that cal-heatmap can consume
    htmlProps.data = formatHeatmapData(rowsData, liveData, htmlProps.heatmapStat, htmlProps.isGuildFormat);

    // Generate the heatmap
    if (format === 'html') {
        const html = getHtml(htmlProps);
        const attachment = new AttachmentBuilder(Buffer.from(html), { name: getFileName('html', stat) });
        await interaction.reply({ files: [attachment] });
    }
    else {
        await interaction.deferReply();
        const imagePath = await getPNGHeatmap(htmlProps);
        const attachment = new AttachmentBuilder(imagePath);
        await interaction.editReply({ files: [attachment] });
    }
}

function formatHeatmapData(rows, liveData, stat, isGuildFormat) {
    let max_time_connected = -1;
    const heatmapData = [];
    const isGuilFormatAndTimeConnected = isGuildFormat && stat === 'time_connected';

    // Update the rows with the live data
    rows.forEach(row => {

        // Check if there is live data for the current timestamp
        if (liveData.get(row.day_timestamp)) {
            if (stat !== 'time_connected') {
                row.time_connected += liveData.get(row.day_timestamp).durationConnected;
            }
            row[stat] += liveData.get(row.day_timestamp).duration;
            liveData.delete(row.day_timestamp);
        }

        // Calculate the max time connected for the guild heatmap
        if (isGuilFormatAndTimeConnected && row.time_connected > max_time_connected) {
            max_time_connected = row.time_connected;
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
    rows.forEach(row => {

        let value = 0;
        let valueBis = 0;

        // Calculate the value as a percentage of the max time connected, tooltip display the value as time in minutes
        if (isGuilFormatAndTimeConnected) {
            value = durationAsPercentage(row[stat], max_time_connected);
            valueBis = msToMinutes(row[stat]);
        }
        // Display the value as time in minutes
        else if (stat === 'time_connected') {
            value = msToMinutes(row[stat]);
        }
        // Calculate the value as a percentage of the time connected, tooltip display the value as time in minutes
        else {
            value = durationAsPercentage(row[stat], row.time_connected);
            valueBis = msToMinutes(row[stat]);
        }

        heatmapData.push({ date: tsToYYYYMMDD(row.day_timestamp), value: value, valueBis: valueBis });
    });

    // Convert the remaining live data into a format that cal-heatmap can consume
    liveData.forEach((data, key) => {

        let value = 0;
        let valueBis = 0;

        // Calculate the value as a percentage of the max time connected, tooltip display the value as time in minutes
        if (isGuilFormatAndTimeConnected) {
            value = durationAsPercentage(data.duration, max_time_connected);
            valueBis = msToMinutes(data.duration);
        }
        // Display the value as time in minutes
        else if (stat === 'time_connected') {
            value = msToMinutes(data.duration);
        }
        // Calculate the value as a percentage of the time connected, tooltip display the value as time in minutes
        else {
            value = durationAsPercentage(data.duration, data.durationConnected);
            valueBis = msToMinutes(data.duration);
        }

        heatmapData.push({ date: tsToYYYYMMDD(key), value: value, valueBis: valueBis });
    });

    return heatmapData
}

function getFileName(extension, stat) {
    return `heatmap_${stat}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.${extension}`;
}

async function getPNGHeatmap(htmlProps) {

    const imagePath = getFileName('png', htmlProps.heatmapStat);

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
    await page.setContent(getHtml(htmlProps));

    // Wait for the cal-heatmap element to be painted
    await page.evaluate(() => {
        return new Promise((resolve) => {
            document.addEventListener('heatmapRendered', resolve, { once: true });
        });
    });

    // Take a screenshot of the page
    await page.screenshot({ path: imagePath });
    await browser.close();

    return imagePath;
}

function getHtml(htmlProps) {

    let heatmapLegend = "";
    switch (htmlProps.heatmapStat) {
        case "time_connected":
            heatmapLegend = "Time connected (hours)";
            break;
        case "time_muted":
            heatmapLegend = "Time muted (%)";
            break;
        case "time_deafened":
            heatmapLegend = "Time deafened (%)";
            break;
        case "time_screen_sharing":
            heatmapLegend = "Time screen sharing (%)";
            break;
        case "time_camera":
            heatmapLegend = "Time camera (%)";
            break;
    }

    let userHtml = "";
    let guildHtml = "";

    // Check if the user has an icon and name
    if (!htmlProps.isGuildFormat) {
        userHtml = `
            <div class="org-container">
                <img src="` + htmlProps.userAvatar + `">` + htmlProps.userName + `
            </div>
            `
    } else if (htmlProps.guildName !== "" && htmlProps.guildIcon !== "") {
        // No user means it's a guild heatmap => replace user part with guild part
        userHtml = `
            <div class="org-container">
                <img src="` + htmlProps.guildIcon + `">` + htmlProps.guildName + `
            </div>
            `
    }

    // Check if it's not a guild command and if the guild has an icon and name
    if (!htmlProps.isGuildFormat && htmlProps.guildName !== "" && htmlProps.guildIcon !== "") {
        guildHtml = `
            <div class="org-container">
                ` + htmlProps.guildName + `<img src="` + htmlProps.guildIcon + `">
            </div>
            `
    }

    return `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script src="https://d3js.org/d3.v7.min.js"></script>
                <script src="https://d3js.org/d3.v6.min.js"></script>
                <script src="https://unpkg.com/cal-heatmap/dist/cal-heatmap.min.js"></script>
    
                <script src="https://unpkg.com/@popperjs/core@2/dist/umd/popper.min.js"></script>
    
                <script src="https://unpkg.com/cal-heatmap/dist/cal-heatmap.min.js"></script>
                <script src="https://unpkg.com/cal-heatmap/dist/plugins/Tooltip.js"></script>
                <script src="https://unpkg.com/cal-heatmap/dist/plugins/LegendLite.js"></script>
                <script src="https://unpkg.com/cal-heatmap/dist/plugins/CalendarLabel.js"></script>
    
                <link rel="stylesheet" href="https://unpkg.com/cal-heatmap/dist/cal-heatmap.css">
                
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
                        color: #f0f6fc;
                        background-color: #0d1117;
                    }
                    .main {
                        max-width: 750px;
                    }
                    .org-header {
                        display: flex;
                        justify-content: space-between;
                    }
                    .org-container {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                    }
                    img {
                        width: 25px;
                        height: 25px;
                        border-radius: 50%;
                    }
                    #cal-heatmap {
                        width: 100%;
                    }
                    .legend-header {
                        font-size: 0.6rem;
                        padding-left: 2rem;
                        padding-top: 0.5rem;
                        color: #9198a1;
                        display: flex;
                        justify-content: space-between;
                    }
                    .legend-items {
                        display:flex;
                        float:right;
                        align-items: center;
                    }
                </style>
            </head>
            <body>
                 <div class="main">
                    <div class="org-header">` + userHtml + guildHtml + `</div>
                    <div id="cal-heatmap"></div>
                    <div class="legend-header">
                        <div>` + heatmapLegend + `</div>
                        <div class="legend">
                            <span>Less</span>
                            <div id="ex-ghDay-legend" style="display: inline-block; margin: 0 4px;"></div>
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </body>
            <script>
                // Create the heatmap
                const cal = new CalHeatmap();
                let data = ` + JSON.stringify(htmlProps.data) + `;
        
                // Define the date range for the heatmap
                const today = new Date();
                const calStart = new Date();
                calStart.setDate(today.getDate() - (51 * 7)); // Go back 51 weeks
                while (calStart.getDay() !== 0) {  // Ensure it's a Sunday
                    calStart.setDate(calStart.getDate() - 1);
                }
        
                function getStartDate(date, dateHelper) {
                    const firstOfMonth = dateHelper.date(date);
                    return firstOfMonth.isBefore(calStart) ? calStart : firstOfMonth.toDate();
                }
                function getEndDate(date, dateHelper) {
                    const endOfMonth = dateHelper.date(new Date(date.getFullYear(), date.getMonth() + 1, 0));
                    return endOfMonth.isAfter(today) ? today : endOfMonth;
                }
                
                function getHeatmapScale(stat, isGuildFormat) {
                    // Dynamic color scale based on the max time spent connected
                    if (isGuildFormat && stat === "time_connected") {
                        return {
                            color: {
                                type: 'threshold',
                                range: ['#161b22', '#0E4429', '#006d32', '#26a641', '#39d353'],
                                domain: [1, 25, 50, 75],
                            }
                        };
                    }
                    // Scale of 24 hours for time_connected spent daily by a user
                    if (stat === "time_connected") {
                        return {
                            color: {
                                type: 'threshold',
                                range: ['#161b22', '#0E4429', '#196834', '#248C3E', '#2EAF49', '#39D353', '#FFFF00', '#FFCC00', '#FF3300'],
                                domain: [1, 60, 3*60, 6*60, 9*60, 12*60, 16*60, 20*60, 24*60],
                            }
                        };
                    }
                    // Scale of 100% for other stats (based on time_connected)
                    return {
                        color: {
                            type: 'threshold',
                            range: ['#161b22', '#0E4429', '#006d32', '#26a641', '#39d353'],
                            domain: [1, 10, 25, 50],
                        }
                    }
                }
        
                // Define the template for the yearly round heatmap
                let YearlyRoundTemplate = (dateHelper, { domain }) => ({
                    name: 'yr',
                    allowedDomainType: ['month'],
                    rowsCount() {
                        return 7;  // Always 7 rows (representing the days of the week)
                    },
                    columnsCount(d) {
                        const startDate = getStartDate(d, dateHelper);
                        const endDate = getEndDate(startDate, dateHelper);
        
                        const start = dateHelper.date(startDate).startOf('week');
                        if (endDate === today) {
                            const end = dateHelper.date(endDate);
                            return end.diff(start, 'week') + 1;
                        }
        
                        const end = dateHelper.date(endDate).startOf('week');
                        return end.diff(start, 'week');
                    },
                    mapping: (startDate, endDate, defaultValues) => {
                        const start = getStartDate(startDate, dateHelper);
                        const end = getEndDate(start, dateHelper);
        
                        const clampStart = dateHelper.date(start).startOf('week');
        
                        endDate = dateHelper.date(endDate).toDate();
                        const clampEnd = (endDate > today) ? end : dateHelper.getFirstWeekOfMonth(endDate);
        
                        let x = -1;
                        const pivotDay = clampStart.weekday();
        
                        return dateHelper.intervals('day', clampStart, clampEnd, false).map((ts) => {
                            const weekday = dateHelper.date(ts).weekday();
                            if (weekday === pivotDay) {
                                x += 1;
                            }
                            return {
                                t: ts,
                                x,
                                y: weekday,
                            };
                        });
                    },
                    format: {
                        date: 'Do',  // Day format: "1st, 2nd, 3rd"
                        legend: 'Do',  // Legend format: "1st, 2nd, 3rd"
                    },
                    extractUnit(d) {
                        return dateHelper.date(d).startOf('day').valueOf();  // Return the timestamp of the day
                    }
                });
                cal.addTemplates(YearlyRoundTemplate);
        
                const plugins = [
                    [
                        Tooltip,
                        {
                            text: function (date, value, dayjsDate, stat = "` + htmlProps.heatmapStat + `", isGuildHeatmap = ` + htmlProps.isGuildFormat + `) {
                                
                                // Display the stat as a percentage of the time_connected stat
                                if (!isGuildHeatmap && stat === "time_connected") {
                                    return (
                                        (value ? ("" + Math.floor(value / 60) + "h" + value % 60) : "No time spent") +
                                        " on " +
                                        dayjsDate.format("dddd, MMMM D, YYYY")
                                    );
                                }
                                
                                // Find the data point for the current date
                                const dataPoint = data.find(d => d.date === new Date(date).toISOString().split('T')[0]);
                                const valueBis = dataPoint ? dataPoint.valueBis : 0;
                                
                                // Display the stat as time in minutes
                                if (isGuildHeatmap && stat === "time_connected") {
                                    return (
                                        (valueBis ? (Math.floor(valueBis / 60) + "h" + valueBis % 60) : "No time spent") +
                                        " on " +
                                        dayjsDate.format("dddd, MMMM D, YYYY")
                                    );
                                }
                                
                                // Display the stat as a percentage of the time connected (+ time in minutes)
                                return (
                                    (value ? value.toFixed(2) : "No time spent") +
                                    "%" +
                                    (valueBis ? (" (" + Math.floor(valueBis / 60) + "h" + valueBis % 60 + ")") : "") +
                                    " on " +
                                    dayjsDate.format("dddd, MMMM D, YYYY")
                                );
                            },
                        }
                    ],
                    [
                        LegendLite,
                        {
                            includeBlank: false,
                            itemSelector: "#ex-ghDay-legend",
                            radius: 2,
                            width: 11,
                            height: 11,
                            gutter: 4
                        }
                    ],
                    [
                        CalendarLabel,
                        {
                            width: 30,
                            textAlign: "start",
                            text: () => dayjs.weekdaysShort().map((d, i) => (i % 2 == 0 ? "" : d)),
                            padding: [25, 0, 0, 0]
                        }
                    ]
                ];
                
                cal.paint(
                    {
                        data: {
                            source: data,
                            x: 'date',
                            y: 'value',
                            defaultValue: 0,
                        },
                        date: { start: calStart },
                        theme: "dark",
                        scale: getHeatmapScale("` + htmlProps.heatmapStat + `", ` + htmlProps.isGuildFormat + `),
                        range: 13,
                        domain: {
                            type: "month",
                            gutter: 4,
                            label: { text: "MMM", textAlign: "start", position: "top" },
                            sort: 'asc',
                        },
                        subDomain: { type: "yr", radius: 2, width: 11, height: 11, gutter: 4 },
                        itemSelector: "#cal-heatmap"
                    }, plugins
                ).then(() => {
                    document.dispatchEvent(new Event('heatmapRendered'));
                });
            </script>
        </html>
    `
}