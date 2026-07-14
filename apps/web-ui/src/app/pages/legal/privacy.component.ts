import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalPageComponent, TocEntry } from './legal-page.component';
import { CONTACT_EMAIL, HOST, PUBLISHER } from '@shared/brand';

@Component({
  selector: 'app-legal-privacy',
  standalone: true,
  imports: [LegalPageComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page
      kicker="legal.privacy.kicker"
      title="legal.privacy.title"
      updated="legal.privacy.updated"
      [sections]="toc"
    >
      <section id="s1" class="scroll-mt-24">
        <h2 class="legal-h2">1. {{ 'legal.privacy.s1.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s1.p1' | translate }}</p>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt class="font-semibold text-surface-200">{{ 'legal.privacy.s1.controller' | translate }}</dt>
          <dd>{{ publisher }}</dd>
          <dt class="font-semibold text-surface-200">{{ 'legal.privacy.s1.contact' | translate }}</dt>
          <dd><a [href]="'mailto:' + email">{{ email }}</a></dd>
        </dl>
      </section>

      <section id="s2" class="scroll-mt-24">
        <h2 class="legal-h2">2. {{ 'legal.privacy.s2.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s2.p1' | translate }}</p>
        <ul>
          @for (item of asArray('legal.privacy.s2.items' | translate); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
        <p class="rounded-xl border border-neon-cyan/20 bg-neon-cyan/5 p-3">
          <strong>{{ 'legal.privacy.s2.noteTitle' | translate }}</strong> {{ 'legal.privacy.s2.note' | translate }}
        </p>
      </section>

      <section id="s3" class="scroll-mt-24">
        <h2 class="legal-h2">3. {{ 'legal.privacy.s3.title' | translate }}</h2>
        <ul>
          @for (item of asArray('legal.privacy.s3.items' | translate); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>

      <section id="s4" class="scroll-mt-24">
        <h2 class="legal-h2">4. {{ 'legal.privacy.s4.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s4.p1' | translate }}</p>
        <div class="mt-3 overflow-x-auto">
          <table class="legal-table">
            <thead>
              <tr>
                <th>{{ 'legal.privacy.s4.colTreatment' | translate }}</th>
                <th>{{ 'legal.privacy.s4.colBasis' | translate }}</th>
                <th>{{ 'legal.privacy.s4.colDetail' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of asArray('legal.privacy.s4.rows' | translate); track $index) {
                <tr>
                  <td>{{ row.treatment }}</td>
                  <td>{{ row.basis }}</td>
                  <td>{{ row.detail }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section id="s5" class="scroll-mt-24">
        <h2 class="legal-h2">5. {{ 'legal.privacy.s5.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s5.p1' | translate }}</p>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt class="font-semibold text-surface-200">{{ 'legal.privacy.s5.host' | translate }}</dt>
          <dd>{{ hostName }}</dd>
          <dt class="font-semibold text-surface-200">{{ 'legal.privacy.s5.location' | translate }}</dt>
          <dd>{{ 'legal.privacy.s5.locationValue' | translate }}</dd>
        </dl>
      </section>

      <section id="s6" class="scroll-mt-24">
        <h2 class="legal-h2">6. {{ 'legal.privacy.s6.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s6.p1' | translate }}</p>
        <ul>
          @for (item of asArray('legal.privacy.s6.items' | translate); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>

      <section id="s7" class="scroll-mt-24">
        <h2 class="legal-h2">7. {{ 'legal.privacy.s7.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s7.p1' | translate }}</p>
        <div class="mt-3 overflow-x-auto">
          <table class="legal-table">
            <thead>
              <tr>
                <th>{{ 'legal.privacy.s7.colName' | translate }}</th>
                <th>{{ 'legal.privacy.s7.colRole' | translate }}</th>
                <th>{{ 'legal.privacy.s7.colLocation' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of asArray('legal.privacy.s7.rows' | translate); track $index) {
                <tr>
                  <td>{{ row.name }}</td>
                  <td>{{ row.role }}</td>
                  <td>{{ row.location }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p>{{ 'legal.privacy.s7.note' | translate }}</p>
      </section>

      <section id="s8" class="scroll-mt-24">
        <h2 class="legal-h2">8. {{ 'legal.privacy.s8.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s8.p1' | translate }}</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          @for (right of asArray('legal.privacy.s8.rights' | translate); track $index) {
            <div class="rounded-2xl border border-surface-800 bg-surface-900/40 p-4">
              <h3 class="font-semibold text-surface-100">{{ right.title }}</h3>
              <p class="mt-1 text-sm text-surface-400">{{ right.detail }}</p>
              <p class="mt-2 text-sm">
                <span class="text-surface-500">{{ 'legal.privacy.s8.howLabel' | translate }}</span> {{ right.how }}
              </p>
            </div>
          }
        </div>
        <p>{{ 'legal.privacy.s8.contact' | translate }} <a [href]="'mailto:' + email">{{ email }}</a>.</p>
      </section>

      <section id="s9" class="scroll-mt-24">
        <h2 class="legal-h2">9. {{ 'legal.privacy.s9.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s9.p1' | translate }}</p>
        <p>{{ 'legal.privacy.s9.p2' | translate }}</p>
      </section>

      <section id="s10" class="scroll-mt-24">
        <h2 class="legal-h2">10. {{ 'legal.privacy.s10.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s10.p1' | translate }} <a href="/legal/cookies">{{ 'legal.privacy.s10.link' | translate }}</a>.</p>
      </section>

      <section id="s11" class="scroll-mt-24">
        <h2 class="legal-h2">11. {{ 'legal.privacy.s11.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s11.p1' | translate }}</p>
      </section>

      <section id="s12" class="scroll-mt-24">
        <h2 class="legal-h2">12. {{ 'legal.privacy.s12.title' | translate }}</h2>
        <p>{{ 'legal.privacy.s12.p1' | translate }}</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl border border-surface-800 bg-surface-900/40 p-4">
            <h3 class="font-semibold text-surface-100">{{ 'legal.privacy.s12.controllerTitle' | translate }}</h3>
            <p class="mt-1 text-sm text-surface-400">{{ publisher }} — <a [href]="'mailto:' + email">{{ email }}</a></p>
          </div>
          <div class="rounded-2xl border border-surface-800 bg-surface-900/40 p-4">
            <h3 class="font-semibold text-surface-100">{{ 'legal.privacy.s12.cnilTitle' | translate }}</h3>
            <p class="mt-1 text-sm text-surface-400">
              {{ 'legal.privacy.s12.cnilText' | translate }}
              <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">cnil.fr/plaintes</a>.
            </p>
          </div>
        </div>
      </section>
    </app-legal-page>
  `,
})
export class PrivacyComponent {
  readonly publisher = PUBLISHER;
  readonly email = CONTACT_EMAIL;
  readonly hostName = HOST.name;

  readonly toc: TocEntry[] = Array.from({ length: 12 }, (_, i) => ({
    id: `s${i + 1}`,
    label: `legal.privacy.s${i + 1}.title`,
  }));

  /** Guards against the transient string a translate pipe returns before load. */
  asArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }
}
