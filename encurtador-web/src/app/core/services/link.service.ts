import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClickByDay, ComparisonMetrics, Link, LinkRevisoes, SegmentationMetrics } from '../../shared/models/link.model';

@Injectable({ providedIn: 'root' })
export class LinkService {
  private readonly http = inject(HttpClient);

  private buildMetricsParams(days: number, linkIds: string[]): HttpParams {
    let params = new HttpParams().set('days', String(days));

    if (linkIds.length === 1) {
      params = params.set('linkId', linkIds[0]);
    } else {
      for (const id of linkIds) {
        params = params.append('linkIds', id);
      }
    }

    return params;
  }

  list(): Observable<Link[]> {
    return this.http.get<Link[]>(`${environment.apiUrl}/links`);
  }

  create(slug: string, urlDestino: string): Observable<Link> {
    return this.http.post<Link>(`${environment.apiUrl}/links`, { slug, urlDestino });
  }

  updateDestino(id: string, urlDestino: string): Observable<Link> {
    return this.http.patch<Link>(`${environment.apiUrl}/links/${id}`, { urlDestino });
  }

  getLast7DaysMetrics(days = 7, linkIds: string[] = []): Observable<ClickByDay[] | ComparisonMetrics> {
    const params = this.buildMetricsParams(days, linkIds);
    return this.http.get<ClickByDay[] | ComparisonMetrics>(`${environment.apiUrl}/links/metrics/last-7-days`, { params });
  }

  getSegmentationMetrics(days = 7, linkIds: string[] = []): Observable<SegmentationMetrics> {
    const params = this.buildMetricsParams(days, linkIds);
    return this.http.get<SegmentationMetrics>(`${environment.apiUrl}/links/metrics/segmentation`, { params });
  }

  getRevisions(id: string): Observable<LinkRevisoes> {
    return this.http.get<LinkRevisoes>(`${environment.apiUrl}/links/${id}/revisoes`);
  }
}
