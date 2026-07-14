import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, switchMap, timer } from 'rxjs';

/**
 * Tab-visibility awareness. Exposes a `visible` signal and a `pollTimer` helper
 * that only ticks while the tab is in the foreground — so background tabs stop
 * hammering the server (and re-sync immediately when brought back).
 */
@Injectable({ providedIn: 'root' })
export class VisibilityService {
  readonly visible = signal(this.isVisible());
  private readonly visible$ = new BehaviorSubject<boolean>(this.isVisible());

  constructor() {
    document.addEventListener('visibilitychange', () => {
      const v = this.isVisible();
      this.visible.set(v);
      this.visible$.next(v);
    });
  }

  /**
   * Emits `0` immediately, then every `periodMs`, but only while the tab is
   * visible. Becoming visible again restarts the timer (an immediate refresh).
   */
  pollTimer(periodMs: number): Observable<number> {
    return this.visible$.pipe(switchMap((v) => (v ? timer(0, periodMs) : EMPTY)));
  }

  private isVisible(): boolean {
    return document.visibilityState !== 'hidden';
  }
}
