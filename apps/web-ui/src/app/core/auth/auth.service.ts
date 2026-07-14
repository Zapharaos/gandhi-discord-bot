import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { ApiService } from '@core/api/api.service';
import { MeResponse } from '@core/api/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  readonly me = signal<MeResponse | null>(null);
  private loaded = false;

  /** Resolve authentication state, fetching /api/me once and caching it. */
  async ensureLoaded(): Promise<boolean> {
    if (this.loaded) return this.me() !== null;
    const result = await firstValueFrom(
      this.api.me().pipe(
        tap((me) => this.me.set(me)),
        catchError(() => {
          this.me.set(null);
          return of(null);
        }),
      ),
    );
    this.loaded = true;
    return result !== null;
  }

  get isAuthenticated(): boolean {
    return this.me() !== null;
  }

  /** Kick off the Discord OAuth flow (full-page redirect to the API). */
  login(): void {
    window.location.href = `${environment.apiUrl}/auth/login`;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
    } finally {
      this.me.set(null);
      this.loaded = false;
      window.location.href = '/login';
    }
  }
}
