import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  MeResponse,
  StatsResponse,
  TimelineResponse,
  TimelineStat,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.base}/api/me`);
  }

  globalStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/api/stats/global`);
  }

  guildStats(guildId: string): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/api/stats/guild/${guildId}`);
  }

  timeline(params: {
    guildId?: string;
    stat?: TimelineStat;
    from?: number;
    to?: number;
  }): Observable<TimelineResponse> {
    let httpParams = new HttpParams();
    if (params.guildId) httpParams = httpParams.set('guildId', params.guildId);
    if (params.stat) httpParams = httpParams.set('stat', params.stat);
    if (params.from !== undefined) httpParams = httpParams.set('from', String(params.from));
    if (params.to !== undefined) httpParams = httpParams.set('to', String(params.to));
    return this.http.get<TimelineResponse>(`${this.base}/api/timeline`, { params: httpParams });
  }
}
