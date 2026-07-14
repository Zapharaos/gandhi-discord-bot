import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '@core/api/api.service';
import { AuthService } from '@core/auth/auth.service';
import { GuildRosterResponse, RosterMember } from '@core/api/models';

@Component({
  selector: 'app-member-admin',
  standalone: true,
  imports: [FormsModule, TableModule, ToggleSwitchModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-surface-0">{{ 'members.title' | translate }}</h2>
          @if (roster(); as r) {
            <p class="mt-0.5 text-xs text-surface-500">
              {{ 'members.total' | translate }}: <span class="text-surface-300">{{ r.total }}</span>
              · {{ 'members.private' | translate }}: <span class="text-surface-300">{{ r.privateCount }}</span>
              · {{ 'members.admins' | translate }}: <span class="text-surface-300">{{ r.adminCount }}</span>
            </p>
          }
        </div>
      </div>

      @if (roster(); as r) {
        <p-table
          #dt
          [value]="r.members"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          sortField="lastActivity"
          [sortOrder]="-1"
          [globalFilterFields]="['name', 'userId']"
          styleClass="text-sm"
        >
          <ng-template pTemplate="caption">
            <input
              type="text"
              (input)="dt.filterGlobal($any($event.target).value, 'contains')"
              [placeholder]="'members.search' | translate"
              class="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 outline-none focus:border-primary-500 sm:w-72"
            />
          </ng-template>

          <ng-template pTemplate="header">
            <tr>
              <th class="text-left">{{ 'members.member' | translate }}</th>
              <th pSortableColumn="lastActivity" class="text-left">
                {{ 'members.lastActivity' | translate }} <p-sortIcon field="lastActivity" />
              </th>
              @if (isOwner()) {
                <th class="text-center">{{ 'members.admin' | translate }}</th>
              }
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-m>
            <tr>
              <td>
                <div class="flex items-center gap-2.5 py-1">
                  @if (m.avatar) {
                    <img [src]="m.avatar" alt="" class="h-8 w-8 shrink-0 rounded-full object-cover" />
                  } @else {
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-700 text-xs font-medium text-surface-200">{{ initials(m) }}</span>
                  }
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="truncate font-medium text-surface-100">{{ displayName(m) }}</span>
                      @if (m.isOwner) {
                        <span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">{{ 'members.owner' | translate }}</span>
                      }
                      @if (m.localAdmin && !m.isOwner) {
                        <span class="rounded bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-300">{{ 'members.adminTag' | translate }}</span>
                      }
                      @if (m.isPrivate) {
                        <span class="rounded bg-surface-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-surface-300"><i class="pi pi-eye-slash text-[9px]"></i> {{ 'members.privateTag' | translate }}</span>
                      }
                    </div>
                    <div class="truncate font-mono text-[11px] text-surface-500">{{ m.userId }}</div>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap text-surface-300">
                {{ lastActivityLabel(m.lastActivity) ?? ('members.never' | translate) }}
              </td>
              @if (isOwner()) {
                <td class="text-center">
                  @if (m.isOwner) {
                    <i class="pi pi-crown text-amber-400" [title]="'members.owner' | translate"></i>
                  } @else {
                    <span class="inline-flex origin-center scale-90">
                      <p-toggleswitch [ngModel]="m.localAdmin" (ngModelChange)="toggleAdmin(m, $event)" [disabled]="saving()" />
                    </span>
                  }
                </td>
              }
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="isOwner() ? 3 : 2" class="py-6 text-center text-surface-500">{{ 'members.empty' | translate }}</td>
            </tr>
          </ng-template>
        </p-table>
      } @else {
        <p class="text-sm text-surface-400">{{ 'dashboard.loading' | translate }}</p>
      }
    </section>
  `,
})
export class MemberAdminComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly guildId = input.required<string>();

  readonly roster = signal<GuildRosterResponse | null>(null);
  readonly saving = signal(false);

  /** Only the guild owner may grant/revoke the local admin role. */
  readonly isOwner = computed(() => {
    const r = this.roster();
    return !!r && this.auth.me()?.user.id === r.ownerId;
  });

  constructor() {
    toObservable(this.guildId)
      .pipe(switchMap((gid) => this.api.guildRoster(gid)))
      .subscribe((r) => this.roster.set(r));
  }

  toggleAdmin(m: RosterMember, value: boolean): void {
    this.saving.set(true);
    this.api.setMemberAdmin(this.guildId(), m.userId, value).subscribe({
      next: (r) => {
        this.roster.set(r);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  displayName(m: RosterMember): string {
    return m.name || `@${m.userId.slice(-4)}`;
  }

  initials(m: RosterMember): string {
    return m.name?.trim().charAt(0).toUpperCase() || m.userId.slice(-2);
  }

  lastActivityLabel(ms: number): string | null {
    if (!ms || ms <= 0) return null;
    return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
