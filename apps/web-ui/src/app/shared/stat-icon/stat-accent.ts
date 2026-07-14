import { CardStat } from '@core/api/models';

// Per-domain accent for a stat's icon tile, echoing the landing's neon palette.
// Full class strings are kept as literals so Tailwind's content scan generates them.
const TILE: Record<CardStat, string> = {
  time_connected: 'bg-primary-500/15 text-primary-400',
  count_switch: 'bg-primary-500/15 text-primary-400',
  daily_streak: 'bg-neon-green/15 text-neon-green',
  time_screen_sharing: 'bg-neon-cyan/15 text-neon-cyan',
  time_camera: 'bg-neon-cyan/15 text-neon-cyan',
  time_muted: 'bg-neon-pink/15 text-neon-pink',
  time_deafened: 'bg-neon-pink/15 text-neon-pink',
};

const DEFAULT_TILE = 'bg-primary-500/15 text-primary-400';

/** Tailwind classes (bg + text) for a stat's accent icon tile. */
export function statAccentTile(stat: CardStat): string {
  return TILE[stat] ?? DEFAULT_TILE;
}
