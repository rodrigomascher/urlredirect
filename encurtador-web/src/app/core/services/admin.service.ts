import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id?: string;
  _id?: string;
  nome: string;
  email: string;
  role?: 'admin' | 'user';
  ativo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserActionResponse {
  action: 'deleted' | 'inactivated' | 'already_inactive';
  message: string;
}

export interface AdminLink {
  _id: string;
  slug: string;
  urlDestino: string;
  revisaoAtual: number;
  dataCriacao: string;
  cliques: number;
  usuario: { _id: string; nome: string; email: string } | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  listUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${environment.apiUrl}/admin/users`);
  }

  createUser(nome: string, email: string, senha: string): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${environment.apiUrl}/admin/users`, { nome, email, senha });
  }

  deleteOrInactivateUser(id: string): Observable<AdminUserActionResponse> {
    return this.http.delete<AdminUserActionResponse>(`${environment.apiUrl}/admin/users/${id}`);
  }

  listLinks(): Observable<AdminLink[]> {
    return this.http.get<AdminLink[]>(`${environment.apiUrl}/admin/links`);
  }

  deleteLink(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${environment.apiUrl}/admin/links/${id}`);
  }
}
