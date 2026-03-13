import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminUser } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
        <h1>Admin · Pré-cadastro de usuários</h1>
        <button (click)="logout()">Sair</button>
      </div>

      <section class="card" style="margin-bottom: 16px">
        <h2>Novo usuário do encurtador</h2>
        <form [formGroup]="form" (ngSubmit)="create()" class="row">
          <input formControlName="nome" placeholder="Nome" />
          <input formControlName="email" placeholder="Email" type="email" />
          <input formControlName="senha" placeholder="Senha" type="password" />
          <button [disabled]="form.invalid || loading">Cadastrar</button>
        </form>
      </section>

      <section class="card">
        <h2>Usuários cadastrados</h2>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.nome }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p class="error" *ngIf="error">{{ error }}</p>
    </div>
  `
})
export class AdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  users: AdminUser[] = [];
  loading = false;
  error = '';

  form = this.fb.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]]
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  create(): void {
    if (this.form.invalid) {
      return;
    }

    const { nome, email, senha } = this.form.getRawValue();
    this.loading = true;
    this.error = '';

    this.adminService.createUser(nome!, email!, senha!).subscribe({
      next: () => {
        this.form.reset();
        this.loadUsers();
      },
      error: () => {
        this.error = 'Erro ao cadastrar usuário.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.adminService.listUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: () => {
        this.error = 'Erro ao carregar usuários.';
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
