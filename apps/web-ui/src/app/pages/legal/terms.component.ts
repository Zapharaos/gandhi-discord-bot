import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalPageComponent, TocEntry } from './legal-page.component';
import { CONTACT_EMAIL, GITHUB_URL, PUBLISHER } from '@shared/brand';

@Component({
  selector: 'app-legal-terms',
  standalone: true,
  imports: [LegalPageComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page
      kicker="legal.terms.kicker"
      title="legal.terms.title"
      updated="legal.terms.updated"
      [sections]="toc"
    >
      <section id="s1" class="scroll-mt-24">
        <h2 class="legal-h2">1. {{ 'legal.terms.s1.title' | translate }}</h2>
        <p>{{ 'legal.terms.s1.p1' | translate }}</p>
        <p class="rounded-xl border border-primary-500/20 bg-primary-500/5 p-3">
          <i class="pi pi-info-circle mr-1.5 text-primary-400"></i>{{ 'legal.terms.s1.note' | translate }}
        </p>
      </section>

      <section id="s2" class="scroll-mt-24">
        <h2 class="legal-h2">2. {{ 'legal.terms.s2.title' | translate }}</h2>
        <p>{{ 'legal.terms.s2.p1' | translate }}</p>
      </section>

      <section id="s3" class="scroll-mt-24">
        <h2 class="legal-h2">3. {{ 'legal.terms.s3.title' | translate }}</h2>
        <p>{{ 'legal.terms.s3.p1' | translate }}</p>
        <ul>
          @for (item of asArray('legal.terms.s3.items' | translate); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>

      <section id="s4" class="scroll-mt-24">
        <h2 class="legal-h2">4. {{ 'legal.terms.s4.title' | translate }}</h2>
        <p>{{ 'legal.terms.s4.p1' | translate }}</p>
        <ul>
          @for (item of asArray('legal.terms.s4.items' | translate); track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      </section>

      <section id="s5" class="scroll-mt-24">
        <h2 class="legal-h2">5. {{ 'legal.terms.s5.title' | translate }}</h2>
        <p class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <i class="pi pi-exclamation-triangle mr-1.5 text-amber-400"></i>{{ 'legal.terms.s5.p1' | translate }}
        </p>
        <p>{{ 'legal.terms.s5.p2' | translate }}</p>
      </section>

      <section id="s6" class="scroll-mt-24">
        <h2 class="legal-h2">6. {{ 'legal.terms.s6.title' | translate }}</h2>
        <p>{{ 'legal.terms.s6.p1' | translate }} <a [href]="github" target="_blank" rel="noopener">{{ 'legal.terms.s6.repo' | translate }}</a>.</p>
      </section>

      <section id="s7" class="scroll-mt-24">
        <h2 class="legal-h2">7. {{ 'legal.terms.s7.title' | translate }}</h2>
        <p>{{ 'legal.terms.s7.p1' | translate }}</p>
        <p>{{ 'legal.terms.s7.p2' | translate }}</p>
      </section>

      <section id="s8" class="scroll-mt-24">
        <h2 class="legal-h2">8. {{ 'legal.terms.s8.title' | translate }}</h2>
        <p>{{ 'legal.terms.s8.p1' | translate }}</p>
      </section>

      <section id="s9" class="scroll-mt-24">
        <h2 class="legal-h2">9. {{ 'legal.terms.s9.title' | translate }}</h2>
        <p>{{ 'legal.terms.s9.p1' | translate }}</p>
      </section>

      <section id="s10" class="scroll-mt-24">
        <h2 class="legal-h2">10. {{ 'legal.terms.s10.title' | translate }}</h2>
        <p>{{ 'legal.terms.s10.p1' | translate }}</p>
      </section>

      <section id="s11" class="scroll-mt-24">
        <h2 class="legal-h2">11. {{ 'legal.terms.s11.title' | translate }}</h2>
        <p>{{ 'legal.terms.s11.p1' | translate }} <a [href]="'mailto:' + email">{{ email }}</a> ({{ publisher }}).</p>
      </section>
    </app-legal-page>
  `,
})
export class TermsComponent {
  readonly publisher = PUBLISHER;
  readonly email = CONTACT_EMAIL;
  readonly github = GITHUB_URL;

  readonly toc: TocEntry[] = Array.from({ length: 11 }, (_, i) => ({
    id: `s${i + 1}`,
    label: `legal.terms.s${i + 1}.title`,
  }));

  asArray(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }
}
