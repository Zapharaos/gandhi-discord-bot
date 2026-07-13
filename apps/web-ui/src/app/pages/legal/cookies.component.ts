import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalPageComponent, TocEntry } from './legal-page.component';
import { CONTACT_EMAIL } from '@shared/brand';

@Component({
  selector: 'app-legal-cookies',
  standalone: true,
  imports: [LegalPageComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page
      kicker="legal.cookies.kicker"
      title="legal.cookies.title"
      updated="legal.cookies.updated"
      [sections]="toc"
    >
      <section id="s1" class="scroll-mt-24">
        <h2 class="legal-h2">1. {{ 'legal.cookies.s1.title' | translate }}</h2>
        <p>{{ 'legal.cookies.s1.p1' | translate }}</p>
      </section>

      <section id="s2" class="scroll-mt-24">
        <h2 class="legal-h2">2. {{ 'legal.cookies.s2.title' | translate }}</h2>
        <p>{{ 'legal.cookies.s2.p1' | translate }}</p>
        <div class="mt-3 overflow-x-auto">
          <table class="legal-table">
            <thead>
              <tr>
                <th>{{ 'legal.cookies.s2.colName' | translate }}</th>
                <th>{{ 'legal.cookies.s2.colType' | translate }}</th>
                <th>{{ 'legal.cookies.s2.colPurpose' | translate }}</th>
                <th>{{ 'legal.cookies.s2.colDuration' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of asArray('legal.cookies.s2.rows' | translate); track $index) {
                <tr>
                  <td><code>{{ row.name }}</code></td>
                  <td>{{ row.type }}</td>
                  <td>{{ row.purpose }}</td>
                  <td>{{ row.duration }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section id="s3" class="scroll-mt-24">
        <h2 class="legal-h2">3. {{ 'legal.cookies.s3.title' | translate }}</h2>
        <p class="rounded-xl border border-neon-green/20 bg-neon-green/5 p-3">
          <i class="pi pi-check-circle mr-1.5 text-neon-green"></i>{{ 'legal.cookies.s3.p1' | translate }}
        </p>
      </section>

      <section id="s4" class="scroll-mt-24">
        <h2 class="legal-h2">4. {{ 'legal.cookies.s4.title' | translate }}</h2>
        <p>{{ 'legal.cookies.s4.p1' | translate }}</p>
        <p>
          {{ 'legal.cookies.s4.p2' | translate }}
          <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">cnil.fr/plaintes</a>.
          {{ 'legal.cookies.s4.contact' | translate }} <a [href]="'mailto:' + email">{{ email }}</a>.
        </p>
      </section>
    </app-legal-page>
  `,
})
export class CookiesComponent {
  readonly email = CONTACT_EMAIL;

  readonly toc: TocEntry[] = Array.from({ length: 4 }, (_, i) => ({
    id: `s${i + 1}`,
    label: `legal.cookies.s${i + 1}.title`,
  }));

  asArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }
}
