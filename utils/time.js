module.exports = { formatDuration };

function formatDuration(ms) {
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