import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  AdminOverviewResponse,
  AdminTimelineResponse,
  MeResponse,
  ServiceStatus,
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

  status(): Observable<ServiceStatus> {
    return this.http.get<ServiceStatus>(`${this.base}/api/status`);
  }

  globalStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/api/stats/global`);
  }

  guildStats(guildId: string): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/api/stats/guild/${guildId}`);
  }

  /** Full-page URL for a data export download (the browser handles the download). */
  exportUrl(format: 'json' | 'csv', guildId?: string): string {
    const params = new URLSearchParams({ format });
    if (guildId) params.set('guildId', guildId);
    return `${this.base}/api/export?${params.toString()}`;
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

  adminOverview(guildId: string): Observable<AdminOverviewResponse> {
    return this.http.get<AdminOverviewResponse>(`${this.base}/api/admin/guild/${guildId}/overview`);
  }

  adminTimeline(guildId: string, stat?: TimelineStat): Observable<AdminTimelineResponse> {
    let params = new HttpParams();
    if (stat) params = params.set('stat', stat);
    return this.http.get<AdminTimelineResponse>(`${this.base}/api/admin/guild/${guildId}/timeline`, {
      params,
    });
  }
}
