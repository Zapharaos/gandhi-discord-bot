export { formatDuration, formatDate, msToMinutes, durationAsPercentage, tsToYYYYMMDD };

/**
 * Formats a duration given in milliseconds into a human-readable string.
 *
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} The formatted duration string.
 */
function formatDuration(ms: number): string {
    if (ms < 1000*60) return `${(ms / 1000).toFixed(3)}s`;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(weeks / 4.345);
    const years = Math.floor(months / 12);

    if (years > 0) return `${years}y:${months % 12}m:${weeks % 4.345}w:${days % 7}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (months > 0) return `${months}m:${weeks % 4.345}w:${days % 7}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (weeks > 0) return `${weeks}w:${days % 7}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (days > 0) return `${days}d:${hours % 24}h:${minutes % 60}m:${seconds % 60}s`;
    if (hours > 0) return `${hours}h:${minutes % 60}m:${seconds % 60}s`;
    return `${minutes}m:${seconds % 60}s`;
}

/**
 * Formats a Date object into a human-readable string in the format DD/MM/YYYY, HHhMMmSSs.
 *
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date: Date): string {
    // Get day, month, year, hours, minutes, and seconds
    const day = String(date.getDate()).padStart(2, '0');  // Ensure 2 digits for the day
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Months are 0-indexed, so add 1
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');  // Ensure 2 digits for hours
    const minutes = String(date.getMinutes()).padStart(2, '0');  // Ensure 2 digits for minutes
    const seconds = String(date.getSeconds()).padStart(2, '0');  // Ensure 2 digits for seconds

    // Combine all into the desired format
    return `${day}/${month}/${year}, ${hours}h${minutes}m${seconds}s`;
}

/**
 * Converts a duration from milliseconds to minutes.
 *
 * @param {number} ms - The duration in milliseconds.
 * @returns {number} The duration in minutes.
 */
function msToMinutes(ms: number): number {
    return Math.round(ms / 1000 / 60);
}

/**
 * Calculates the percentage of a duration relative to a total duration.
 *
 * @param {number} duration - The duration to calculate the percentage for.
 * @param {number} totalDuration - The total duration to compare against.
 * @returns {number} The percentage of the duration relative to the total duration.
 */
function durationAsPercentage(duration: number, totalDuration: number): number {
    return duration * 100 / totalDuration;
}

/**
 * Converts a timestamp to a string in the format YYYY-MM-DD.
 *
 * @param {number} ts - The timestamp to convert.
 * @returns {string} The formatted date string.
 */
function tsToYYYYMMDD(ts: number): string {
    return new Date(ts).toISOString().split('T')[0];
}