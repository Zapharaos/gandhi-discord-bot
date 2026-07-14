// Central place for public-facing brand constants used across the landing,
// footer and legal pages. Keep these in sync with the real deployment.

/** Public source repository (shown in the footer and landing). */
export const GITHUB_URL = 'https://github.com/Zapharaos/gandhi-discord-bot';

/** Publisher / data-controller pseudonym (LCEN art. 6-III-2 — see legal pages). */
export const PUBLISHER = 'Zapharaos';

/** Author credit shown in the footer, linking to the personal portfolio. */
export const AUTHOR = 'Matthieu Freitag';
export const PORTFOLIO_URL = 'https://matthieu-freitag.com';

// the legal pages and used for every mailto: link (GDPR requests, legal notice).
export const CONTACT_EMAIL = 'contact@matthieu-freitag.com';

/** Hosting provider (mentions légales + privacy data-location). */
export const HOST = {
  name: 'Hetzner Online GmbH',
  address: 'Industriestr. 25, 91710 Gunzenhausen, Allemagne',
  url: 'https://www.hetzner.com',
} as const;
