export class TimeUtils {

    static MsInSecond = 1000;
    static SecondsInMinute = 60;
    static MinutesInHour = 60;
    static HoursInDay = 24;

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
        if (!ms || ms === 0) return `${this.pad(0)}s`;

        const units = [
            { label: 'y',   ms: this.MsInSecond * this.SecondsInMinute * this.MinutesInHour * this.HoursInDay * 365 },
            { label: 'mo',  ms: this.MsInSecond * this.SecondsInMinute * this.MinutesInHour * this.HoursInDay * 30 },
            { label: 'w',   ms: this.MsInSecond * this.SecondsInMinute * this.MinutesInHour * this.HoursInDay * 7 },
            { label: 'd',   ms: this.MsInSecond * this.SecondsInMinute * this.MinutesInHour * this.HoursInDay },
            { label: 'h',   ms: this.MsInSecond * this.SecondsInMinute * this.MinutesInHour },
            { label: 'm',   ms: this.MsInSecond * this.SecondsInMinute },
            { label: 's',   ms: this.MsInSecond },
        ];

        let remaining = ms;
        const parts: string[] = [];
        let started = false;
        let forceNext = false;

        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            const value = Math.floor(remaining / unit.ms);
            remaining -= value * unit.ms;

            if (value > 0 || started) {
                parts.push(`${this.pad(value)}${unit.label}`);
                started = true;
                // If this is the first non-zero, force the next unit to display even if zero
                forceNext = value > 0 && i < units.length - 1;
            } else if (forceNext) {
                parts.push(`${this.pad(0)}${unit.label}`);
                forceNext = false;
                started = true;
            }
        }

        // For durations less than 1 second, show as fractional seconds
        if (parts.length === 0 && ms > 0) {
            return `${(ms / this.MsInSecond).toFixed(3)}s`;
        }

        return parts.join(' ');
    }

    /**
     * Formats a Date object into a human-readable string in the format DD/MM/YYYY, HHhMMmSSs.
     *
     * @param {Date} date - The date to format.
     * @returns {string} The formatted date string.
     */
    static formatDate(date: Date): string {
        // Rendered in UTC to stay consistent with the UTC-based day bucketing,
        // regardless of the host timezone.
        const day = this.pad(date.getUTCDate());  // Ensure 2 digits for the day
        const month = this.pad(date.getUTCMonth() + 1);  // Months are 0-indexed, so add 1
        const year = date.getUTCFullYear();
        const hours = this.pad(date.getUTCHours());  // Ensure 2 digits for hours
        const minutes = this.pad(date.getUTCMinutes());  // Ensure 2 digits for minutes
        const seconds = this.pad(date.getUTCSeconds());  // Ensure 2 digits for seconds

        // Combine all into the desired format
        return `${day}/${month}/${year}, ${hours}h${minutes}m${seconds}s`;
    }

    static getDaysDifference(start: number | undefined, end: number | undefined): number {
        const startDate = TimeUtils.tsRoundDownToDay(start);
        const endDate = TimeUtils.tsRoundDownToDay(end);
        return TimeUtils.msToDays(TimeUtils.getDuration(startDate, endDate));
    }

    private static pad = (num: number) => String(num).padStart(2, '0');
}

