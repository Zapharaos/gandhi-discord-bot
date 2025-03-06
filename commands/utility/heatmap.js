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
            .setRequired(true)
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
    );

export async function execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const stat = interaction.options.getString('stat') || 'time_connected';

    // Connect to the database
    const db = connect();

    db.all(`
        SELECT day_timestamp, ${stat} FROM daily_stats WHERE guild_id = ? AND user_id = ?
    `, [guildId, userId], async (err, rows) => {
        if (err) {
            console.error(err);
            return interaction.reply('An error occurred while fetching the data.');
        }

        if (!rows.length) {
            return interaction.reply('No data found for generating the heatmap.');
        }

        const imagePath = await generateHeatmap(rows, stat);
        const attachment = new AttachmentBuilder(imagePath);
        await interaction.reply({ files: [attachment] });

        // Close the database connection
        db.close();
    });
}

async function generateHeatmap(rows, stat) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Convert rows into a format that cal-heatmap can consume
    const heatmapData = [];

    // Assuming 'rows' is an array of objects with timestamp and value fields
    rows.forEach(row => {
        const timestamp = new Date(row.day_timestamp).toISOString().split('T')[0];  // Convert to YYYY-MM-DD format
        const minutes = row[stat] / 1000 / 60;  // Convert milliseconds to minutes
        heatmapData.push({ date: timestamp, value: minutes });
    });

    console.log(heatmapData);

    // Log console messages from the page
    page.on('console', (msg) => {
        const args = msg.args();
        args.forEach(async (arg) => {
            const text = await arg.jsonValue();
            console.log('[Puppeteer log]:', text);
        });
    });

    // Set custom viewport (width & height)
    await page.setViewport({ width: 800, height: 150 });

    // Set the content of the page
    await page.setContent(`
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Calendar Heatmap</title>
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
                </style>
            </head>
            <body>
                <div id="cal-heatmap" style="width: 100%;"></div>
            </body>
        </html>
    `);

    // Inject the data into the page
    await page.evaluate((data) => {

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
                    includeBlank: true,
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
                scale: {
                    color: {
                        type: 'threshold',
                        range: ['#161b22', '#0E4429', '#196834', '#248C3E', '#2EAF49', '#39D353'],
                        domain: [1, 3*60, 6*60, 12*60, 18*60],
                    },
                },
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
        );
    }, heatmapData);

    const imagePath = "./heatmap.png";
    await page.screenshot({ path: imagePath });
    await browser.close();

    return imagePath;
}
