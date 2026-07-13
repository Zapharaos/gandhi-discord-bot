import { Pipe, PipeTransform } from '@angular/core';

/**
 * Format a millisecond duration as a compact human string, e.g. "3d 4h 12m".
 * Mirrors the bot's duration rendering closely enough for the dashboard.
 */
@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    if (!ms || ms <= 0) return '0s';

    // Sub-minute durations show seconds, so brief sessions never read as "0m".
    if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;

    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
    return parts.join(' ');
  }
}
