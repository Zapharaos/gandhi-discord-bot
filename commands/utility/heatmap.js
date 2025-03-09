import { SlashCommandBuilder } from 'discord.js';
import puppeteer from 'puppeteer';
import {
    connect,
    getGuildStartTimestamps,
    getLiveDurationPerDay,
    getStartTimestamps
} from '../../utils/sqlite.js';
import { AttachmentBuilder } from 'discord.js';

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
    const guildId = interaction.guild.id;
    const guildName = interaction.guild.name;
    const guildIcon = interaction.guild.iconURL();

    const stat = interaction.options.getString('stat') || 'time_connected';
    const format = interaction.options.getString('format') || 'png';

    // Connect to the database
    const db = connect();
    const startStat = stat.replace('time_', 'start_');

    // Heatmap data
    let rowsData = [];
    let startTimestamps = [];
    let userName = "";
    let userAvatar = "";

    // Check if the heatmap should be generated for all users
    if (interaction.options.getBoolean('target-all')) {

        // TODO : calculate heatmap legend

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
    } else
    {
        const target = interaction.options.getMember('target');
        const userId = target?.user.id ?? interaction.user.id;
        userName = target?.displayName ?? interaction.member.displayName;
        userAvatar = target?.user.avatarURL() ?? interaction.user.avatarURL();

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

    console.log('rowsData', rowsData);
    console.log('startTimestamps', startTimestamps);

    // Calculate the live data for all users
    let liveData = new Map();
    const now = Date.now();
    startTimestamps.forEach(row => {
        // Calculate the live data for the user
        const statDuration = row[startStat] === 0 ? 0 : now - row[startStat];
        const connectedDuration = row.start_connected === 0 ? 0 : now - row.start_connected;
        const data = getLiveDurationPerDay(statDuration, now, connectedDuration);

        console.log('getLiveDurationPerDay data', data.map);

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

    console.log('liveData', liveData);

    // Convert rows into a format that cal-heatmap can consume
    const data = formatHeatmapData(rowsData, liveData, stat);

    console.log('data', data);

    if (format === 'html') {
        const html = getHtml(data, stat, userAvatar, userName, guildIcon, guildName);
        const attachment = new AttachmentBuilder(Buffer.from(html), { name: getFileName('html', stat) });
        await interaction.reply({ files: [attachment] });
    } else {
        await interaction.deferReply();
        const imagePath = await getPNGHeatmap(data, stat, userAvatar, userName, guildIcon, guildName);
        const attachment = new AttachmentBuilder(imagePath);
        await interaction.editReply({ files: [attachment] });
    }
}

function formatHeatmapData(rows, liveData, stat) {
    // Convert rows into a format that cal-heatmap can consume
    const heatmapData = [];

    // Assuming 'rows' is an array of objects with timestamp and value fields
    rows.forEach(row => {
        const timestamp = new Date(row.day_timestamp).toISOString().split('T')[0];  // Convert to YYYY-MM-DD format
        let value = 0;

        console.log('row before', row);

        // Check if there is live data for the current timestamp
        if (liveData.get(row.day_timestamp)) {
            // row[stat] += liveData.get(row.day_timestamp);
            if (stat !== 'time_connected') {
                row.time_connected += liveData.get(row.day_timestamp).durationConnected;
            }
            row[stat] += liveData.get(row.day_timestamp).duration;
            liveData.delete(row.day_timestamp);
        }

        console.log('row after', row);

        // Normalize the value based on the maximum value for the stat
        if (stat !== 'time_connected') {
            const max = row.time_connected;
            value = max === 0 ? 0 : row[stat] * 100 / max;  // Calculate percentage
        } else {
            value = Math.round(row[stat] / 1000 / 60);  // Convert milliseconds to minutes
        }

        console.log('value', value);

        heatmapData.push({ date: timestamp, value: value });
    });

    console.log('remaining liveData', liveData);

    liveData.forEach((data, key) => {
        const timestamp = new Date(key).toISOString().split('T')[0];  // Convert to YYYY-MM-DD format
        let value = 0;

        // Normalize the value based on the maximum value for the stat
        if (stat !== 'time_connected') {
            const max = data.durationConnected;  // Assuming the max value is the value itself for remaining live data
            value = max === 0 ? 0 : data.duration * 100 / max;  // Calculate percentage
        } else {
            value = Math.round(data.duration / 1000 / 60);  // Convert milliseconds to minutes
        }

        heatmapData.push({ date: timestamp, value: value });
    });

    return heatmapData
}

function getFileName(extension, stat) {
    return `heatmap_${stat}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.${extension}`;
}

async function getPNGHeatmap(data, stat, userIcon, userName, guildIcon, guildName) {

    const imagePath = getFileName('png', stat);

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
    await page.setContent(getHtml(data, stat, userIcon, userName, guildIcon, guildName));

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

function getHtml(data, stat, userIcon, userName, guildIcon, guildName) {

    let heatmapLegend = "";
    switch (stat) {
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
    let isGuildHeatmap = userName === "" && userIcon=== "";

    // Check if the user has an icon and name
    if (!isGuildHeatmap) {
        userHtml = `
            <div class="org-container">
                <img src="` + userIcon + `">` + userName + `
            </div>
            `
    } else if (guildName !== "" && guildIcon !== "") {
        // No user means it's a guild heatmap => replace user part with guild part
        userHtml = `
            <div class="org-container">
                <img src="` + guildIcon + `">` + guildName + `
            </div>
            `
    }

    // Check if it's not a guild command and if the guild has an icon and name
    if (!isGuildHeatmap && guildName !== "" && guildIcon !== "") {
        guildHtml = `
            <div class="org-container">
                ` + guildName + `<img src="` + guildIcon + `">
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
                
                function getHeatmapScale(stat, isGuildHeatmap) {
                    // Dynamic color scale based on the max time spent connected
                    if (isGuildHeatmap && stat === "time_connected") {
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
                            text: function (date, value, dayjsDate, stat = "` + stat + `", isGuildHeatmap = ` + isGuildHeatmap + `) {
                                if (isGuildHeatmap && stat === "time_connected") {
                                    // TODO : value is percetange, display as time
                                    return (
                                        (value ? ("" + Math.floor(value / 60) + "h" + value % 60) : "No time spent") +
                                        " on " +
                                        dayjsDate.format("dddd, MMMM D, YYYY")
                                    );
                                }
                                
                                // Display the stat as a percentage of the time_connected stat
                                if (stat !== "time_connected") {
                                    // TODO : value is percentage, display as percentage and time
                                    return (
                                        value.toFixed(2) + "%" +
                                        " on " +
                                        dayjsDate.format("dddd, MMMM D, YYYY")
                                    );
                                }
                                
                                return (
                                    (value ? ("" + Math.floor(value / 60) + "h" + value % 60) : "No time spent") +
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
                
                // TODO : not time_connected => value = % ===> need to display time as well
                // TODO : guild connected => value = % ===> need to display time as well + calculate the percentage of max time_connected
                
                cal.paint(
                    {
                        data: {
                            source: ` + JSON.stringify(data) + `,
                            x: 'date',
                            y: 'value',
                            defaultValue: 0,
                        },
                        date: { start: calStart },
                        theme: "dark",
                        scale: getHeatmapScale("` + stat + `", ` + isGuildHeatmap + `),
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