import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClickByDay, Link, LinkRevisoes, SegmentationMetrics } from '../../shared/models/link.model';

@Injectable({ providedIn: 'root' })
export class LinkService {
  private readonly http = inject(HttpClient);

  list(): Observable<Link[]> {
    return this.http.get<Link[]>(`${environment.apiUrl}/links`);
  }

  create(slug: string, urlDestino: string): Observable<Link> {
    return this.http.post<Link>(`${environment.apiUrl}/links`, { slug, urlDestino });
  }

  updateDestino(id: string, urlDestino: string): Observable<Link> {
    return this.http.patch<Link>(`${environment.apiUrl}/links/${id}`, { urlDestino });
  }

  getLast7DaysMetrics(days = 7, linkId?: string): Observable<ClickByDay[]> {
    const params = new URLSearchParams({ days: String(days) });
    if (linkId) {
      params.set('linkId', linkId);
    }

    return this.http.get<ClickByDay[]>(`${environment.apiUrl}/links/metrics/last-7-days?${params.toString()}`);
  }

  getSegmentationMetrics(days = 7, linkId?: string): Observable<SegmentationMetrics> {
    const params = new URLSearchParams({ days: String(days) });
    if (linkId) {
      params.set('linkId', linkId);
    }

    return this.http.get<SegmentationMetrics>(`${environment.apiUrl}/links/metrics/segmentation?${params.toString()}`);
  }

  getRevisions(id: string): Observable<LinkRevisoes> {
    return this.http.get<LinkRevisoes>(`${environment.apiUrl}/links/${id}/revisoes`);
  }
}
