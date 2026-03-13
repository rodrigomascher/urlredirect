import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClickByDay, Link, SegmentationMetrics } from '../../shared/models/link.model';

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

  getLast7DaysMetrics(days = 7): Observable<ClickByDay[]> {
    return this.http.get<ClickByDay[]>(`${environment.apiUrl}/links/metrics/last-7-days?days=${days}`);
  }

  getSegmentationMetrics(days = 7): Observable<SegmentationMetrics> {
    return this.http.get<SegmentationMetrics>(`${environment.apiUrl}/links/metrics/segmentation?days=${days}`);
  }
}
