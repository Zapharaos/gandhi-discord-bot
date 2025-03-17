export type HeatmapData = {
    date: string,
    value: number,
    valueBis: number
}

export class Heatmap {
    private data: HeatmapData[];
    private stat: string;
    private userName: string;
    private userAvatar: string;
    private guildName?: string;
    private guildIcon?: string;
    private isTargetAll: boolean;

    public getData(): HeatmapData[] {
        return this.data;
    }

    public setData(data: HeatmapData[]): void {
        this.data = data;
    }

    public getStat(): string {
        return this.stat;
    }

    public setStat(stat: string): void {
        this.stat = stat;
    }

    public getUserName(): string {
        return this.userName;
    }

    public setUserName(userName: string): void {
        this.userName = userName;
    }

    public getUserAvatar(): string {
        return this.userAvatar;
    }

    public setUserAvatar(userAvatar: string): void {
        this.userAvatar = userAvatar;
    }

    public getGuildName(): string | undefined {
        return this.guildName;
    }

    public setGuildName(guildName?: string): void {
        this.guildName = guildName;
    }

    public getGuildIcon(): string | undefined {
        return this.guildIcon;
    }

    public setGuildIcon(guildIcon?: string): void {
        this.guildIcon = guildIcon;
    }

    public getIsTargetAll(): boolean {
        return this.isTargetAll;
    }

    public setIsTargetAll(isTargetAll: boolean): void {
        this.isTargetAll = isTargetAll;
    }

    public getFileName(extension: string): string {
        return `heatmap_${this.stat}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.${extension}`;
    }

    public getHtml(): string {

        let heatmapLegend = this.getLegend();

        // Html header icons and names
        let userHtml = "", guildHtml = "";
        this.buildHeader(userHtml, guildHtml);

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
                let data = ` + JSON.stringify(this.data) + `;
        
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
                            text: function (date, value, dayjsDate, stat = "` + this.stat + `", isGuildHeatmap = ` + this.isTargetAll + `) {
                                
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
                        scale: getHeatmapScale("` + this.stat + `", ` + this.isTargetAll + `),
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

    private getLegend(): string {
        switch (this.stat) {
            case "time_connected":
                return "Time connected (hours)";
            case "time_muted":
                return "Time muted (%)";
            case "time_deafened":
                return "Time deafened (%)";
            case "time_screen_sharing":
                return "Time screen sharing (%)";
            case "time_camera":
                return "Time camera (%)";
            default:
                return "Unknown";
        }
    }

    private buildHeader(userHtml: string, guildHtml: string): void {
        // Check if the user has an icon and name
        if (!this.isTargetAll) {
            userHtml = `
            <div class="org-container">
                <img src="` + this.userAvatar + `">` + this.userName + `
            </div>
            `
        }
        else if (this.guildName !== "" && this.guildIcon !== "") {
            // No user means it's a guild heatmap => replace user part with guild part
            userHtml = `
            <div class="org-container">
                <img src="` + this.guildIcon + `">` + this.guildName + `
            </div>
            `
        }

        // Check if it's not a guild command and if the guild has an icon and name
        if (!this.isTargetAll && this.guildName !== "" && this.guildIcon !== "") {
            guildHtml = `
            <div class="org-container">
                ` + this.guildName + `<img src="` + this.guildIcon + `">
            </div>
            `
        }
    }
}