import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * Gandhi's PrimeNG theme: the Aura base preset with a Discord-blurple primary
 * palette, matching the bot's identity. Aura maps `primary.color` to
 * `{primary.500}` (light) / `{primary.400}` (dark), so overriding the ramp
 * re-themes every primary-colored control across both modes.
 */
export const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef0fb',
      100: '#d9ddf6',
      200: '#b3bbed',
      300: '#8d99e4',
      400: '#6777db',
      500: '#5865f2',
      600: '#4752c4',
      700: '#363f96',
      800: '#252c69',
      900: '#151a3b',
      950: '#0a0d1f',
    },
  },
});
