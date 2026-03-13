import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id?: string;
  _id?: string;
  nome: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
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
}
