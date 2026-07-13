import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import {
  ActiveMembersResponse,
  AdminOverviewResponse,
  AdminTimelineResponse,
  BotAdminGuildsResponse,
  BotAdminOverviewResponse,
  BotAdminTimelineResponse,
  ConfigResponse,
  GdprDeleteResponse,
  GdprResetResponse,
  GuildRosterResponse,
  MemberLookupResponse,
  MeResponse,
  RankingResponse,
  ServerSettingsPatch,
  ServerSettingsResponse,
  ServiceStatus,
  SessionStatsResponse,
  SettingsPatch,
  SettingsResponse,
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

  config(): Observable<ConfigResponse> {
    return this.http.get<ConfigResponse>(`${this.base}/api/config`);
  }

  getSettings(): Observable<SettingsResponse> {
    return this.http.get<SettingsResponse>(`${this.base}/api/settings`);
  }

  updateSettings(patch: SettingsPatch): Observable<SettingsResponse> {
    return this.http.patch<SettingsResponse>(`${this.base}/api/settings`, patch);
  }

  globalStats(): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/api/stats/global`);
  }

  sessionStats(): Observable<SessionStatsResponse> {
    return this.http.get<SessionStatsResponse>(`${this.base}/api/stats/session`);
  }

  guildStats(guildId: string): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.base}/api/stats/guild/${guildId}`);
  }

  /** Reset the caller's aggregate stats (GDPR); scoped to one server or all. */
  resetStats(guildId?: string): Observable<GdprResetResponse> {
    return this.http.post<GdprResetResponse>(`${this.base}/api/gdpr/reset`, guildId ? { guildId } : {});
  }

  /** Erase everything held about the caller (GDPR); scoped to one server or all. */
  deleteData(guildId?: string): Observable<GdprDeleteResponse> {
    return this.http.delete<GdprDeleteResponse>(`${this.base}/api/gdpr/data`, {
      body: guildId ? { guildId } : {},
    });
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

  adminMember(guildId: string, userId: string): Observable<MemberLookupResponse> {
    return this.http.get<MemberLookupResponse>(`${this.base}/api/admin/guild/${guildId}/member/${userId}`);
  }

  guildRanking(
    guildId: string,
    stat?: TimelineStat | 'daily_streak',
    from?: number,
    to?: number,
    activeOnly?: boolean,
    sort?: 'value' | 'percent' | 'max' | 'count',
  ): Observable<RankingResponse> {
    let params = new HttpParams();
    if (stat) params = params.set('stat', stat);
    if (from !== undefined) params = params.set('from', from);
    if (to !== undefined) params = params.set('to', to);
    if (activeOnly) params = params.set('activeOnly', true);
    if (sort) params = params.set('sort', sort);
    return this.http.get<RankingResponse>(`${this.base}/api/stats/guild/${guildId}/ranking`, { params });
  }

  guildTimeline(guildId: string, stat?: TimelineStat): Observable<AdminTimelineResponse> {
    let params = new HttpParams();
    if (stat) params = params.set('stat', stat);
    return this.http.get<AdminTimelineResponse>(`${this.base}/api/stats/guild/${guildId}/timeline`, { params });
  }

  guildActiveMembers(guildId: string): Observable<ActiveMembersResponse> {
    return this.http.get<ActiveMembersResponse>(`${this.base}/api/stats/guild/${guildId}/active`);
  }

  getServerSettings(guildId: string): Observable<ServerSettingsResponse> {
    return this.http.get<ServerSettingsResponse>(`${this.base}/api/admin/guild/${guildId}/settings`);
  }

  guildRoster(guildId: string): Observable<GuildRosterResponse> {
    return this.http.get<GuildRosterResponse>(`${this.base}/api/admin/guild/${guildId}/roster`);
  }

  setMemberAdmin(guildId: string, userId: string, localAdmin: boolean): Observable<GuildRosterResponse> {
    return this.http.patch<GuildRosterResponse>(`${this.base}/api/admin/guild/${guildId}/member/${userId}/admin`, {
      localAdmin,
    });
  }

  /** Bot-operator overview (whole-database aggregates). */
  botAdminOverview(): Observable<BotAdminOverviewResponse> {
    return this.http.get<BotAdminOverviewResponse>(`${this.base}/api/bot-admin/overview`);
  }

  /** Bot-operator per-guild table. */
  botAdminGuilds(): Observable<BotAdminGuildsResponse> {
    return this.http.get<BotAdminGuildsResponse>(`${this.base}/api/bot-admin/guilds`);
  }

  /** Bot-operator global daily timeline (all guilds summed). */
  botAdminTimeline(stat?: TimelineStat): Observable<BotAdminTimelineResponse> {
    let params = new HttpParams();
    if (stat) params = params.set('stat', stat);
    return this.http.get<BotAdminTimelineResponse>(`${this.base}/api/bot-admin/timeline`, { params });
  }

  updateServerSettings(guildId: string, patch: ServerSettingsPatch): Observable<ServerSettingsResponse> {
    return this.http.patch<ServerSettingsResponse>(`${this.base}/api/admin/guild/${guildId}/settings`, patch);
  }
}
