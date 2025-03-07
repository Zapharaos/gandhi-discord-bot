import { SlashCommandBuilder } from 'discord.js';
import puppeteer from 'puppeteer';
import { connect } from '../../utils/sqlite.js';
import { AttachmentBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('heatmap')
    .setDescription('Generates a calendar heatmap of time spent connected per day')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The user to get heatmap for')
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

    const target = interaction.options.getMember('target');
    const userId = target?.user.id ?? interaction.user.id;
    const userName = target?.displayName ?? interaction.user.displayName;
    const userAvatar = interaction.user.avatarURL();

    const stat = interaction.options.getString('stat') || 'time_connected';
    const format = interaction.options.getString('format') || 'png';

    // Connect to the database
    const db = connect();

    db.all(`
        SELECT day_timestamp, time_connected, ${stat} FROM daily_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], async (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching the data.');
        }

        if (!rows.length) {
            return interaction.reply('No data found for generating the heatmap.');
        }

        // Convert rows into a format that cal-heatmap can consume
        const data = formatHeatmapData(rows, stat);
        console.log(data);

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

        // Close the database connection
        db.close();
    });
}

function formatHeatmapData(rows, stat) {
    // Convert rows into a format that cal-heatmap can consume
    const heatmapData = [];

    // Assuming 'rows' is an array of objects with timestamp and value fields
    rows.forEach(row => {
        const timestamp = new Date(row.day_timestamp).toISOString().split('T')[0];  // Convert to YYYY-MM-DD format
        let value = 0;

        // Normalize the value based on the maximum value for the stat
        if (stat !== 'time_connected') {
            const max = row.time_connected;
            value = max === 0 ? 0 : row[stat] * 100 / max;  // Calculate percentage
        } else {
            value = Math.round(row[stat] / 1000 / 60);  // Convert milliseconds to minutes
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
                    <div class="org-header">
                        <div class="org-container">
                            <img src="` + userIcon + `">` + userName + `
                        </div>
                        <div class="org-container">
                            ` + guildName + `<img src="` + guildIcon + `">
                        </div>
                    </div>
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
                
                function getHeatmapScale(stat) {
                    if (stat === "time_connected") {
                        return {
                            color: {
                                type: 'threshold',
                                range: ['#161b22', '#0E4429', '#196834', '#248C3E', '#2EAF49', '#39D353', '#FFFF00', '#FFCC00', '#FF3300'],
                                domain: [1, 60, 3*60, 6*60, 9*60, 12*60, 16*60, 20*60, 24*60],
                            }
                        };
                    }
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
                            text: function (date, value, dayjsDate) {
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
                        scale: getHeatmapScale("` + stat + `"),
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