import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export interface TocEntry {
  id: string;
  label: string; // i18n key
}

// Shared scaffold for every legal page: header (kicker / title / last-updated),
// an in-page table of contents with fragment anchors, then the page body via
// <ng-content>. Keeps the four legal pages free of repeated chrome.
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article>
      <header id="top" class="scroll-mt-24 border-b border-surface-800 pb-8">
        <span class="text-sm font-semibold uppercase tracking-wide text-primary-400">
          {{ kicker() | translate }}
        </span>
        <h1 class="mt-2 text-3xl font-bold text-surface-0 sm:text-4xl">{{ title() | translate }}</h1>
        <p class="mt-3 text-sm text-surface-500">
          {{ 'legal.common.lastUpdated' | translate }} {{ updated() | translate }}
        </p>
        @if (note()) {
          <p class="mt-4 rounded-xl border border-surface-800 bg-surface-900/60 p-3 text-sm text-surface-400">
            <i class="pi pi-info-circle mr-1.5 text-primary-400"></i>{{ note()! | translate }}
          </p>
        }
      </header>

      @if (sections().length) {
        <nav class="mt-8 rounded-2xl border border-surface-800 bg-surface-900/40 p-5">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-surface-500">
            {{ 'legal.common.toc' | translate }}
          </h2>
          <ol class="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            @for (s of sections(); track s.id; let i = $index) {
              <li>
                <a [href]="'#' + s.id" class="text-surface-400 transition-colors hover:text-primary-300">
                  {{ i + 1 }}. {{ s.label | translate }}
                </a>
              </li>
            }
          </ol>
        </nav>
      }

      <div class="legal-prose mt-8">
        <ng-content />
      </div>

      <div class="mt-12 border-t border-surface-800 pt-6">
        <a href="#top" class="text-sm text-surface-500 hover:text-surface-300">
          <i class="pi pi-arrow-up mr-1 text-xs"></i>{{ 'legal.common.backToTop' | translate }}
        </a>
      </div>
    </article>
  `,
})
export class LegalPageComponent {
  readonly kicker = input.required<string>();
  readonly title = input.required<string>();
  readonly updated = input.required<string>();
  readonly sections = input<TocEntry[]>([]);
  readonly note = input<string | null>(null);

  private readonly titleSvc = inject(Title);
  private readonly translate = inject(TranslateService);

  constructor() {
    // Reflect the page title into the browser tab, re-translating on language change.
    effect(() => {
      const key = this.title();
      this.translate.get(key).subscribe((t) => this.titleSvc.setTitle(`${t} · Gandhi Bot`));
    });
  }
}
