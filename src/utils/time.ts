export class TimeUtils {

    static MsInSecond = 1000;
    static SecondsInMinute = 60;
    static MinutesInHour = 60;
    static HoursInDay = 24;
    static DaysInWeek = 7;
    static WeeksInMonth = 4.345;
    static MonthsInYear = 12;

    /**
     * Rounds a timestamp down to the nearest day.
     * @param ts - The timestamp to round down. If not provided, the current time is used.
     * @returns {number} The rounded timestamp.
     */
    static tsRoundDownToDay(ts?: number): number {
        const date = ts ? new Date(ts) : new Date();
        return date.setUTCHours(0, 0, 0, 0);
    }

    /**
     * Converts a timestamp to a string in the format YYYY-MM-DD.
     *
     * @param {number} ts - The timestamp to convert.
     * @returns {string} The formatted date string.
     */
    static tsToYYYYMMDD(ts: number): string {
        return new Date(ts).toISOString().split('T')[0];
    }

    /**
     * Calculates the duration between two timestamps.
     *
     * @param {number} start - The start timestamp.
     * @param {number} end - The end timestamp.
     * @returns {number} The duration between the two timestamps.
     */
    static getDuration(start: number, end: number): number {
        return start === 0 ? 0 : end - start;
    }

    /**
     * Converts a duration from milliseconds to minutes.
     *
     * @param {number} ms - The duration in milliseconds.
     * @returns {number} The duration in minutes.
     */
    static msToMinutes(ms: number): number {
        return Math.round(ms / this.MsInSecond / this.SecondsInMinute);
    }

    /**
     * Converts a duration from milliseconds to days.
     *
     * @param {number} ms - The duration in milliseconds.
     * @returns {number} The duration in days.
     */
    static msToDays(ms: number): number {
        return Math.round(ms / this.MsInSecond / this.SecondsInMinute / this.MinutesInHour / this.HoursInDay);
    }

    /**
     * Calculates the percentage of a duration relative to a total duration.
     *
     * @param {number} duration - The duration to calculate the percentage for.
     * @param {number} totalDuration - The total duration to compare against.
     * @returns {number} The percentage of the duration relative to the total duration.
     */
    static durationAsPercentage(duration: number, totalDuration: number): number {
        return duration * 100 / totalDuration;
    }

    /**
     * Formats a duration given in milliseconds into a human-readable string.
     *
     * @param {number} ms - The duration in milliseconds.
     * @returns {string} The formatted duration string.
     */
    static formatDuration(ms: number): string {
        // If the duration is non-existent => zeros
        if (!ms || ms === 0) {
            return `${this.pad(0)}s`;
        }

        // If the duration is less than a minute => seconds.milliseconds
        if (ms < this.MsInSecond * this.SecondsInMinute) {
            return `${(ms / this.MsInSecond).toFixed(3)}s`;
        }

        // Calculate the duration in seconds, minutes, hours, days, weeks, months, and years
        const seconds = Math.floor(ms / this.MsInSecond);
        const minutes = Math.floor(seconds / this.SecondsInMinute);
        const hours = Math.floor(minutes / this.MinutesInHour);
        const days = Math.floor(hours / this.HoursInDay);
        const weeks = Math.floor(days / this.DaysInWeek);
        const months = Math.floor(weeks / this.WeeksInMonth);
        const years = Math.floor(months / this.MonthsInYear);

        let s, mi, h, d, w, mo, y;

        // Format the durations into strings
        if (seconds > 0) {
            s = `${this.pad(seconds)}s`;
        }
        if (minutes > 0) {
            s = `${this.pad(seconds % this.SecondsInMinute)}s`;
            mi = `${this.pad(minutes)}m`;
        }
        if (hours > 0) {
            mi = `${this.pad(minutes % this.MinutesInHour)}m`;
            h = `${this.pad(hours)}h`;
        }
        if (days > 0) {
            h = `${this.pad(hours % this.HoursInDay)}h`;
            d = `${this.pad(days)}d`;
        }
        if (weeks > 0) {
            d = `${this.pad(days % this.DaysInWeek)}d`;
            w = `${this.pad(weeks)}w`;
        }
        if (months > 0) {
            w = `${this.pad(weeks % this.WeeksInMonth)}w`;
            mo = `${this.pad(months)}m`;
        }
        if (years > 0) {
            mo = `${this.pad(months % this.MonthsInYear)}m`;
            y = `${this.pad(years)}y`;
        }

        // Combine the formatted durations into a single string
        let duration = '';
        if (y) duration += `${y} `;
        if (mo) duration += `${mo} `;
        if (w) duration += `${w} `;
        if (d) duration += `${d} `;
        if (h) duration += `${h} `;
        if (mi) duration += `${mi} `;
        if (s) duration += `${s}`;

        return duration;
    }

    /**
     * Formats a Date object into a human-readable string in the format DD/MM/YYYY, HHhMMmSSs.
     *
     * @param {Date} date - The date to format.
     * @returns {string} The formatted date string.
     */
    static formatDate(date: Date): string {
        // Get day, month, year, hours, minutes, and seconds
        const day = this.pad(date.getDate());  // Ensure 2 digits for the day
        const month = this.pad(date.getMonth() + 1);  // Months are 0-indexed, so add 1
        const year = date.getFullYear();
        const hours = this.pad(date.getHours());  // Ensure 2 digits for hours
        const minutes = this.pad(date.getMinutes());  // Ensure 2 digits for minutes
        const seconds = this.pad(date.getSeconds());  // Ensure 2 digits for seconds

        // Combine all into the desired format
        return `${day}/${month}/${year}, ${hours}h${minutes}m${seconds}s`;
    }

    private static pad = (num: number) => String(num).padStart(2, '0');
}

