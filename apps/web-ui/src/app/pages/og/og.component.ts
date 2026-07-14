import { ChangeDetectionStrategy, Component } from '@angular/core';
import { environment } from '../../../environments/environment';

// Dev-only page rendered at exactly 1200×630 for screenshotting the OG image.
// Route /og is only registered when environment.production === false.
// Screenshot with: node scripts/generate-og-image.mjs
@Component({
  selector: 'app-og',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
      background: #000;
    }

    .og-card {
      position: relative;
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: #0d0d0d;
      color: #ffffff;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      box-sizing: border-box;
    }

    /* Decorative background — concentric rings à la Discord activity vibe */
    .og-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }

    .og-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(99, 102, 241, 0.15);
    }

    .og-ring-1 {
      width: 900px;
      height: 900px;
      top: -200px;
      right: -300px;
    }

    .og-ring-2 {
      width: 650px;
      height: 650px;
      top: -85px;
      right: -150px;
      border-color: rgba(99, 102, 241, 0.22);
    }

    .og-ring-3 {
      width: 400px;
      height: 400px;
      top: 30px;
      right: 0;
      border-color: rgba(99, 102, 241, 0.3);
    }

    .og-glow {
      position: absolute;
      width: 600px;
      height: 600px;
      top: -100px;
      right: -100px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%);
    }

    /* Gradient fade on the right so content stays readable */
    .og-fade {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, #0d0d0d 45%, rgba(13, 13, 13, 0.3) 100%);
    }

    /* Content */
    .og-content {
      position: relative;
      z-index: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0 80px;
      box-sizing: border-box;
      max-width: 750px;
    }

    .og-logo-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 40px;
    }

    .og-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 12px;
    }

    .og-site-name {
      font-size: 22px;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
      letter-spacing: -0.3px;
    }

    .og-badge {
      display: inline-block;
      margin-bottom: 20px;
      padding: 5px 14px;
      border-radius: 20px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      font-size: 14px;
      font-weight: 600;
      color: #a5b4fc;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }

    .og-title {
      margin: 0 0 20px;
      font-size: 56px;
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -1.5px;
      color: #ffffff;
    }

    .og-title-accent {
      color: #818cf8;
    }

    .og-desc {
      margin: 0;
      font-size: 22px;
      font-weight: 400;
      line-height: 1.5;
      color: rgba(255,255,255,0.6);
      max-width: 560px;
    }

    /* Bottom bar */
    .og-footer {
      position: absolute;
      bottom: 40px;
      left: 80px;
      right: 80px;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .og-url {
      font-size: 16px;
      color: rgba(255,255,255,0.3);
      font-weight: 400;
      letter-spacing: 0.2px;
    }

    .og-pill {
      display: flex;
      gap: 10px;
    }

    .og-tag {
      padding: 4px 12px;
      border-radius: 12px;
      background: rgba(255,255,255,0.06);
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      font-weight: 500;
    }
  `],
  template: `
    <div id="og-image" class="og-card">
      <!-- Background decorations -->
      <div class="og-bg">
        <div class="og-glow"></div>
        <div class="og-ring og-ring-1"></div>
        <div class="og-ring og-ring-2"></div>
        <div class="og-ring og-ring-3"></div>
        <div class="og-fade"></div>
      </div>

      <!-- Main content -->
      <div class="og-content">
        <div class="og-logo-row">
          <img class="og-logo" src="/assets/images/logo-512.png" alt="Gandhi Bot" />
          <span class="og-site-name">Gandhi Bot</span>
        </div>

        <span class="og-badge">Discord Bot</span>

        <h1 class="og-title">
          Voice activity stats<br />
          <span class="og-title-accent">for Discord.</span>
        </h1>

        <p class="og-desc">
          Track time in voice channels, build heatmaps and leaderboards —
          privacy-first, opt-in by design.
        </p>
      </div>

      <!-- Footer bar -->
      <div class="og-footer">
        <span class="og-url">gandhibot.freits.fr</span>
        <div class="og-pill">
          <span class="og-tag">Free</span>
          <span class="og-tag">Privacy-first</span>
          <span class="og-tag">Opt-in</span>
        </div>
      </div>
    </div>
  `,
})
export class OgComponent {
  protected readonly isProd = environment.production;
}
