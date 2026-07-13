import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest, switchMap } from 'rxjs';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { RankEntry, RankingResponse, RankSort, RankStat } from '@core/api/models';
import { DurationPipe } from '@shared/pipes/duration.pipe';
import { StatIconComponent } from '@shared/stat-icon/stat-icon.component';

type Period = 'all' | 'year' | 'month' | 'week' | 'today' | 'custom';
interface Bounds {
  from?: number;
  to?: number;
}

const DAY = 86_400_000;

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [NgClass, FormsModule, SelectModule, DatePickerModule, TranslatePipe, StatIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-lg font-semibold text-surface-0">{{ 'ranking.title' | translate }}</h2>
      <div class="flex flex-wrap items-end gap-x-2.5 gap-y-2">
        <button
          type="button"
          (click)="activeOnly.set(!activeOnly())"
          class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors"
          [class.border-green-500/40]="activeOnly()"
          [class.bg-green-500/10]="activeOnly()"
          [class.text-green-300]="activeOnly()"
          [class.border-surface-700]="!activeOnly()"
          [class.text-surface-400]="!activeOnly()"
        >
          <span class="relative flex h-2 w-2">
            @if (activeOnly()) {
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            }
            <span class="relative inline-flex h-2 w-2 rounded-full" [class.bg-green-500]="activeOnly()" [class.bg-surface-500]="!activeOnly()"></span>
          </span>
          {{ 'ranking.activeOnly' | translate }}
        </button>

        <label class="flex flex-col gap-1">
          <span class="px-0.5 text-[10px] font-medium uppercase tracking-wide text-surface-500">{{ 'ranking.labelStat' | translate }}</span>
          <p-select
            [options]="statOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="selectedStat()"
            (ngModelChange)="setStat($event)"
            size="small"
          />
        </label>

        @if (showPeriod()) {
          <label class="flex flex-col gap-1">
            <span class="px-0.5 text-[10px] font-medium uppercase tracking-wide text-surface-500">{{ 'ranking.labelPeriod' | translate }}</span>
            <p-select
              [options]="periodOptions()"
              optionLabel="label"
              optionValue="value"
              [ngModel]="period()"
              (ngModelChange)="period.set($event)"
              size="small"
            />
          </label>
          @if (period() === 'custom') {
            <p-datepicker
              [ngModel]="customRange()"
              (ngModelChange)="customRange.set($event)"
              selectionMode="range"
              [readonlyInput]="true"
              [showButtonBar]="true"
              dateFormat="dd/mm/yy"
              size="small"
              [placeholder]="'ranking.pickRange' | translate"
              appendTo="body"
              styleClass="text-sm"
            />
          }
        }

        <label class="flex flex-col gap-1" [title]="'ranking.measureHint' | translate">
          <span class="px-0.5 text-[10px] font-medium uppercase tracking-wide text-surface-500">{{ 'ranking.labelMeasure' | translate }}</span>
          <p-select
            [options]="measureOptions()"
            optionLabel="label"
            optionValue="value"
            [ngModel]="measure()"
            (ngModelChange)="measure.set($event)"
            size="small"
          />
        </label>
      </div>
    </div>

    @if (ranking(); as r) {
      <!-- Server total for the selected stat + period -->
      <div class="mb-5 flex items-center gap-3 rounded-2xl border border-surface-800 bg-surface-900 p-4">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
          <app-stat-icon [stat]="selectedStat()" class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wide text-surface-500">{{ 'ranking.serverTotal' | translate }}</div>
          <div class="truncate text-xl font-bold text-surface-0">{{ totalDisplay(r.total) }}</div>
        </div>
        <span class="ml-auto rounded-lg bg-surface-800 px-2.5 py-1 text-xs text-surface-400">{{ periodLabel() | translate }}</span>
      </div>

      @if (podium().length) {
        <!-- Podium: top 3 (robust for 1–3 entries) -->
        <div class="mb-4 flex items-end justify-center gap-2 sm:gap-4">
          @for (e of podium(); track e.userId) {
            <div
              class="flex w-28 flex-col items-center sm:w-32"
              [class.order-1]="e.rank === 2"
              [class.order-2]="e.rank === 1"
              [class.order-3]="e.rank === 3"
            >
              @if (e.rank === 1) {
                <i class="pi pi-crown mb-1 text-lg text-amber-400"></i>
              }
              <div class="relative">
                <div
                  class="flex items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-surface-950"
                  [ngClass]="ringClass(e.rank) + ' ' + avatarSize(e.rank)"
                >
                  @if (e.avatar) {
                    <img [src]="e.avatar" alt="" class="h-full w-full object-cover" />
                  } @else {
                    <span class="flex h-full w-full items-center justify-center bg-surface-700 font-semibold text-surface-200" [class.text-xl]="e.rank === 1">{{ initials(e) }}</span>
                  }
                </div>
                @if (e.isLive) {
                  <span class="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-surface-950 bg-green-500"></span>
                  </span>
                }
              </div>
              <div class="mt-2 w-full truncate text-center text-sm font-semibold" [class.text-primary-300]="e.isMe" [class.text-surface-100]="!e.isMe">
                {{ displayName(e) }}
              </div>
              <div class="w-full text-center text-sm font-medium text-surface-200">{{ measureValue(e) }}</div>
              @if (measure() !== 'value') {
                <div class="w-full text-center text-[11px] text-surface-500">{{ entryTotal(e) }}</div>
              }
              <div
                class="mt-2 flex w-full items-start justify-center rounded-t-lg pt-2 text-lg font-bold"
                [ngClass]="pedestalClass(e.rank) + ' ' + pedestalHeight(e.rank)"
              >
                {{ e.rank }}
              </div>
            </div>
          }
        </div>
      }

      @if (rest().length) {
        <div class="overflow-hidden rounded-2xl border border-surface-800">
          <!-- Column headers -->
          <div class="flex items-center gap-3 border-b border-surface-800 bg-surface-950/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
            <span class="w-6 text-right">#</span>
            <span class="flex-1 pl-11">{{ 'ranking.colMember' | translate }}</span>
            @if (measure() !== 'value') {
              <span class="ml-auto">{{ 'ranking.colTotal' | translate }}</span>
            }
            <span class="min-w-[3.25rem] text-right" [class.ml-auto]="measure() === 'value'">{{ measureLabelKey() | translate }}</span>
          </div>

          @for (e of rest(); track e.userId) {
            <div
              class="flex items-center gap-3 border-b border-surface-800 px-4 py-2.5 last:border-b-0"
              [class.bg-primary-500/10]="e.isMe"
              [class.bg-surface-900]="!e.isMe"
            >
              <span class="w-6 text-right font-mono text-sm text-surface-500">{{ e.rank }}</span>
              <div class="relative h-8 w-8 shrink-0">
                @if (e.avatar) {
                  <img [src]="e.avatar" alt="" class="h-8 w-8 rounded-full object-cover" />
                } @else {
                  <span class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-700 text-xs font-medium text-surface-200">{{ initials(e) }}</span>
                }
                @if (e.isLive) {
                  <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-900 bg-green-500" [title]="'dashboard.live' | translate"></span>
                }
              </div>
              <span class="min-w-0 flex-1 truncate text-sm" [class.text-surface-200]="!e.isMe" [class.text-primary-200]="e.isMe">{{ displayName(e) }}</span>
              @if (e.isMe) {
                <span class="rounded bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary-300">{{ 'ranking.you' | translate }}</span>
              }
              @if (measure() !== 'value') {
                <span class="ml-auto text-xs text-surface-500">{{ entryTotal(e) }}</span>
              }
              <span class="min-w-[3.25rem] text-right font-semibold text-surface-100" [class.ml-auto]="measure() === 'value'">{{ measureValue(e) }}</span>
            </div>
          }
        </div>
      }

      @if (!podium().length && !rest().length) {
        <p class="rounded-2xl border border-dashed border-surface-800 p-6 text-center text-surface-500">
          {{ (activeOnly() ? 'ranking.emptyNow' : 'ranking.empty') | translate }}
        </p>
      }

      <!-- The viewer's own rank, if they fell outside the shown list -->
      @if (r.me && r.me.rank > r.entries.length) {
        <div class="mt-2 flex items-center gap-3 rounded-2xl border border-primary-500/30 bg-primary-500/10 px-4 py-2.5">
          <span class="w-6 text-right font-mono text-sm text-primary-400">{{ r.me.rank }}</span>
          <span class="flex-1 text-sm text-primary-200">{{ 'ranking.you' | translate }}</span>
          <span class="ml-auto font-semibold text-surface-100">{{ measureValue(r.me) }}</span>
        </div>
      }
    }
  `,
})
export class RankingComponent {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  // Re-evaluate localized option labels when the language changes.
  private readonly lang = toSignal(this.translate.onLangChange, { initialValue: null });

  private readonly duration = new DurationPipe();

  readonly guildId = input.required<string>();
  readonly selectedStat = signal<RankStat>('time_connected');
  readonly period = signal<Period>('all');
  readonly customRange = signal<Date[] | null>(null);
  readonly activeOnly = signal(false);
  /** Which measure to rank & show: total, share of connected, longest, or session count. */
  readonly measure = signal<RankSort>('value');

  /** The daily-streak board is a scalar in days: only Total (current) and Longest (best) apply. */
  readonly isStreak = computed(() => this.selectedStat() === 'daily_streak');
  /** No period filter for streak (it's a current value). */
  readonly showPeriod = computed(() => !this.isStreak());

  private readonly statKeys: [string, RankStat][] = [
    ['connected', 'time_connected'],
    ['muted', 'time_muted'],
    ['deafened', 'time_deafened'],
    ['screen', 'time_screen_sharing'],
    ['camera', 'time_camera'],
    ['streakTitle', 'daily_streak'],
  ];
  private readonly periodKeys: Period[] = ['all', 'year', 'month', 'week', 'today', 'custom'];

  readonly statOptions = computed(() => {
    this.lang();
    return this.statKeys.map(([k, v]) => ({ value: v, label: this.translate.instant('stats.' + k) }));
  });

  readonly periodOptions = computed(() => {
    this.lang();
    return this.periodKeys.map((v) => ({ value: v, label: this.translate.instant('ranking.period.' + v) }));
  });

  // Streak only supports Total (current) and Longest (best); time stats support all four.
  readonly measureOptions = computed(() => {
    this.lang();
    const keys: RankSort[] = this.isStreak() ? ['value', 'max'] : ['value', 'percent', 'max', 'count'];
    return keys.map((v) => ({ value: v, label: this.translate.instant('ranking.measure.' + v) }));
  });

  /** Switch the ranked stat, clamping the measure to one the new stat supports. */
  setStat(stat: RankStat): void {
    this.selectedStat.set(stat);
    if (stat === 'daily_streak' && this.measure() !== 'value' && this.measure() !== 'max') {
      this.measure.set('value');
    }
  }

  private readonly guildId$ = toObservable(this.guildId);
  private readonly stat$ = toObservable(this.selectedStat);
  private readonly period$ = toObservable(this.period);
  private readonly customRange$ = toObservable(this.customRange);
  private readonly activeOnly$ = toObservable(this.activeOnly);
  private readonly measure$ = toObservable(this.measure);

  readonly ranking = toSignal<RankingResponse | null>(
    combineLatest([this.guildId$, this.stat$, this.period$, this.customRange$, this.activeOnly$, this.measure$]).pipe(
      switchMap(([gid, stat, p, range, active, measure]) => {
        // No period bounds for the streak board.
        const b = stat === 'daily_streak' ? {} : this.periodBounds(p, range);
        return this.api.guildRanking(gid, stat, b.from, b.to, active, measure);
      }),
    ),
    { initialValue: null },
  );

  /** A leaderboard entry's value as a percentage of its connected time. */
  pctOf(e: RankEntry): string {
    if (!e.connected || e.connected <= 0) return '—';
    return Math.round((e.value / e.connected) * 100) + '%';
  }

  /** Format a raw amount for the current stat's unit (days for streak, else duration). */
  private fmt(amount: number): string {
    return this.isStreak() ? `${amount} d` : (this.duration.transform(amount) ?? '0s');
  }

  /** The entry's total (period) value, used as the secondary figure. */
  entryTotal(e: RankEntry): string {
    return this.fmt(e.value);
  }

  /** The server-wide total for the current stat. */
  totalDisplay(total: number): string {
    return this.fmt(total);
  }

  /** The entry's displayed value for the current measure. */
  measureValue(e: RankEntry): string {
    switch (this.measure()) {
      case 'percent':
        return this.pctOf(e);
      case 'max':
        return this.fmt(e.max);
      case 'count':
        return `${e.count}×`;
      default:
        return this.fmt(e.value);
    }
  }

  readonly podium = computed<RankEntry[]>(() => this.ranking()?.entries.slice(0, 3) ?? []);
  readonly rest = computed<RankEntry[]>(() => this.ranking()?.entries.slice(3) ?? []);

  readonly periodLabel = computed(() => `ranking.period.${this.period()}`);
  readonly measureLabelKey = computed(() => `ranking.measure.${this.measure()}`);

  displayName(e: RankEntry): string {
    return e.name || `@${e.userId.slice(-4)}`;
  }

  initials(e: RankEntry): string {
    const n = e.name?.trim();
    if (n) return n.charAt(0).toUpperCase();
    return '#';
  }

  avatarSize(rank: number): string {
    return rank === 1 ? 'h-20 w-20' : 'h-16 w-16';
  }

  pedestalHeight(rank: number): string {
    if (rank === 1) return 'h-16';
    if (rank === 2) return 'h-11';
    return 'h-8';
  }

  ringClass(rank: number): string {
    if (rank === 1) return 'ring-amber-400';
    if (rank === 2) return 'ring-slate-300';
    return 'ring-orange-700';
  }

  pedestalClass(rank: number): string {
    if (rank === 1) return 'bg-gradient-to-b from-amber-400/30 to-amber-400/5 text-amber-300';
    if (rank === 2) return 'bg-gradient-to-b from-slate-300/25 to-slate-300/5 text-slate-200';
    return 'bg-gradient-to-b from-orange-700/25 to-orange-700/5 text-orange-300';
  }

  private periodBounds(p: Period, range: Date[] | null): Bounds {
    const today = Math.floor(Date.now() / DAY) * DAY;
    const d = new Date(today);
    switch (p) {
      case 'today':
        return { from: today, to: today };
      case 'week': {
        const mondayOffset = (d.getUTCDay() + 6) % 7;
        return { from: today - mondayOffset * DAY, to: today };
      }
      case 'month':
        return { from: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1), to: today };
      case 'year':
        return { from: Date.UTC(d.getUTCFullYear(), 0, 1), to: today };
      case 'custom': {
        if (!range || range.length < 2 || !range[0] || !range[1]) return {};
        const f = Date.UTC(range[0].getFullYear(), range[0].getMonth(), range[0].getDate());
        const t = Date.UTC(range[1].getFullYear(), range[1].getMonth(), range[1].getDate());
        return { from: Math.min(f, t), to: Math.max(f, t) };
      }
      default:
        return {};
    }
  }
}
