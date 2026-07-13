import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LegalPageComponent, TocEntry } from './legal-page.component';
import { CONTACT_EMAIL, GITHUB_URL, HOST, PUBLISHER } from '@shared/brand';

@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [LegalPageComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-legal-page
      kicker="legal.notice.kicker"
      title="legal.notice.title"
      updated="legal.notice.updated"
      note="legal.notice.authoritative"
      [sections]="toc"
    >
      <section id="s1" class="scroll-mt-24">
        <h2 class="legal-h2">1. {{ 'legal.notice.s1.title' | translate }}</h2>
        <p>{{ 'legal.notice.s1.p1' | translate }}</p>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt class="font-semibold text-surface-200">{{ 'legal.notice.s1.publisher' | translate }}</dt>
          <dd>{{ publisher }}</dd>
          <dt class="font-semibold text-surface-200">{{ 'legal.notice.s1.contact' | translate }}</dt>
          <dd><a [href]="'mailto:' + email">{{ email }}</a></dd>
          <dt class="font-semibold text-surface-200">{{ 'legal.notice.s1.director' | translate }}</dt>
          <dd>{{ publisher }}</dd>
        </dl>
        <p class="text-sm text-surface-500">{{ 'legal.notice.s1.note' | translate }}</p>
      </section>

      <section id="s2" class="scroll-mt-24">
        <h2 class="legal-h2">2. {{ 'legal.notice.s2.title' | translate }}</h2>
        <p>{{ 'legal.notice.s2.p1' | translate }}</p>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          <dt class="font-semibold text-surface-200">{{ 'legal.notice.s2.host' | translate }}</dt>
          <dd>{{ host.name }}</dd>
          <dt class="font-semibold text-surface-200">{{ 'legal.notice.s2.address' | translate }}</dt>
          <dd>{{ host.address }}</dd>
          <dt class="font-semibold text-surface-200">{{ 'legal.notice.s2.website' | translate }}</dt>
          <dd><a [href]="host.url" target="_blank" rel="noopener">{{ host.url }}</a></dd>
        </dl>
      </section>

      <section id="s3" class="scroll-mt-24">
        <h2 class="legal-h2">3. {{ 'legal.notice.s3.title' | translate }}</h2>
        <p>{{ 'legal.notice.s3.p1' | translate }} <a [href]="github" target="_blank" rel="noopener">{{ 'legal.notice.s3.repo' | translate }}</a>.</p>
      </section>

      <section id="s4" class="scroll-mt-24">
        <h2 class="legal-h2">4. {{ 'legal.notice.s4.title' | translate }}</h2>
        <p>{{ 'legal.notice.s4.p1' | translate }}</p>
      </section>

      <section id="s5" class="scroll-mt-24">
        <h2 class="legal-h2">5. {{ 'legal.notice.s5.title' | translate }}</h2>
        <p>{{ 'legal.notice.s5.p1' | translate }}</p>
      </section>

      <section id="s6" class="scroll-mt-24">
        <h2 class="legal-h2">6. {{ 'legal.notice.s6.title' | translate }}</h2>
        <p>
          {{ 'legal.notice.s6.p1' | translate }}
          <a href="/legal/terms">{{ 'legal.notice.s6.terms' | translate }}</a> ·
          <a href="/legal/privacy">{{ 'legal.notice.s6.privacy' | translate }}</a> ·
          <a href="/legal/cookies">{{ 'legal.notice.s6.cookies' | translate }}</a>.
        </p>
      </section>
    </app-legal-page>
  `,
})
export class LegalNoticeComponent {
  readonly publisher = PUBLISHER;
  readonly email = CONTACT_EMAIL;
  readonly github = GITHUB_URL;
  readonly host = HOST;

  readonly toc: TocEntry[] = Array.from({ length: 6 }, (_, i) => ({
    id: `s${i + 1}`,
    label: `legal.notice.s${i + 1}.title`,
  }));
}
