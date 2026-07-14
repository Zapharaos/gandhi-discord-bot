/**
 * Génère public/og-image.png (1200×630) en screenshottant la route /og.
 *
 *   node scripts/generate-og-image.mjs
 *
 * Le dev server Angular doit être lancé au préalable (ng serve ou npm start).
 * Par défaut il tourne sur http://localhost:4200 — surcharge via NG_URL :
 *
 *   NG_URL=http://localhost:4200 node scripts/generate-og-image.mjs
 *
 * Pré-requis (installation unique) :
 *   npm i -D playwright && npx playwright install chromium
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 1200;
const HEIGHT = 630;
const BASE_URL = process.env.NG_URL ?? 'http://localhost:4200';
const OG_URL = `${BASE_URL.replace(/\/$/, '')}/og`;
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og-image.png');

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('\n[og] Playwright est requis. Installe-le une fois avec :');
  console.error('  npm i -D playwright && npx playwright install chromium\n');
  process.exitCode = 1;
  process.exit();
}

console.log(`[og] Ouverture de ${OG_URL} …`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  const res = await page.goto(OG_URL, { waitUntil: 'networkidle', timeout: 15_000 }).catch(() => null);
  if (!res || !res.ok()) {
    console.error(`\n[og] Le dev server ne répond pas sur ${OG_URL}`);
    console.error('Lance d\'abord : npm start (dans apps/web-ui)\n');
    process.exitCode = 1;
    return;
  }

  const card = await page.waitForSelector('#og-image', { timeout: 10_000 }).catch(() => null);
  if (!card) {
    console.error('\n[og] Le composant #og-image n\'a pas été trouvé dans la page.\n');
    process.exitCode = 1;
    return;
  }

  await card.screenshot({ path: OUT });
  console.log(`[og] ✓ Écrit ${path.relative(process.cwd(), OUT)} (${WIDTH}×${HEIGHT})`);
} finally {
  await browser.close();
}
